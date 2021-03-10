/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/camelcase */
import { app } from "electron";
import { ipcSend } from "./backgroundUtil";
import globals from "./globals";
import actionLog from "./actionLog";
import db from "../shared/database-wrapper";
import forceDeckUpdate from "./forceDeckUpdate";
import getNameBySeat from "./getNameBySeat";
import updateDeck from "./updateDeck";
import {
  Annotations,
  GameObject,
  //GameObjectTypeAbility,
  AggregatedDetailsType,
  DetailsSrcDestCategoryType,
  DetailsKeyType,
} from "../types/greInterpreter";

import getMatchGameStats from "./getMatchGameStats";

import globalStore from "../shared/store";
import {
  setMatchId,
  setPlayerCardsUsed,
  setOppCardsUsed,
  setCurrentMatchMany,
  setIdChange,
  addCardCast,
  removeAnnotations,
  setInitialLibraryInstanceIds,
  setOnThePlay,
  setGameInfo,
  setTurnInfo,
  setManyZones,
  setPlayers,
  setManyGameObjects,
  setManyAnnotations,
  resetCurrentGame,
  setHandDrawn,
  setGameBeginTime,
  setGameWinner,
  setCardsBottom,
  addCardFromSideboard,
} from "../shared/store/currentMatchStore";
import debugLog from "../shared/debugLog";
import { constants, objectClone, useSet, countValues } from "mtgatool-shared";
import {
  ZoneInfo,
  PlayerInfo,
  ZoneType,
  AnnotationInfo,
  GameObjectInfo,
  AnnotationType,
  KeyValuePairInfo,
  GameStateMessage,
  TurnInfo,
  GREToClientMessage,
  GREMessageType,
} from "mtgatool-shared/dist/types/greTypes";

const { IPC_OVERLAY } = constants;

function changePriority(previous: number, current: number, time: number): void {
  const priorityTimers = objectClone(globalStore.currentMatch.priorityTimers);
  priorityTimers.timers[previous] += time - priorityTimers.last;
  priorityTimers.last = time;

  setCurrentMatchMany({
    priorityTimers: priorityTimers,
    currentPriority: current,
  });
}

function setHeat(seat: number, value: number): void {
  const turnInfo = globalStore.currentMatch.turnInfo;
  const heat = {
    value,
    seat,
    turn: turnInfo.turnNumber,
    phase: turnInfo.phase || "Phase_None",
  };
  const lastN = globalStore.currentMatch.statsHeatMap.length - 1;
  const lastItem = globalStore.currentMatch.statsHeatMap[lastN];
  if (
    lastItem &&
    lastItem.seat == seat &&
    lastItem.turn == turnInfo.turnNumber &&
    lastItem.phase == turnInfo.phase
  ) {
    globalStore.currentMatch.statsHeatMap[lastN].value += value;
  } else {
    globalStore.currentMatch.statsHeatMap.push(heat);
  }
}

function getGameObject(id: number): GameObject {
  return globalStore.currentMatch.gameObjects[id];
}

function getZone(id: number): ZoneInfo {
  return globalStore.currentMatch.zones[id];
}

function getPlayer(seat: number): PlayerInfo | undefined {
  return globalStore.currentMatch.players.filter(
    (player) => player.systemSeatNumber == seat
  )[0];
}

function getZoneByType(
  type: ZoneInfo["type"],
  seat: number
): ZoneInfo | undefined {
  const currentMatch = globalStore.currentMatch;
  let ret = undefined;
  Object.values(currentMatch.zones).forEach((zone) => {
    if (zone.type == type && zone.ownerSeatId == seat) {
      ret = zone;
    }
  });
  return ret;
}

function getZoneName(type: ZoneType): string {
  return type.replace("ZoneType_", "");
}

function getAllAnnotations(): AnnotationInfo[] {
  const annotations = globalStore.currentMatch.annotations;
  return Object.values(annotations);
}

function isAnnotationProcessed(id: number): boolean {
  const anns = globalStore.currentMatch.processedAnnotations;
  return anns.includes(id);
}

const actionLogGenerateLink = function (grpId: number): string {
  const card = db.card(grpId);
  return card
    ? '<log-card id="' + grpId + '">' + card.name + "</log-card>"
    : "";
};

