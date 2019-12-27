/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/camelcase */
import { IPC_OVERLAY } from "../shared/constants.js";
import { objectClone } from "../shared/util";
import { ipc_send } from "./backgroundUtil";
import Deck from "../shared/deck";
import globals from "./globals";
import actionLog from "./actionLog";
import db from "../shared/database";
import forceDeckUpdate from "./forceDeckUpdate";
import getNameBySeat from "./getNameBySeat";
import update_deck from "./updateDeck";
import {
  GreMessage,
  AnnotationType,
  DetailsType,
  ZoneData,
  ZoneType,
  KeyValuePair,
  GameInfo,
  TurnInfo,
  GameObject,
  GameObjectTypeAbility
} from "./types/greInterpreter";

const actionType = [];
actionType[0] = "ActionType_None";
actionType[1] = "ActionType_Cast";
actionType[2] = "ActionType_Activate";
actionType[3] = "ActionType_Play";
actionType[4] = "ActionType_Activate_Mana";
actionType[5] = "ActionType_Pass";
actionType[6] = "ActionType_Activate_Test";
actionType[7] = "ActionType_Mode";
actionType[8] = "ActionType_Special_TurnFaceUp";
actionType[9] = "ActionType_ResolutionCost";
actionType[10] = "ActionType_CastLeft";
actionType[11] = "ActionType_CastRight";
actionType[12] = "ActionType_Make_Payment";
actionType[13] = "ActionType_CastingTimeOption";
actionType[14] = "ActionType_CombatCost";
actionType[15] = "ActionType_OpeningHandAction";

function changePriority(previous: number, current: number, time: Date): void {
  globals.currentMatch.priorityTimers.timers[previous] +=
    time.getTime() - globals.currentMatch.priorityTimers.last.getTime();

  globals.currentMatch.lastPriorityChangeTime = time;
  globals.currentMatch.priorityTimers.date =
    globals.currentMatch.priorityTimers.last;

  globals.currentMatch.currentPriority = current;
}

const actionLogGenerateLink = function(grpId: number): string {
  const card = db.card(grpId);
  return card
    ? '<log-card id="' + grpId + '">' + card.name + "</log-card>"
    : "";
};

const actionLogGenerateAbilityLink = function(abId: number): string {
  return `<log-ability id="${abId}">ability</log-ability>`;
};

const FACE_DOWN_CARD = 3;

function isObjectACard(card: GameObject): boolean {
  return (
    card.type == "GameObjectType_Card" ||
    card.type == "GameObjectType_SplitCard"
  );
}

class NoInstanceException {
  private message: string;
  private instanceID: number;
  private instance: GameObject;

  constructor(orig: number, instanceID: number, instance: GameObject) {
    this.message = `No instance with ID ${orig} found.`;
    this.instanceID = instanceID;
    this.instance = instance;
  }
}

function instanceIdToObject(instanceID: number): GameObject {
  const orig = instanceID;
  while (
    !globals.currentMatch.gameObjs[instanceID] &&
    globals.idChanges[instanceID]
  ) {
    instanceID = globals.idChanges[instanceID];
  }

  const instance = globals.currentMatch.gameObjs[instanceID];
  if (instance) {
    return instance;
  }
  throw new NoInstanceException(orig, instanceID, instance);
  //return false;
}

function keyValuePair(obj: KeyValuePair, addTo: DetailsType): DetailsType {
  // I found some times we get f as the value array.. *shrug*
  if (obj.f) {
    addTo[obj.key] = obj.f[0];
    return addTo;
  }
  try {
    if (obj.type == "KeyValuePairValueType_None")
      addTo[obj.key] = obj.valueNone;
    if (obj.type == "KeyValuePairValueType_uint32")
      addTo[obj.key] = obj.valueUint32;
    if (obj.type == "KeyValuePairValueType_int32")
      addTo[obj.key] = obj.valueInt32;
    if (obj.type == "KeyValuePairValueType_uint64")
      addTo[obj.key] = obj.valueUint64;
    if (obj.type == "KeyValuePairValueType_int64")
      addTo[obj.key] = obj.valueInt64;
    if (obj.type == "KeyValuePairValueType_bool")
      addTo[obj.key] = obj.valueBool;
    if (obj.type == "KeyValuePairValueType_string")
      addTo[obj.key] = obj.valueString;
    if (obj.type == "KeyValuePairValueType_float")
      addTo[obj.key] = obj.valueFloat;
    if (obj.type == "KeyValuePairValueType_double")
      addTo[obj.key] = obj.valueDouble;

    if (addTo[obj.key].length == 1) addTo[obj.key] = addTo[obj.key][0];
  } catch (e) {
    addTo[obj.key] = undefined;
  }

  return addTo;
}

