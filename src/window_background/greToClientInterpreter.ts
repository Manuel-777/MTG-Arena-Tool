/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/camelcase */
import { IPC_OVERLAY, IPC_NONE } from "../shared/constants";
import { ipcSend } from "./backgroundUtil";
import globals from "./globals";
import actionLog from "./actionLog";
import db from "../shared/database";
import forceDeckUpdate from "./forceDeckUpdate";
import getNameBySeat from "./getNameBySeat";
import updateDeck from "./updateDeck";
import {
  Annotations,
  GameObject,
  //GameObjectTypeAbility,
  DetailsType
} from "../types/greInterpreter";

import {
  KeyValuePairInfo,
  GREToClientMessage,
  AnnotationInfo,
  GameObjectInfo,
  TurnInfo,
  ZoneInfo,
  GREMessageType,
  AnnotationType
} from "../proto/GreTypes";

import getMatchGameStats from "./getMatchGameStats";
import { reduxAction } from "../shared-redux/sharedRedux";
import { objectClone } from "../shared/util";
const dispatch = globals.store.dispatch;

function changePriority(previous: number, current: number, time: number): void {
  const priorityTimers = objectClone(
    globals.store.getState().currentmatch.priorityTimers
  );
  priorityTimers.timers[previous] += time - priorityTimers.last;
  priorityTimers.last = time;

  reduxAction(
    dispatch,
    "SET_CURRENT_MATCH_MANY",
    {
      priorityTimers: priorityTimers,
      currentPriority: current
    },
    IPC_NONE
  );
}

function getGameObject(id: number): GameObject {
  return globals.store.getState().currentmatch.gameObjects[id];
}

function getZone(id: number): ZoneInfo {
  return globals.store.getState().currentmatch.zones[id];
}

function getAllAnnotations(): AnnotationInfo[] {
  const annotations = globals.store.getState().currentmatch.annotations;
  return Object.values(annotations);
}

function isAnnotationProcessed(id: number): boolean {
  const anns = globals.store.getState().currentmatch.processedAnnotations;
  return anns.includes(id);
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
  private instance: GameObjectInfo;

  constructor(orig: number, instanceID: number, instance: GameObjectInfo) {
    this.message = `No instance with ID ${orig} found.`;
    this.instanceID = instanceID;
    this.instance = instance;
  }
}

function instanceIdToObject(instanceID: number): GameObject {
  const orig = instanceID;
  const idChanges = globals.store.getState().currentmatch.idChanges;
  while (!getGameObject(instanceID) && idChanges[instanceID]) {
    instanceID = idChanges[instanceID];
  }

  const instance = getGameObject(instanceID);
  if (instance) {
    return instance;
  }
  throw new NoInstanceException(orig, instanceID, instance);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function keyValuePair(obj: KeyValuePairInfo, addTo: any): DetailsType {
  // the f value is not in the GreTypes..
  if (obj.key) {
    try {
      switch (obj.type) {
        case "KeyValuePairValueType_uint32":
          addTo[obj.key] = obj.valueUint32;
          break;
        case "KeyValuePairValueType_int32":
          addTo[obj.key] = obj.valueInt32;
          break;
        case "KeyValuePairValueType_uint64":
          addTo[obj.key] = obj.valueUint64;
          break;
        case "KeyValuePairValueType_int64":
          addTo[obj.key] = obj.valueInt64;
          break;
        case "KeyValuePairValueType_bool":
          addTo[obj.key] = obj.valueBool;
          break;
        case "KeyValuePairValueType_string":
          addTo[obj.key] = obj.valueString;
          break;
        case "KeyValuePairValueType_float":
          addTo[obj.key] = obj.valueFloat;
          break;
        case "KeyValuePairValueType_double":
          addTo[obj.key] = obj.valueDouble;
          break;
        default:
          break;
      }
      if (addTo[obj.key].length == 1) addTo[obj.key] = addTo[obj.key][0];
    } catch (e) {
      addTo[obj.key] = undefined;
    }
  }

  return addTo;
}

const AnnotationType_ObjectIdChanged = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_ObjectIdChanged") return;
  //let newObj = cloneDeep(getGameObject(details.orig_id));
  //getGameObject(details.new_id) = newObj;
  reduxAction(dispatch, "SET_IDCHANGE", ann.details, IPC_NONE);
};