const actionLogGenerateAbilityLink = function (abId: number): string {
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
  //private message: string;
  private instanceID: number;
  private instance: GameObjectInfo;

  constructor(orig: number, instanceID: number, instance: GameObjectInfo) {
    this.instanceID = instanceID;
    this.instance = instance;
    if (!app.isPackaged) {
      debugLog(
        `No instance with ID ${orig} found. (${this.instanceID})`,
        "info"
      );
      debugLog(this.instance, "info");
    }
  }
}

function instanceIdToObject(instanceID: number): GameObject {
  const orig = instanceID;
  const idChanges = globalStore.currentMatch.idChanges;
  while (!getGameObject(instanceID) && idChanges[instanceID]) {
    instanceID = idChanges[instanceID];
  }

  const instance = getGameObject(instanceID);
  if (instance) {
    return instance;
  }
  throw new NoInstanceException(orig, instanceID, instance);
}

const AnnotationType_ObjectIdChanged = function (ann: Annotations): void {
  if (ann.type !== "AnnotationType_ObjectIdChanged") return;
  //let newObj = cloneDeep(getGameObject(details.orig_id));
  //getGameObject(details.new_id) = newObj;
  setIdChange(ann.details);
};

const AnnotationType_ZoneTransfer = function (ann: Annotations): void {
  if (ann.type !== "AnnotationType_ZoneTransfer") return;

  // Capture cards that travel from the sideboard
  const fromZone = getZone(ann.details.zone_src);
  if (fromZone.type == "ZoneType_Sideboard") {
    const obj = instanceIdToObject(ann.affectedIds[0]);
    if (obj.ownerSeatId == globalStore.currentMatch.playerSeat) {
      addCardFromSideboard([obj.grpId]);
    }
  }

  // A player played a land
  if (ann.details.category == "PlayLand") {
    const grpId = instanceIdToObject(ann.affectedIds[0]).grpId || 0;
    const playerName = getNameBySeat(ann.affectorId);
    setHeat(ann.affectorId, 1);
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
    const playerSeat = globalStore.currentMatch.playerSeat;
    if (zone.ownerSeatId == playerSeat && obj) {
      setHeat(zone.ownerSeatId, 1);
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
    const obj = instanceIdToObject(ann.affectedIds[0]) as GameObjectInfo;
    const grpId = obj.grpId || 0;
    const seat = obj.ownerSeatId || 0;
    const playerName = getNameBySeat(seat);
    const turnNumber = globalStore.currentMatch.turnInfo.turnNumber;

    const cast = {
      grpId: grpId,
      turn: turnNumber || 0,
      player: seat,
    };
    addCardCast(cast);
    setHeat(seat, 1);
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
      `${text} put ${actionLogGenerateLink(grpId)} in ${getZoneName(
        zone || "ZoneType_None"
      )}`,
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
      `${text} returned ${actionLogGenerateLink(
        affected.grpId
      )} to ${getZoneName(zone || "ZoneType_None")}`,
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
    setHeat(seat, 1);
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

const AnnotationType_AbilityInstanceCreated = function (
  ann: Annotations
): void {
  if (ann.type !== "AnnotationType_AbilityInstanceCreated") return;

  //const affected = ann.affectedIds[0];
  const affector = instanceIdToObject(ann.affectorId);
  setHeat(affector.controllerSeatId, 1);

  /*
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
    setGameObj(newObj);
  }
  */
};

const AnnotationType_ResolutionStart = function (ann: Annotations): void {
  if (ann.type !== "AnnotationType_ResolutionStart") return;
  const affected = instanceIdToObject(ann.affectedIds[0]);
  const grpId = ann.details.grpid;

  if (affected.type == "GameObjectType_Ability") {
    //affected.grpId = grpId;
    setHeat(affected.controllerSeatId, 1);
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

const AnnotationType_DamageDealt = function (ann: Annotations): void {
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
  setHeat(affector.controllerSeatId, dmg);
  if (affector.controllerSeatId == globalStore.currentMatch.playerSeat) {
    const pstats = globalStore.currentMatch.playerStats;
    const prev = pstats.damage[affector.grpId];
    pstats.damage[affector.grpId] = (prev | 0) + dmg;
  } else {
    const pstats = globalStore.currentMatch.oppStats;
    const prev = pstats.damage[affector.grpId];
    pstats.damage[affector.grpId] = (prev | 0) + dmg;
  }
  actionLog(
    affector.controllerSeatId,
    globals.logTime,
    `${actionLogGenerateLink(
      affector.grpId
    )} dealt ${dmg} damage to ${recipient}`,
    affector.grpId
  );
};

const AnnotationType_ModifiedLife = function (ann: Annotations): void {
  if (ann.type !== "AnnotationType_ModifiedLife") return;
  const affected = ann.affectedIds[0];
  const total = getPlayer(affected)?.lifeTotal || 0 + ann.details.life;
  const lifeStr = (ann.details.life > 0 ? "+" : "") + ann.details.life;

  const lifeAbs = Math.abs(ann.details.life);
  if (affected == globalStore.currentMatch.playerSeat) {
    if (ann.details.life > 0)
      globalStore.currentMatch.playerStats.lifeGained += lifeAbs;
    else globalStore.currentMatch.playerStats.lifeLost += lifeAbs;
    globalStore.currentMatch.playerStats.lifeTotals.push(Math.max(0, total));
  } else {
    if (ann.details.life > 0)
      globalStore.currentMatch.oppStats.lifeGained += lifeAbs;
    else globalStore.currentMatch.oppStats.lifeLost += lifeAbs;
    globalStore.currentMatch.oppStats.lifeTotals.push(Math.max(0, total));
  }

  actionLog(
    affected,
    globals.logTime,
    `${getNameBySeat(affected)} life changed (${lifeStr}) to ${total}`
  );
};

const AnnotationType_TargetSpec = function (ann: Annotations): void {
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
  setHeat(seat, 1);
  if (affector.type == "GameObjectType_Ability") {
    text = `${actionLogGenerateLink(
      affector.objectSourceGrpId
    )}'s ${actionLogGenerateAbilityLink(affector.grpId)}`;
  }
  if (isObjectACard(affector)) {
    text = actionLogGenerateLink(affector.grpId);
  }
  actionLog(seat, globals.logTime, `${text} targeted ${target}`);
};

const AnnotationType_Scry = function (ann: Annotations): void {
  if (ann.type !== "AnnotationType_Scry") return;
  // REVIEW SCRY ANNOTATION
  let affector = ann.affectorId;
  if (affector > 3) {
    affector = instanceIdToObject(affector).ownerSeatId;
  }
  const playerSeat = globalStore.currentMatch.playerSeat;
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
  setHeat(affector, scrySize);
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

const AnnotationType_CardRevealed = function (ann: Annotations): void {
  const playerSeat = globalStore.currentMatch.playerSeat;
  if (ann.type !== "AnnotationType_CardRevealed") return;
  if (!ann.ignoreForSeatIds.includes(playerSeat)) return;

  ann.affectedIds.forEach((grpId: number) => {
    const zone = getZone(ann.details.source_zone);
    const owner = zone.ownerSeatId || 0;

    actionLog(
      owner,
      globals.logTime,
      `revealed ${actionLogGenerateLink(grpId)} from ${getZoneName(
        zone.type || "ZoneType_None"
      )}`,
      grpId
    );
  });
};

const AnnotationType_ManaPaid = function (ann: Annotations): void {
  if (ann.type !== "AnnotationType_ManaPaid") return;
  const playerSeat = globalStore.currentMatch.playerSeat;

  let affector = ann.affectorId;
  if (affector > 3) {
    affector = instanceIdToObject(affector).ownerSeatId;
  }

  if (affector == playerSeat) {
    globalStore.currentMatch.playerStats.manaUsed++;
  } else {
    globalStore.currentMatch.oppStats.manaUsed++;
  }
};

const AnnotationType_LayeredEffect = function (ann: Annotations): void {
  if (ann.type !== "AnnotationType_LayeredEffect") return;
};

function annotationsSwitch(ann: Annotations, type: AnnotationType): void {
  //debugLog(type, ann);
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
    case "AnnotationType_ManaPaid":
      AnnotationType_ManaPaid(ann);
      break;
    case "AnnotationType_LayeredEffect":
      AnnotationType_LayeredEffect(ann);
      break;
    default:
      break;
  }
}

function extractNumberArrayFromKVP(obj: KeyValuePairInfo): number[] {
  switch (obj.type) {
    case "KeyValuePairValueType_uint32":
      return obj.valueUint32;
    case "KeyValuePairValueType_int32":
      return obj.valueInt32;
    case "KeyValuePairValueType_uint64":
      return obj.valueUint64;
    case "KeyValuePairValueType_int64":
      return obj.valueInt64;
    case "KeyValuePairValueType_float":
      return obj.valueFloat;
    case "KeyValuePairValueType_double":
      return obj.valueDouble;
    default:
      return [];
  }
}

function extractNumberValueFromKVP(obj: KeyValuePairInfo): number | undefined {
  const numberArray = extractNumberArrayFromKVP(obj);

  return numberArray.length === 1 ? numberArray[0] : undefined;
}

function extractStringValueFromKVP(obj: KeyValuePairInfo): string | undefined {
  return obj.valueString.length === 1 ? obj.valueString[0] : undefined;
}

/*
function extractBooleanValueFromKVP(
  obj: KeyValuePairInfo
): boolean | undefined {
  return obj.valueBool.length === 1 ? obj.valueBool[0] : undefined;
}

function extractBooleanArrayFromKVP(obj: KeyValuePairInfo): boolean[] {
  return obj.valueBool;
}

function extractStringArrayFromKVP(obj: KeyValuePairInfo): string[] {
  return obj.valueString;
}
*/

function keyValuePair(kvp: KeyValuePairInfo[]): AggregatedDetailsType {
  const aggregate: AggregatedDetailsType = {
    abilityGrpId: 0,
    abilityGRPIDs: [0],
    id: 0,
    color: 0,
    bottomIds: undefined,
    category: undefined,
    damage: 0,
    grpid: 0,
    index: 0,
    life: 0,
    new_id: 0,
    orig_id: 0,
    phase: 0,
    source_zone: 0,
    step: 0,
    topIds: undefined,
    type: 0,
    isTop: 0,
    zone_dest: 0,
    zone_src: 0,
  };

  for (const obj of kvp) {
    const key = obj.key as DetailsKeyType | undefined;
    switch (key) {
      case undefined:
        break;
      case "id":
      case "color":
      case "abilityGrpId":
      case "grpid":
      case "damage":
      case "index":
      case "life":
      case "new_id":
      case "orig_id":
      case "phase":
      case "source_zone":
      case "step":
      case "type":
      case "zone_dest":
      case "zone_src":
      case "isTop":
        aggregate[key] = extractNumberValueFromKVP(obj) ?? 0;
        break;
      case "abilityGRPIDs":
        aggregate[key] = extractNumberArrayFromKVP(obj) ?? [0];
        break;
      case "bottomIds":
      case "topIds":
        aggregate[key] = extractNumberValueFromKVP(obj);
        break;
      case "category":
        aggregate[key] = extractStringValueFromKVP(
          obj
        ) as DetailsSrcDestCategoryType;
        break;
    }
  }
  return aggregate;
}

function processAnnotations(): void {
  const removeIds = [] as number[];
  const anns = getAllAnnotations();
  anns.forEach((ann) => {
    if (ann.id && isAnnotationProcessed(ann.id)) return;

    // Details can be undefined sometimes
    const details = keyValuePair(ann.details || []);

    try {
      ann.type.forEach((type: AnnotationType) => {
        annotationsSwitch(
          { ...ann, type: type, details: details } as Annotations,
          type
        );
        // add this annotation to the list of processed
        removeIds.push(ann.id || 0);
      });
    } catch (e) {
      //debugLog(ann, e);
    }
  });
  //debugLog(anns.length, removeIds.length);
  if (removeIds.length > 0) {
    removeAnnotations(removeIds);
  }
}

function getOppUsedCards(): number[] {
  const cardsUsed: number[] = [];
  const oppSeat = globalStore.currentMatch.oppSeat;
  Object.keys(globalStore.currentMatch.zones).forEach((key) => {
    const zone = getZone(parseInt(key));
    const zoneType = (zone.type || "ZoneType_None").trim();
    if (zone.objectInstanceIds && zoneType !== "ZoneType_Limbo") {
      zone.objectInstanceIds.forEach((id: number) => {
        let grpId;
        try {
          const obj = getGameObject(id);
          if (obj.ownerSeatId == oppSeat && isObjectACard(obj)) {
            grpId = obj.grpId;
            // debugLog(zone.type, db.card(grpId).name, obj);
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
  Object.keys(globalStore.currentMatch.zones).forEach(key => {
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
  const playerSeat = globalStore.currentMatch.playerSeat;
  Object.keys(globalStore.currentMatch.zones).forEach((key) => {
    const zone = getZone(parseInt(key));
    const zoneType = (zone.type || "ZoneType_None").trim();
    const ignoreZones = [
      "ZoneType_Limbo",
      "ZoneType_Library",
      "ZoneType_Sideboard",
      "ZoneType_Revealed",
    ];
    if (zone.objectInstanceIds && !ignoreZones.includes(zoneType)) {
      zone.objectInstanceIds.forEach((id: number) => {
        let grpId: number;
        try {
          const obj = getGameObject(id);
          if (
            obj.ownerSeatId == playerSeat &&
            isObjectACard(obj) &&
            obj.grpId &&
            obj.type == "GameObjectType_Card"
          ) {
            grpId = obj.grpId;
            if (grpId !== FACE_DOWN_CARD) {
              // If this card has mutations (or inherited abilities)
              if (obj.abilityOriginalCardGrpIds && obj.abilities) {
                // For each original grpId (no duplicates)
                const origCards = useSet(obj.abilityOriginalCardGrpIds);
                //debugLog("set: ", origCards);
                origCards.forEach((setCardId) => {
                  const cardObj = db.card(setCardId);
                  //debugLog("> " + setCardId, cardObj);
                  if (cardObj) {
                    // Count the number of times this card is in the parent
                    // This assumes abilities appear just once per card, so
                    // abilities will apear as many times as this card exists
                    const count = countValues(
                      obj.abilities,
                      cardObj.abilities[0] || -1
                    );
                    // Add these to the list of cards used
                    for (let ii = 0; ii < count; ii++) {
                      cardsUsed.push(setCardId);
                    }
                  }
                });
              } else {
                // Else its jsut a card, add it
                cardsUsed.push(grpId);
              }
            }
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
  viewers: [],
};

function checkForStartingLibrary(gameState?: GameStateMessage): boolean {
  const currentMatch = globalStore.currentMatch;
  let zoneHand: ZoneInfo = defaultZone;
  let zoneLibrary: ZoneInfo = defaultZone;

  Object.keys(currentMatch.zones).forEach((key) => {
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

  if (zoneHand.type == "ZoneType_None") return false;
  if (zoneLibrary.type == "ZoneType_None") return false;
  const hand = zoneHand.objectInstanceIds || [];
  const library = zoneLibrary.objectInstanceIds || [];

  // Try to get the mulligans
  // Get from the current gameState msg
  gameState?.players?.forEach((player: PlayerInfo) => {
    if (
      player.controllerSeatId == currentMatch.playerSeat &&
      player.pendingMessageType == "ClientMessageType_MulliganResp"
    ) {
      const mull = player.mulliganCount || 0;
      // If this is the first hand drawn or we made a mulligan
      if (mull > 0 || currentMatch.handsDrawn.length == 0) {
        const drawn = hand.map((n) => getGameObject(n).grpId);
        setHandDrawn(mull, drawn);
        debugLog(`Mulligan: ${mull}, ${drawn}`);
      }
    }
  });

  if (currentMatch.gameInfo.stage !== "GameStage_Start") return false;

  // Check that a post-mulligan scry hasn't been done
  if (library.length == 0 || library[library.length - 1] < library[0]) {
    return false;
  }

  if (
    hand.length + library.length ==
    globalStore.currentMatch.currentDeck.getMainboard().count()
  ) {
    if (hand.length >= 2 && hand[0] == hand[1] + 1) hand.reverse();
    setInitialLibraryInstanceIds([...hand, ...library]);
  }

  return true;
}

function checkTurnDiff(turnInfo: TurnInfo): void {
  const currentMatch = globalStore.currentMatch;
  const currentTurnInfo = currentMatch.turnInfo;
  const currentPriority = currentMatch.currentPriority;
  if (
    turnInfo.turnNumber &&
    turnInfo.turnNumber == 1 &&
    turnInfo.activePlayer
  ) {
    setOnThePlay(turnInfo.activePlayer);
  }
  if (turnInfo.priorityPlayer !== currentPriority) {
    changePriority(
      turnInfo.priorityPlayer || 0,
      currentPriority,
      globals.logTime.getTime()
    );
  }
  if (currentTurnInfo.turnNumber !== turnInfo.turnNumber) {
    globalStore.currentMatch.totalTurns++;
    actionLog(
      -1,
      globals.logTime,
      getNameBySeat(turnInfo.activePlayer || 0) +
        "'s turn begins. (#" +
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
        turnDecision: turnInfo.decisionPlayer,
      },
      IPC_OVERLAY
    );
  }
}

const GREMessageType_GameStateMessage = (msg: GREToClientMessage): void => {
  const currentMatch = globalStore.currentMatch;
  if (
    msg.msgId &&
    (!currentMatch.msgId || msg.msgId === 1 || msg.msgId < currentMatch.msgId)
  ) {
    // New game, reset per-game fields.
    resetCurrentGame();
    setGameBeginTime(globals.logTime);
  }
  if (msg.msgId) {
    setCurrentMatchMany({ msgId: msg.msgId });
  }

  const gameState = msg.gameStateMessage;
  if (gameState) {
    //(gameState) {
    if (gameState.gameInfo) {
      setGameInfo(gameState.gameInfo);
      if (gameState.gameInfo.matchID) {
        setMatchId(
          gameState.gameInfo.matchID +
            "-" +
            globals.store.getState().playerdata.arenaId
        );
      }
      if (gameState.gameInfo.stage == "GameStage_GameOver") {
        getMatchGameStats();
      }
    }

    if (gameState.turnInfo) {
      checkTurnDiff(gameState.turnInfo);
      setTurnInfo(gameState.turnInfo);
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
      setManyZones(gameState.zones);
    }

    if (gameState.players) {
      setPlayers(gameState.players);
    }

    if (gameState.gameObjects) {
      setManyGameObjects(gameState.gameObjects);
    }

    if (gameState.annotations) {
      setManyAnnotations(gameState.annotations);
    }
  }

  processAnnotations();
  checkForStartingLibrary(gameState);

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
    setOnThePlay(highest.systemSeatId || 0);
  }
};

const GREMessageType_IntermissionReq = (msg: GREToClientMessage): void => {
  if (msg.intermissionReq?.result) {
    const result = msg.intermissionReq?.result;
    setGameWinner(result.winningTeamId || 0);
    const winnerName = getNameBySeat(result.winningTeamId || 0);
    const loserName = getNameBySeat(result.winningTeamId == 2 ? 1 : 2);

    if (result.reason == "ResultReason_Concede") {
      actionLog(-1, globals.logTime, `${loserName} conceded.`);
    } else if (result.reason == "ResultReason_Timeout") {
      actionLog(-1, globals.logTime, `${loserName} timed out.`);
    }
    actionLog(-1, globals.logTime, `${winnerName} wins!`);
  }
  getMatchGameStats();
};

function GREMessagesSwitch(
  message: GREToClientMessage,
  type: GREMessageType | undefined
): void {
  //debugLog(`Process: ${message.type} (${message.msgId})`);
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
    case "GREMessageType_IntermissionReq":
      GREMessageType_IntermissionReq(message);
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
  globalStore.currentMatch.GREtoClient[message.msgId || 0] = message;
  globals.logTime = time;

  GREMessagesSwitch(message, message.type);

  //globals.currentMatch.cardTypesByZone = getCardsTypeZone();
  setPlayerCardsUsed(getPlayerUsedCards());
  setOppCardsUsed(getOppUsedCards());

  const zoneLibrary = getZoneByType(
    "ZoneType_Library",
    globalStore.currentMatch.playerSeat
  );
  if (zoneLibrary && zoneLibrary.objectInstanceIds) {
    const iids = zoneLibrary.objectInstanceIds;
    let i = iids.length - 1;
    const onBottom = [];
    while (i > 0) {
      const instance = getGameObject(iids[i])?.grpId;
      if (instance) {
        onBottom.push(instance);
        i--;
      } else {
        i = 0;
      }
    }
    setCardsBottom(onBottom);
  }
  //globals.currentMatch.opponent.cards.concat(getOppUsedCards())
}