const annotationFunctions: {
  [key: string]: (ann: AnnotationType, details: DetailsType) => void;
} = {};

function processAnnotations(): void {
  globals.currentMatch.annotations.forEach((ann: AnnotationType) => {
    // if this annotation has already been processed, skip
    if (globals.currentMatch.processedAnnotations.includes(ann.id)) return;

    let details: DetailsType = {};
    if (ann.details) {
      ann.details.forEach(
        (detail: KeyValuePair) => (details = keyValuePair(detail, details))
      );
    }

    try {
      ann.type.forEach((type: string) => {
        const fn = annotationFunctions[type];
        if (typeof fn == "function") {
          fn(ann, details);
        }

        //globals.currentMatch.annotations = globals.currentMatch.annotations.splice(index, 1);
        // add this annotation to the list of processed
        globals.currentMatch.processedAnnotations.push(ann.id);
      });
    } catch (e) {
      // console.log(ann, e);
    }
  });
}

function removeProcessedAnnotations(): void {
  globals.currentMatch.annotations = globals.currentMatch.annotations.filter(
    (ann: AnnotationType) =>
      !globals.currentMatch.processedAnnotations.includes(ann.id)
  );
}

annotationFunctions.AnnotationType_ObjectIdChanged = function(
  ann: AnnotationType,
  details: DetailsType
): void {
  //let newObj = cloneDeep(globals.currentMatch.gameObjs[details.orig_id]);
  //globals.currentMatch.gameObjs[details.new_id] = newObj;
  globals.idChanges[details.orig_id] = details.new_id;
};