const AnnotationType_ZoneTransfer = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_ZoneTransfer") return;

  // A player played a land
  if (ann.details.category == "PlayLand") {
    const grpId = instanceIdToObject(ann.affectedIds[0]).grpId || 0;
    const playerName = getNameBySeat(ann.affectorId);
    actionLog(
      ann.affectorId,
      globals.logTime,
      `${playerName} played ${actionLogGenerateLink(grpId)}`,
      grpId
    );
  }

  // A player drew a card
  if (ann.details.category == "Draw") {
    const zone = getZone(ann.details.zone_src);
    const playerName = getNameBySeat(zone.ownerSeatId || 0);
    const obj = getGameObject(ann.affectedIds[0]);
    const playerSeat = globals.store.getState().currentmatch.playerSeat;
    if (zone.ownerSeatId == playerSeat && obj) {
      const grpId = obj.grpId || 0;
      actionLog(
        zone.ownerSeatId || 0,
        globals.logTime,
        `${playerName} drew ${actionLogGenerateLink(grpId)}`,
        grpId
      );
    } else {
      actionLog(
        zone.ownerSeatId || 0,
        globals.logTime,
        `${playerName} drew a card`
      );
    }
  }

  // A player casts a spell
  if (ann.details.category == "CastSpell") {
    const obj = instanceIdToObject(ann.affectedIds[0]);
    const grpId = obj.grpId || 0;
    const seat = obj.ownerSeatId || 0;
    const playerName = getNameBySeat(seat);
    const turnNumber = globals.store.getState().currentmatch.turnInfo
      .turnNumber;

    const cast = {
      grpId: grpId,
      turn: turnNumber,
      player: seat
    };
    reduxAction(dispatch, "ADD_CARD_CAST", cast, IPC_NONE);

    actionLog(
      seat,
      globals.logTime,
      `${playerName} cast ${actionLogGenerateLink(grpId)}`,
      grpId
    );
  }

  // A player discards a card
  if (ann.details.category == "Discard") {
    const obj = instanceIdToObject(ann.affectedIds[0]);
    const grpId = obj.grpId || 0;
    const seat = obj.ownerSeatId || 0;
    const playerName = getNameBySeat(seat);
    actionLog(
      seat,
      globals.logTime,
      `${playerName} discarded ${actionLogGenerateLink(grpId)}`,
      grpId
    );
  }

  // A player puts a card in a zone
  if (ann.details.category == "Put") {
    const zone = getZone(ann.details.zone_dest).type;
    const obj = instanceIdToObject(ann.affectedIds[0]);
    const grpId = obj.grpId;
    const affector = instanceIdToObject(ann.affectorId);
    const seat = obj.ownerSeatId || 0;
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
  if (ann.details.category == "Return") {
    const zone = getZone(ann.details.zone_dest).type;
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
  if (ann.details.category == "Exile") {
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
  if (ann.details.category == "SBA_Damage") {
    //
  }

  // A spell or ability counters something
  if (ann.details.category == "Countered") {
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
  if (ann.details.category == "Destroy") {
    //
  }
};

const AnnotationType_AbilityInstanceCreated = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_AbilityInstanceCreated") return;
  /*
  const affected = ann.affectedIds[0];
  const affector = instanceIdToObject(ann.affectorId);

  if (affector) {
    //currentMatch.gameObjs[affected]
    const newObj = {
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
    reduxAction(dispatch, "SET_GAMEOBJ", newObj, IPC_NONE);
  }
  */
};

const AnnotationType_ResolutionStart = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_ResolutionStart") return;
  const affected = instanceIdToObject(ann.affectedIds[0]);
  const grpId = ann.details.grpid;

  if (affected.type == "GameObjectType_Ability") {
    //affected.grpId = grpId;
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

const AnnotationType_DamageDealt = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_DamageDealt") return;
  let recipient = "";
  if (ann.affectedIds[0] < 5) {
    recipient = getNameBySeat(ann.affectedIds[0]);
  } else {
    const affected = instanceIdToObject(ann.affectedIds[0]);
    recipient = actionLogGenerateLink(affected.grpId);
  }

  const affector = instanceIdToObject(ann.affectorId);
  const dmg = ann.details.damage;

  actionLog(
    affector.controllerSeatId,
    globals.logTime,
    `${actionLogGenerateLink(
      affector.grpId
    )} dealt ${dmg} damage to ${recipient}`,
    affector.grpId
  );
};

const AnnotationType_ModifiedLife = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_ModifiedLife") return;
  const players = globals.store.getState().currentmatch.players;
  const affected = ann.affectedIds[0];
  const total = players[affected].lifeTotal;
  const lifeStr =
    ann.details.life > 0 ? "+" + ann.details.life : ann.details.life;

  actionLog(
    affected,
    globals.logTime,
    `${getNameBySeat(affected)} life changed (${lifeStr}) to ${total}`
  );
};

const AnnotationType_TargetSpec = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_TargetSpec") return;
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

const AnnotationType_Scry = function(ann: Annotations): void {
  if (ann.type !== "AnnotationType_Scry") return;
  // REVIEW SCRY ANNOTATION
  let affector = ann.affectorId;
  if (affector > 3) {
    affector = instanceIdToObject(affector).ownerSeatId;
  }
  const playerSeat = globals.store.getState().currentmatch.playerSeat;
  const player = getNameBySeat(affector);

  const top = ann.details.topIds;
  const bottom = ann.details.bottomIds;

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

  if (affector == playerSeat) {
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

const AnnotationType_CardRevealed = function(ann: Annotations): void {
  const playerSeat = globals.store.getState().currentmatch.playerSeat;
  if (ann.type !== "AnnotationType_CardRevealed") return;
  if (!ann.ignoreForSeatIds.includes(playerSeat)) return;

  ann.affectedIds.forEach((grpId: number) => {
    const zone = getZone(ann.details.source_zone);
    const owner = zone.ownerSeatId || 0;

    actionLog(
      owner,
      globals.logTime,
      `revealed ${actionLogGenerateLink(grpId)} from ${zone.type}`,
      grpId
    );
  });
};

function annotationsSwitch(ann: Annotations, type: AnnotationType): void {
  //console.log(type, ann);
  switch (type) {
    case "AnnotationType_ObjectIdChanged":
      AnnotationType_ObjectIdChanged(ann);
      break;
    case "AnnotationType_ZoneTransfer":
      AnnotationType_ZoneTransfer(ann);
      break;
    case "AnnotationType_AbilityInstanceCreated":
      AnnotationType_AbilityInstanceCreated(ann);
      break;
    case "AnnotationType_ResolutionStart":
      AnnotationType_ResolutionStart(ann);
      break;
    case "AnnotationType_DamageDealt":
      AnnotationType_DamageDealt(ann);
      break;
    case "AnnotationType_ModifiedLife":
      AnnotationType_ModifiedLife(ann);
      break;
    case "AnnotationType_TargetSpec":
      AnnotationType_TargetSpec(ann);
      break;
    case "AnnotationType_Scry":
      AnnotationType_Scry(ann);
      break;
    case "AnnotationType_CardRevealed":
      AnnotationType_CardRevealed(ann);
      break;
    default:
      break;
  }
}

function processAnnotations(): void {
  const removeIds = [] as number[];
  const anns = getAllAnnotations();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anns.forEach((ann: any) => {
    if (isAnnotationProcessed(ann.id || 0)) return;

    let details: Partial<DetailsType> = {};
    if (ann.details) {
      ann.details.forEach(
        (detail: KeyValuePairInfo) => (details = keyValuePair(detail, details))
      );
    }

    try {
      ann.type.forEach((type: AnnotationType) => {
        annotationsSwitch(
          { ...ann, type: type, details: details } as Annotations,
          type
        );
        // add this annotation to the list of processed
        removeIds.push(ann.id);
      });
    } catch (e) {
      //console.log(ann, e);
    }
  });
  //console.log(anns.length, removeIds.length);
  if (removeIds.length > 0) {
    reduxAction(dispatch, "REMOVE_ANNOTATIONS", removeIds, IPC_NONE);
  }
}

function getOppUsedCards(): number[] {
  const cardsUsed: number[] = [];
  const oppSeat = globals.store.getState().currentmatch.oppSeat;
  Object.keys(globals.store.getState().currentmatch.zones).forEach(key => {
    const zone = getZone(parseInt(key));
    const zoneType = (zone.type || "ZoneType_None").trim();
    if (zone.objectInstanceIds && zoneType !== "ZoneType_Limbo") {
      zone.objectInstanceIds.forEach((id: number) => {
        let grpId;
        try {
          const obj = getGameObject(id);
          if (obj.ownerSeatId == oppSeat && isObjectACard(obj)) {
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

/*
function onlyUnique(value: string, index: number, self: string[]): boolean {
  return self.indexOf(value) === index;
}

function getCardsTypeZone(): ZoneData {
  const data: ZoneData = {};
  Object.keys(globals.store.getSate().currentmatch.zones).forEach(key => {
    const zone = getZone(key);
    const zoneType = zone.type;
    if (zone.objectInstanceIds) {
      zone.objectInstanceIds.forEach((id: number) => {
        try {
          const obj = getGameObject(id);
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
*/

function getPlayerUsedCards(): number[] {
  const cardsUsed: number[] = [];
  const playerSeat = globals.store.getState().currentmatch.playerSeat;
  Object.keys(globals.store.getState().currentmatch.zones).forEach(key => {
    const zone = getZone(parseInt(key));
    const zoneType = (zone.type || "ZoneType_None").trim();
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
          const obj = getGameObject(id);
          if (
            obj.ownerSeatId == playerSeat &&
            isObjectACard(obj) &&
            obj.grpId
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
/*
const GREMessageType_ConnectResp = (msg: GREToClientMessage): void => {
  if (
    msg.connectResp?.deckMessage?.deckCards &&
    globals.currentMatch.player.originalDeck == null
  ) {
    const deck = new Deck(undefined, msg.connectResp.deckMessage.deckCards);
    globals.currentMatch.player.originalDeck = deck;
    globals.currentMatch.player.deck = deck.clone();
    globals.currentMatch.playerCardsLeft = deck.clone();
  }
};
*/
const defaultZone: ZoneInfo = {
  zoneId: 0,
  type: "ZoneType_None",
  visibility: "Visibility_None",
  ownerSeatId: 0,
  objectInstanceIds: [],
  viewers: []
};

function checkForStartingLibrary(): boolean {
  const currentMatch = globals.store.getState().currentmatch;
  let zoneHand: ZoneInfo = defaultZone;
  let zoneLibrary: ZoneInfo = defaultZone;

  Object.keys(currentMatch.zones).forEach(key => {
    const zone = getZone(parseInt(key));
    if (zone.ownerSeatId == currentMatch.playerSeat) {
      if (zone.type == "ZoneType_Hand") {
        zoneHand = zone;
      }
      if (zone.type == "ZoneType_Library") {
        zoneLibrary = zone;
      }
    }
  });

  // Probably just escape valves?
  if (currentMatch.gameInfo.stage !== "GameStage_Start") return false;
  if (zoneHand.type == "ZoneType_None") return false;
  if (zoneLibrary.type == "ZoneType_None") return false;

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
    reduxAction(
      dispatch,
      "SET_INIT_LIBRARY_IDS",
      [...hand, ...library],
      IPC_NONE
    );
  }

  return true;
}

function checkTurnDiff(turnInfo: TurnInfo): void {
  const currentMatch = globals.store.getState().currentmatch;
  const gameNumber = currentMatch.gameInfo.gameNumber || 0;
  const currentTurnInfo = currentMatch.turnInfo;
  const currentPriority = currentMatch.currentPriority;
  if (
    turnInfo.turnNumber &&
    turnInfo.turnNumber == 1 &&
    turnInfo.activePlayer &&
    gameNumber == 1
  ) {
    reduxAction(dispatch, "SET_ONTHEPLAY", turnInfo.activePlayer, IPC_NONE);
  }
  if (turnInfo.priorityPlayer !== currentPriority) {
    changePriority(
      turnInfo.priorityPlayer || 0,
      currentPriority,
      globals.logTime.getTime()
    );
  }
  if (currentTurnInfo.turnNumber !== turnInfo.turnNumber) {
    actionLog(
      -1,
      globals.logTime,
      getNameBySeat(turnInfo.activePlayer || 0) +
        "'s turn begin. (#" +
        turnInfo.turnNumber +
        ")"
    );
  }

  if (!globals.firstPass) {
    ipcSend(
      "set_turn",
      {
        playerSeat: currentMatch.playerSeat,
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

const GREMessageType_GameStateMessage = (msg: GREToClientMessage): void => {
  const currentMatch = globals.store.getState().currentmatch;
  if (
    msg.msgId &&
    (!currentMatch.msgId || msg.msgId === 1 || msg.msgId < currentMatch.msgId)
  ) {
    // New game, reset per-game fields.
    //reduxAction(dispatch, "RESET_CURRENT_GAME", true, IPC_NONE);
  }
  if (msg.msgId) {
    reduxAction(
      dispatch,
      "SET_CURRENT_MATCH_MANY",
      { msgId: msg.msgId },
      IPC_NONE
    );
  }

  const gameState = msg.gameStateMessage;
  if (gameState) {
    //(gameState) {
    if (gameState.gameInfo) {
      reduxAction(dispatch, "SET_GAMEINFO", gameState.gameInfo, IPC_NONE);
      if (gameState.gameInfo.matchID) {
        reduxAction(
          dispatch,
          "SET_MATCHID",
          gameState.gameInfo.matchID +
            "-" +
            globals.store.getState().playerdata.arenaId,
          IPC_NONE
        );
      }
      if (gameState.gameInfo.stage == "GameStage_GameOver") {
        getMatchGameStats();
      }
    }

    if (gameState.turnInfo) {
      checkTurnDiff(gameState.turnInfo);
      reduxAction(dispatch, "SET_TURNINFO", gameState.turnInfo, IPC_NONE);
    }
    /*
    // Not used yet
    // Im not sure how but we should be able to see player
    // timeouts and stuff like that using this.
    if (gameState.timers) {
      gameState.timers.forEach(timer => {
        globals.currentMatch.timers[timer.timerId] = timer;
      });
    }
    */
    if (gameState.zones) {
      reduxAction(dispatch, "SET_MANY_ZONES", gameState.zones, IPC_NONE);
    }

    if (gameState.players) {
      reduxAction(dispatch, "SET_PLAYERS", gameState.players, IPC_NONE);
    }

    if (gameState.gameObjects) {
      reduxAction(
        dispatch,
        "SET_MANY_GAMEOBJ",
        gameState.gameObjects,
        IPC_NONE
      );
    }

    if (gameState.annotations) {
      reduxAction(
        dispatch,
        "SET_MANY_ANNOTATIONS",
        gameState.annotations,
        IPC_NONE
      );
    }
  }

  processAnnotations();
  checkForStartingLibrary();

  forceDeckUpdate();
  updateDeck(false);
};

// Some game state messages are sent as queued
const GREMessageType_QueuedGameStateMessage = (
  msg: GREToClientMessage
): void => {
  GREMessageType_GameStateMessage(msg);
};

const GREMessageType_DieRollResultsResp = (msg: GREToClientMessage): void => {
  if (msg.dieRollResultsResp) {
    const highest = msg.dieRollResultsResp.playerDieRolls.reduce((a, b) => {
      if ((a.rollValue ?? 0) > (b.rollValue ?? 0)) {
        return a;
      } else {
        return b;
      }
    });
    reduxAction(dispatch, "SET_ONTHEPLAY", highest.systemSeatId, IPC_NONE);
  }
};

function GREMessagesSwitch(
  message: GREToClientMessage,
  type: GREMessageType | undefined
): void {
  //console.log(`Process: ${message.type} (${message.msgId})`);
  switch (type) {
    case "GREMessageType_QueuedGameStateMessage":
      GREMessageType_QueuedGameStateMessage(message);
      break;
    //case "GREMessageType_ConnectResp":
    //  GREMessageType_ConnectResp(message);
    //  break;
    case "GREMessageType_GameStateMessage":
      GREMessageType_GameStateMessage(message);
      break;
    case "GREMessageType_DieRollResultsResp":
      GREMessageType_DieRollResultsResp(message);
      break;
  }
}

// Used for debug only.
/*
export function processAll(): void {
  for (let i = 0; i < globals.currentMatch.latestMessage; i++) {
    const message = globals.currentMatch.GREtoClient[i];
    if (message) {
      GREMessagesSwitch(message, message.type);
    }
  }
  //globals.currentMatch.cardTypesByZone = getCardsTypeZone();
  globals.currentMatch.playerCardsUsed = getPlayerUsedCards();
  globals.currentMatch.oppCardsUsed = getOppUsedCards();
}

export function GREMessageByID(msgId: number, time: Date): void {
  const message = globals.currentMatch.GREtoClient[msgId];
  globals.logTime = time;

  GREMessagesSwitch(message, message.type);

  globals.currentMatch.playerCardsUsed = getPlayerUsedCards();
  //globals.currentMatch.cardTypesByZone = getCardsTypeZone();
  globals.currentMatch.oppCardsUsed = globals.currentMatch.opponent.cards.concat(
    getOppUsedCards()
  );
}
*/

export function GREMessage(message: GREToClientMessage, time: Date): void {
  //globals.currentMatch.GREtoClient[message.msgId || 0] = message;
  globals.logTime = time;

  GREMessagesSwitch(message, message.type);

  //globals.currentMatch.cardTypesByZone = getCardsTypeZone();
  reduxAction(
    dispatch,
    "SET_PLAYER_CARDS_USED",
    getPlayerUsedCards(),
    IPC_NONE
  );
  reduxAction(dispatch, "SET_OPP_CARDS_USED", getOppUsedCards(), IPC_NONE);
  //globals.currentMatch.opponent.cards.concat(getOppUsedCards())
}