annotationFunctions.AnnotationType_ZoneTransfer = function(
  ann: AnnotationType,
  details: DetailsType
): void {
  // A player played a land
  if (details.category == "PlayLand") {
    const grpId = instanceIdToObject(ann.affectedIds[0]).grpId;
    const playerName = getNameBySeat(ann.affectorId);
    actionLog(
      ann.affectorId,
      globals.logTime,
      `${playerName} played ${actionLogGenerateLink(grpId)}`,
      grpId
    );
  }

  // A player drew a card
  if (details.category == "Draw") {
    const zone = globals.currentMatch.zones[details.zone_src];
    const playerName = getNameBySeat(zone.ownerSeatId);
    const obj = globals.currentMatch.gameObjs[ann.affectedIds[0]];
    if (zone.ownerSeatId == globals.currentMatch.player.seat && obj) {
      const grpId = obj.grpId;
      actionLog(
        zone.ownerSeatId,
        globals.logTime,
        `${playerName} drew ${actionLogGenerateLink(grpId)}`,
        grpId
      );
    } else {
      actionLog(zone.ownerSeatId, globals.logTime, `${playerName} drew a card`);
    }
  }

  // A player casts a spell
  if (details.category == "CastSpell") {
    const obj = instanceIdToObject(ann.affectedIds[0]);
    const grpId = obj.grpId;
    const seat = obj.ownerSeatId;
    const playerName = getNameBySeat(seat);

    const cast = {
      grpId: grpId,
      turn: globals.currentMatch.turnInfo.turnNumber,
      player: seat
    };
    globals.currentMatch.cardsCast.push(cast);

    actionLog(
      seat,
      globals.logTime,
      `${playerName} cast ${actionLogGenerateLink(grpId)}`,
      grpId
    );
  }

  // A player discards a card
  if (details.category == "Discard") {
    const obj = instanceIdToObject(ann.affectedIds[0]);
    const grpId = obj.grpId;
    const seat = obj.ownerSeatId;
    const playerName = getNameBySeat(seat);
    actionLog(
      seat,
      globals.logTime,
      `${playerName} discarded ${actionLogGenerateLink(grpId)}`,
      grpId
    );
  }

  // A player puts a card in a zone
  if (details.category == "Put") {
    const zone = globals.currentMatch.zones[details.zone_dest].type;
    const obj = instanceIdToObject(ann.affectedIds[0]);
    const grpId = obj.grpId;
    const affector = instanceIdToObject(ann.affectorId);
    const seat = obj.ownerSeatId;
    let text = getNameBySeat(seat);
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (isObjectACard(affector)) {
      text = actionLogGenerateLink(affector.grpId);
    }
    actionLog(
      seat,
      globals.logTime,
      `${text} put ${actionLogGenerateLink(grpId)} in ${zone}`,
      grpId
    );
  }

  // A card is returned to a zone
  if (details.category == "Return") {
    const zone = globals.currentMatch.zones[details.zone_dest].type;
    const affected = instanceIdToObject(ann.affectedIds[0]);
    const affector = instanceIdToObject(ann.affectorId);

    let text = "";
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (isObjectACard(affector)) {
      text = actionLogGenerateLink(affector.grpId);
    }

    const seat = affected.ownerSeatId;
    actionLog(
      seat,
      globals.logTime,
      `${text} returned ${actionLogGenerateLink(affected.grpId)} to ${zone}`,
      affected.grpId
    );
  }

  // A card was exiled
  if (details.category == "Exile") {
    const affected = instanceIdToObject(ann.affectedIds[0]);
    const affector = instanceIdToObject(ann.affectorId);

    let text = "";
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (isObjectACard(affector)) {
      text = actionLogGenerateLink(affector.grpId);
    }

    const seat = affector.ownerSeatId;
    actionLog(
      seat,
      globals.logTime,
      `${text} exiled ${actionLogGenerateLink(affected.grpId)}`,
      affected.grpId
    );
  }

  // Saw this one when Lava coil exiled a creature (??)
  if (details.category == "SBA_Damage") {
    //
  }

  // A spell or ability counters something
  if (details.category == "Countered") {
    const affector = instanceIdToObject(ann.affectorId);
    const affected = instanceIdToObject(ann.affectedIds[0]);

    let text = "";
    if (affector.type == "GameObjectType_Ability") {
      text = `${actionLogGenerateLink(
        affector.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
    }
    if (isObjectACard(affector)) {
      text = actionLogGenerateLink(affector.grpId);
    }

    const seat = affector.ownerSeatId;
    actionLog(
      seat,
      globals.logTime,
      `${text} countered ${actionLogGenerateLink(affected.grpId)}`,
      affected.grpId
    );
  }

  // A spell or ability destroys something
  if (details.category == "Destroy") {
    //
  }
};

annotationFunctions.AnnotationType_AbilityInstanceCreated = function(
  ann: AnnotationType
): void {
  const affected = ann.affectedIds[0];
  const affector = instanceIdToObject(ann.affectorId);

  if (affector) {
    globals.currentMatch.gameObjs[affected] = {
      type: "GameObjectType_Ability",
      instanceId: affected,
      grpId: affector.grpId,
      zoneId: affector.zoneId,
      visibility: "Visibility_Public",
      ownerSeatId: affector.ownerSeatId,
      controllerSeatId: affector.controllerSeatId,
      objectSourceGrpId: affector.grpId,
      parentId: affector.instanceId
    } as GameObjectTypeAbility;
  }
};

annotationFunctions.AnnotationType_ResolutionStart = function(
  ann: AnnotationType,
  details: DetailsType
): void {
  const affected = instanceIdToObject(ann.affectedIds[0]);
  const grpId = details.grpid;

  if (affected.type == "GameObjectType_Ability") {
    affected.grpId = grpId;
    actionLog(
      affected.controllerSeatId,
      globals.logTime,
      `${actionLogGenerateLink(
        affected.objectSourceGrpId
      )}'s ${actionLogGenerateAbilityLink(grpId)}`,
      grpId
    );
  }
};

annotationFunctions.AnnotationType_DamageDealt = function(
  ann: AnnotationType,
  details: DetailsType
): void {
  let recipient = "";
  if (ann.affectedIds[0] < 5) {
    recipient = getNameBySeat(ann.affectedIds[0]);
  } else {
    const affected = instanceIdToObject(ann.affectedIds[0]);
    recipient = actionLogGenerateLink(affected.grpId);
  }

  const affector = instanceIdToObject(ann.affectorId);
  const dmg = details.damage;

  actionLog(
    affector.controllerSeatId,
    globals.logTime,
    `${actionLogGenerateLink(
      affector.grpId
    )} dealt ${dmg} damage to ${recipient}`,
    affector.grpId
  );
};

annotationFunctions.AnnotationType_ModifiedLife = function(
  ann: AnnotationType,
  details: DetailsType
): void {
  const affected = ann.affectedIds[0];
  const total = globals.currentMatch.players[affected].lifeTotal;
  const lifeStr = details.life > 0 ? "+" + details.life : details.life;

  actionLog(
    affected,
    globals.logTime,
    `${getNameBySeat(affected)} life changed (${lifeStr}) to ${total}`
  );
};

annotationFunctions.AnnotationType_TargetSpec = function(
  ann: AnnotationType
): void {
  let target;
  if (ann.affectedIds[0] < 5) {
    target = getNameBySeat(ann.affectedIds[0]);
  } else {
    const grpId = instanceIdToObject(ann.affectedIds[0]).grpId;
    target = actionLogGenerateLink(grpId);
  }

  const affector = instanceIdToObject(ann.affectorId);
  const seat = affector.ownerSeatId;
  let text = getNameBySeat(seat);
  if (affector.type == "GameObjectType_Ability") {
    text = `${actionLogGenerateLink(
      affector.objectSourceGrpId
    )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
  }
  if (isObjectACard(affector)) {
    text = actionLogGenerateLink(affector.grpId);
  }
  actionLog(seat, globals.logTime, `${text} targetted ${target}`);
};

annotationFunctions.AnnotationType_Scry = function(
  ann: AnnotationType,
  details: DetailsType
): void {
  // REVIEW SCRY ANNOTATION
  let affector = ann.affectorId;
  if (affector > 3) {
    affector = instanceIdToObject(affector).ownerSeatId;
  }
  const player = getNameBySeat(affector);

  const top = details.topIds;
  const bottom = details.bottomIds;

  let newTop: number[] = [];
  let newBottom: number[] = [];
  if (!Array.isArray(top)) {
    newTop = top !== undefined ? [top] : [];
  }
  if (!Array.isArray(bottom)) {
    newBottom = bottom !== undefined ? [bottom] : [];
  }
  const xtop = newTop.length;
  const xbottom = newBottom.length;
  const scrySize = xtop + xbottom;

  actionLog(
    affector,
    globals.logTime,
    `${player} scry ${scrySize}: ${xtop} top, ${xbottom} bottom`
  );
  if (affector == globals.currentMatch.player.seat) {
    if (xtop > 0) {
      newTop.forEach((instanceId: number) => {
        const grpId = instanceIdToObject(instanceId).grpId;
        actionLog(
          affector,
          globals.logTime,
          ` ${actionLogGenerateLink(grpId)} to the top`,
          grpId
        );
      });
    }
    if (xbottom > 0) {
      newBottom.forEach((instanceId: number) => {
        const grpId = instanceIdToObject(instanceId).grpId;
        actionLog(
          affector,
          globals.logTime,
          ` ${actionLogGenerateLink(grpId)} to the bottom`,
          grpId
        );
      });
    }
  }
};

annotationFunctions.AnnotationType_CardRevealed = function(
  ann: AnnotationType,
  details: DetailsType
): void {
  if (ann.ignoreForSeatIds == globals.currentMatch.player.seat) return;

  ann.affectedIds.forEach((grpId: number) => {
    const zone = globals.currentMatch.zones[details.source_zone];
    const owner = zone.ownerSeatId;

    actionLog(
      owner,
      globals.logTime,
      `revealed ${actionLogGenerateLink(grpId)} from ${zone.type}`,
      grpId
    );
  });
};

function getOppUsedCards(): number[] {
  const cardsUsed: number[] = [];
  Object.keys(globals.currentMatch.zones).forEach(key => {
    const zone = globals.currentMatch.zones[key];
    const zoneType = zone.type.trim();
    if (zone.objectInstanceIds && zoneType !== "ZoneType_Limbo") {
      zone.objectInstanceIds.forEach((id: number) => {
        let grpId;
        try {
          const obj = globals.currentMatch.gameObjs[id];
          if (
            obj.ownerSeatId == globals.currentMatch.opponent.seat &&
            isObjectACard(obj)
          ) {
            grpId = obj.grpId;
            // console.log(zone.type, db.card(grpId).name, obj);
            if (grpId !== FACE_DOWN_CARD) cardsUsed.push(grpId);
          }
        } catch (e) {
          //
        }
      });
    }
  });
  return cardsUsed;
}

function onlyUnique(value: any, index: number, self: any): boolean {
  return self.indexOf(value) === index;
}

function getCardsTypeZone(): ZoneData {
  const data: ZoneData = {};
  Object.keys(globals.currentMatch.zones).forEach(key => {
    const zone = globals.currentMatch.zones[key];
    const zoneType = zone.type;
    if (zone.objectInstanceIds) {
      zone.objectInstanceIds.forEach((id: number) => {
        try {
          const obj = globals.currentMatch.gameObjs[id] as GameObject;
          if (
            (obj.type == "GameObjectType_Card" ||
              obj.type == "GameObjectType_SplitCard") &&
            obj.grpId !== FACE_DOWN_CARD
          ) {
            const cardTypes = obj.cardTypes.filter(onlyUnique);
            cardTypes
              .filter((cardType: string) => cardTypes.includes(cardType))
              .forEach((cardType: string) => {
                const grpId = obj.grpId;
                const owner = obj.controllerSeatId;
                if (!data[owner]) data[owner] = {};
                if (!data[owner][zoneType]) data[owner][zoneType] = {};
                if (!data[owner][zoneType][cardType])
                  data[owner][zoneType][cardType] = [];

                data[owner][zoneType][cardType].push(grpId);
              });
          }
        } catch (e) {
          //
        }
      });
    }
  });

  return data;
}

function getPlayerUsedCards(): number[] {
  const cardsUsed: number[] = [];
  Object.keys(globals.currentMatch.zones).forEach(key => {
    const zone = globals.currentMatch.zones[key];
    const zoneType = zone.type.trim();
    const ignoreZones = [
      "ZoneType_Limbo",
      "ZoneType_Library",
      "ZoneType_Sideboard",
      "ZoneType_Revealed"
    ];
    if (zone.objectInstanceIds && !ignoreZones.includes(zoneType)) {
      zone.objectInstanceIds.forEach((id: number) => {
        let grpId;
        try {
          const obj = globals.currentMatch.gameObjs[id];
          if (
            obj.ownerSeatId == globals.currentMatch.player.seat &&
            isObjectACard(obj)
          ) {
            grpId = obj.grpId;
            // console.log(zone.type, db.card(grpId).name, obj);
            if (grpId !== FACE_DOWN_CARD) cardsUsed.push(grpId);
          }
        } catch (e) {
          //
        }
      });
    }
  });

  return cardsUsed;
}

const GREMessages: { [key: string]: (msg: GreMessage) => void } = {};

// Used for debug only.
export function processAll(): void {
  for (let i = 0; i < globals.currentMatch.latestMessage; i++) {
    const message = globals.currentMatch.GREtoClient[i];
    if (message) {
      const fn = GREMessages[message.type];
      if (typeof fn == "function") {
        console.log(`Process: ${message.type} (${message.msgId})`);
        fn(message);
      }
    }
  }
  globals.currentMatch.cardTypesByZone = getCardsTypeZone();
  globals.currentMatch.playerCardsUsed = getPlayerUsedCards();
  globals.currentMatch.oppCardsUsed = getOppUsedCards();
}

export function GREMessageByID(msgId: number, time: Date): void {
  const message = globals.currentMatch.GREtoClient[msgId];
  globals.logTime = time;

  const fn = GREMessages[message.type];
  if (typeof fn == "function") {
    fn(message);
  }

  globals.currentMatch.playerCardsUsed = getPlayerUsedCards();
  globals.currentMatch.cardTypesByZone = getCardsTypeZone();
  globals.currentMatch.oppCardsUsed = globals.currentMatch.opponent.cards.concat(
    getOppUsedCards()
  );
}

export function GREMessage(message: GreMessage, time: Date): void {
  //globals.currentMatch.GREtoClient[message.msgId] = message;
  globals.logTime = time;

  const fn = GREMessages[message.type];
  if (typeof fn == "function") {
    fn(message);
  }

  globals.currentMatch.cardTypesByZone = getCardsTypeZone();
  globals.currentMatch.playerCardsUsed = getPlayerUsedCards();
  globals.currentMatch.oppCardsUsed = globals.currentMatch.opponent.cards.concat(
    getOppUsedCards()
  );
}

// Some game state messages are sent as queued
GREMessages.GREMessageType_QueuedGameStateMessage = function(
  msg: GreMessage
): void {
  GREMessages.GREMessageType_GameStateMessage(msg);
};

GREMessages.GREMessageType_ConnectResp = function(msg: GreMessage): void {
  if (
    msg.connectResp.deckMessage.deckCards &&
    globals.currentMatch.player.originalDeck == null
  ) {
    const deck = new Deck({}, msg.connectResp.deckMessage.deckCards);
    globals.currentMatch.player.originalDeck = deck;
    globals.currentMatch.player.deck = deck.clone();
    globals.currentMatch.playerCardsLeft = deck.clone();
  }
};

const defaultZone = {
  zoneId: 0,
  type: "",
  visibility: "",
  ownerSeatId: 0,
  objectInstanceIds: [],
  viewers: []
};

function checkForStartingLibrary(): boolean {
  let zoneHand: ZoneType = defaultZone;
  let zoneLibrary: ZoneType = defaultZone;

  Object.keys(globals.currentMatch.zones).forEach(key => {
    const zone = globals.currentMatch.zones[key];
    if (zone.ownerSeatId == globals.currentMatch.player.seat) {
      if (zone.type == "ZoneType_Hand") {
        zoneHand = zone;
      }
      if (zone.type == "ZoneType_Library") {
        zoneLibrary = zone;
      }
    }
  });

  // Probably just escape valves?
  if (globals.currentMatch.gameStage !== "GameStage_Start") return false;
  if (zoneHand.type == "") return false;
  if (zoneLibrary.type == "") return false;

  const hand = zoneHand.objectInstanceIds || [];
  const library = zoneLibrary.objectInstanceIds || [];
  // Check that a post-mulligan scry hasn't been done
  if (library.length == 0 || library[library.length - 1] < library[0]) {
    return false;
  }

  if (
    hand.length + library.length ==
    globals.currentDeck.getMainboard().count()
  ) {
    if (hand.length >= 2 && hand[0] == hand[1] + 1) hand.reverse();
    globals.initialLibraryInstanceIds = [...hand, ...library];
  }

  return true;
}

function checkGameInfo(gameInfo: GameInfo): void {
  //console.log(`>> GameStage: ${gameInfo.stage} (${globals.currentMatch.gameStage})`);
  //actionLog(-1, globals.logTime, `>> GameStage: ${gameInfo.stage} (${globals.currentMatch.gameStage})`);
  globals.currentMatch.gameStage = gameInfo.stage;
  globals.currentMatch.game = gameInfo.gameNumber;
  if (gameInfo.matchWinCondition) {
    if (gameInfo.matchWinCondition == "MatchWinCondition_SingleElimination") {
      globals.currentMatch.bestOf = 1;
    } else if (gameInfo.matchWinCondition == "MatchWinCondition_Best2of3") {
      globals.currentMatch.bestOf = 3;
    } else {
      globals.currentMatch.bestOf = 0;
    }
  }

  if (gameInfo.results) {
    globals.currentMatch.results = objectClone(gameInfo.results);
  }
}

function checkTurnDiff(turnInfo: TurnInfo): void {
  if (
    turnInfo.turnNumber &&
    turnInfo.turnNumber == 1 &&
    turnInfo.activePlayer &&
    globals.currentMatch.game == 1
  ) {
    globals.currentMatch.onThePlay = turnInfo.activePlayer;
  }
  if (globals.currentMatch.turnInfo.turnNumber !== turnInfo.turnNumber) {
    if (
      turnInfo.priorityPlayer !== globals.currentMatch.turnInfo.currentPriority
    ) {
      changePriority(
        turnInfo.priorityPlayer,
        globals.currentMatch.turnInfo.currentPriority,
        globals.logTime
      );
    }

    actionLog(
      -1,
      globals.logTime,
      getNameBySeat(turnInfo.activePlayer) +
        "'s turn begin. (#" +
        turnInfo.turnNumber +
        ")"
    );
  }

  if (!globals.firstPass) {
    ipc_send(
      "set_turn",
      {
        playerSeat: globals.currentMatch.player.seat,
        turnPhase: turnInfo.phase,
        turnStep: turnInfo.step,
        turnNumber: turnInfo.turnNumber,
        turnActive: turnInfo.activePlayer,
        turnPriority: turnInfo.priorityPlayer,
        turnDecision: turnInfo.decisionPlayer
      },
      IPC_OVERLAY
    );
  }
}

GREMessages.GREMessageType_GameStateMessage = function(msg: GreMessage): void {
  if (
    !globals.currentMatch.msgId ||
    msg.msgId === 1 ||
    msg.msgId < globals.currentMatch.msgId
  ) {
    // New game, reset per-game fields.
    globals.currentMatch.gameStage = "GameStage_Start";
    globals.currentMatch.opponent.cards = globals.currentMatch.oppCardsUsed;
    globals.currentMatch.processedAnnotations = [];
    globals.currentMatch.timers = {};
    globals.currentMatch.zones = {};
    globals.currentMatch.players = {};
    globals.currentMatch.annotations = [];
    globals.currentMatch.gameObjs = {};
    globals.currentMatch.gameInfo;
    globals.currentMatch.turnInfo;
    globals.currentMatch.playerCardsUsed = [];
    globals.currentMatch.oppCardsUsed = [];
    globals.initialLibraryInstanceIds = [];
    globals.cardTypesByZone = [];
    globals.idChanges = {};
    globals.instanceToCardIdMap = {};
  }
  if (msg.msgId) {
    globals.currentMatch.msgId = msg.msgId;
  }

  const gameState = msg.gameStateMessage;

  if (gameState.gameInfo) {
    checkGameInfo(gameState.gameInfo);
    globals.currentMatch.gameInfo = gameState.gameInfo;
  }

  if (gameState.turnInfo) {
    checkTurnDiff(gameState.turnInfo);
    globals.currentMatch.turnInfo = gameState.turnInfo;
  }

  if (gameState.timers) {
    gameState.timers.forEach(timer => {
      globals.currentMatch.timers[timer.timerId] = timer;
    });
  }

  if (gameState.zones) {
    gameState.zones.forEach(zone => {
      globals.currentMatch.zones[zone.zoneId] = zone;
    });
  }

  if (gameState.players) {
    gameState.players.forEach(player => {
      globals.currentMatch.players[player.controllerSeatId] = player;
    });
  }

  if (gameState.gameObjects) {
    gameState.gameObjects.forEach((obj: GameObject) => {
      globals.currentMatch.gameObjs[obj.instanceId] = obj;
      globals.instanceToCardIdMap[obj.instanceId] = obj.grpId;
    });
  }

  if (gameState.annotations) {
    gameState.annotations.forEach((annotation: AnnotationType) => {
      globals.currentMatch.annotations[annotation.id] = annotation;
    });
  }

  processAnnotations();
  removeProcessedAnnotations();
  checkForStartingLibrary();

  globals.currentMatch.playerCardsLeft = globals.currentMatch.player.deck.clone();
  forceDeckUpdate();
  update_deck(false);
};

GREMessages.GREMessageType_DieRollResultsResp = function(msg): void {
  if (msg.dieRollResultsResp) {
    const highest = msg.dieRollResultsResp.playerDieRolls.reduce((a, b) => {
      if ((a.rollValue ?? 0) > (b.rollValue ?? 0)) {
        return a;
      } else {
        return b;
      }
    });
    globals.currentMatch.onThePlay = highest.systemSeatId;
  }
};
