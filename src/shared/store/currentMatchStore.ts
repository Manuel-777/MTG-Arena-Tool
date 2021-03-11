import globalStore from ".";
import {
  Deck,
  Chances,
  MatchState,
  InternalPlayer,
  CardCast,
  PriorityTimers,
  MatchGameStats,
} from "mtgatool-shared";

import { DetailsIdChange, GameObject } from "../../types/greInterpreter";

import {
  Phase,
  TurnInfo,
  PlayerInfo,
  GameInfo,
  ZoneInfo,
  AnnotationInfo,
  GameObjectInfo,
  GREToClientMessage,
} from "mtgatool-shared/dist/types/greTypes";

interface Heat {
  seat: number;
  value: number;
  turn: number | undefined;
  phase: Phase;
}

export const matchStateObject = {
  matchId: "",
  eventId: "",
  onThePlay: 0,
  msgId: 0,
  playerSeat: 0,
  oppSeat: 0,
  opponent: {} as InternalPlayer,
  gameWinner: 0,
  statsHeatMap: [] as Heat[],
  totalTurns: 0,
  playerStats: {
    lifeGained: 0,
    lifeLost: 0,
    manaUsed: 0,
    damage: {} as Record<string, number>,
    lifeTotals: [] as number[],
  },
  oppStats: {
    lifeGained: 0,
    lifeLost: 0,
    manaUsed: 0,
    damage: {} as Record<string, number>,
    lifeTotals: [] as number[],
  },
  // Decks
  currentDeck: new Deck(),
  originalDeck: new Deck(),
  cardsLeft: new Deck(),
  cardsFromSideboard: [] as number[],
  cardsBottom: [] as number[],
  // Info
  player: {} as InternalPlayer,
  players: [] as PlayerInfo[],
  turnInfo: {} as TurnInfo,
  gameInfo: {} as GameInfo,
  // Time stuff
  beginTime: new Date(),
  priorityTimers: {
    last: 0,
    timers: [0, 0, 0, 0, 0] as number[],
  } as PriorityTimers,
  currentPriority: 0,
  // Zones, objects, annotations, ids tracking
  GREtoClient: [] as GREToClientMessage[],
  zones: {} as Record<number, ZoneInfo>,
  annotations: {} as Record<number, AnnotationInfo>,
  processedAnnotations: [] as number[],
  gameObjects: {} as Record<number, GameObject>,
  initialLibraryInstanceIds: [] as number[],
  instanceToCardIdMap: {} as Record<number, number>,
  idChanges: {} as Record<number, number>,
  cardsCast: [] as CardCast[],
  handsDrawn: [] as number[][],
  matchGameStats: [] as MatchGameStats[],
  cardsOdds: new Chances(),
} as MatchState;

export function setMatchId(arg: string): void {
  globalStore.currentMatch.matchId = arg;
}

export function setEventId(arg: string): void {
  globalStore.currentMatch.eventId = arg;
}

export function setPlayer(arg: Partial<InternalPlayer>): void {
  Object.assign(globalStore.currentMatch.player, arg);
}

export function setOpponent(arg: Partial<InternalPlayer>): void {
  Object.assign(globalStore.currentMatch.opponent, arg);
}

export function setPlayerCardsUsed(arg: number[]): void {
  globalStore.currentMatch.player.cardsUsed = arg;
}

export function setOppCardsUsed(arg: number[]): void {
  globalStore.currentMatch.opponent.cardsUsed = arg;
}

export function resetCurrentMatch(): void {
  // Deck selection happens before creating a new match. Need to keep the
  // already selected deck.
  const currentDeck: Deck = globalStore.currentMatch.currentDeck;
  const originalDeck: Deck = globalStore.currentMatch.originalDeck;
  globalStore.currentMatch = Object.assign({}, matchStateObject);
  globalStore.currentMatch = {
    ...globalStore.currentMatch,
    currentDeck: currentDeck,
    originalDeck: originalDeck,
    playerStats: {
      lifeLost: 0,
      lifeGained: 0,
      manaUsed: 0,
      damage: {},
      lifeTotals: [],
    },
    oppStats: {
      lifeLost: 0,
      lifeGained: 0,
      manaUsed: 0,
      damage: {},
      lifeTotals: [],
    },
    statsHeatMap: [],
    matchGameStats: [],
  };
}

export function resetCurrentGame(): void {
  Object.assign(globalStore.currentMatch, {
    msgId: 0,
    turnInfo: {},
    gameInfo: {},
    players: [],
    priorityTimers: {
      last: 0,
      timers: [0, 0, 0, 0, 0],
    },
    cardsFromSideboard: [],
    cardsBottom: [],
    currentPriority: 0,
    zones: {},
    annotations: {},
    processedAnnotations: [],
    gameObjects: {},
    initialLibraryInstanceIds: [],
    instanceToCardIdMap: {},
    idChanges: {},
    handsDrawn: [],
    cardsCast: [],
  });
}

export function setGameBeginTime(arg: Date): void {
  globalStore.currentMatch.beginTime = arg;
}

export function setOnThePlay(arg: number): void {
  globalStore.currentMatch.onThePlay = arg;
}

export function setTurnInfo(arg: Partial<TurnInfo>): void {
  Object.assign(globalStore.currentMatch.turnInfo, arg);
}

export function setCurrentMatchMany(arg: any): void {
  Object.assign(globalStore.currentMatch, arg);
}

export function setPlayers(arg: PlayerInfo[]): void {
  Object.assign(globalStore.currentMatch.players, arg);
}

export function setGameInfo(arg: Partial<GameInfo>): void {
  Object.assign(globalStore.currentMatch.gameInfo, arg);
}

//export function setZone(arg: ZoneInfo): void {
//  globalStore.currentMatch.zones[arg.zoneId || 0] = arg;
//}

export function setManyZones(arg: ZoneInfo[]): void {
  const newZones = { ...globalStore.currentMatch.zones };
  arg.forEach((zone: ZoneInfo) => {
    newZones[zone.zoneId || 0] = zone;
  });
  Object.assign(globalStore.currentMatch.zones, newZones);
}

//export function setAnnotation(arg: AnnotationInfo): void {
//  globalStore.currentMatch.annotations[arg.id || 0] = arg;
//}

export function setManyAnnotations(arg: AnnotationInfo[]): void {
  const newAnn = { ...globalStore.currentMatch.annotations };
  arg.forEach((annotation: AnnotationInfo) => {
    newAnn[annotation.id || 0] = annotation;
  });
  globalStore.currentMatch.annotations = newAnn;
}

export function removeAnnotations(arg: number[]): void {
  const newProcessed = [
    ...globalStore.currentMatch.processedAnnotations,
    ...arg,
  ];
  const newAnn = {} as Record<number, AnnotationInfo>;

  Object.keys(globalStore.currentMatch.annotations).map((k: string) => {
    const id = parseInt(k);
    if (!newProcessed.includes(id)) {
      newAnn[id] = globalStore.currentMatch.annotations[id];
    }
  });

  Object.assign(globalStore.currentMatch.annotations, newAnn);
  Object.assign(globalStore.currentMatch.processedAnnotations, newProcessed);
}

/*
export function setGameObject(arg: GameObject): void {
  if (arg.instanceId) {
    globalStore.currentMatch.gameObjects[arg.instanceId] = arg;
    if (arg.grpId) {
      globalStore.currentMatch.instanceToCardIdMap[arg.instanceId] = arg.grpId;
    }
  }
}
*/

export function setManyGameObjects(arg: GameObjectInfo[]): void {
  const newObjs = { ...globalStore.currentMatch.gameObjects } as any;
  arg.forEach((obj: GameObjectInfo) => {
    if (obj.instanceId) {
      newObjs[obj.instanceId] = obj;
      if (obj.grpId) {
        globalStore.currentMatch.instanceToCardIdMap[obj.instanceId] =
          obj.grpId;
      }
    }
  });
  Object.assign(globalStore.currentMatch.gameObjects, newObjs);
}

export function setIdChange(arg: DetailsIdChange): void {
  globalStore.currentMatch.idChanges[arg.orig_id] = arg.new_id;
}

export function addCardCast(arg: CardCast): void {
  globalStore.currentMatch.cardsCast = [
    ...globalStore.currentMatch.cardsCast,
    arg,
  ];
}

/*
export function clearCardsCast(): void {
  globalStore.currentMatch.cardsCast = [];
}
*/

export function setCardsBottom(arg: number[]): void {
  globalStore.currentMatch.cardsBottom = arg;
}

export function addCardFromSideboard(arg: number[]): void {
  globalStore.currentMatch.cardsFromSideboard = [
    ...globalStore.currentMatch.cardsFromSideboard,
    ...arg,
  ];
}

export function setInitialLibraryInstanceIds(arg: number[]): void {
  globalStore.currentMatch.initialLibraryInstanceIds = arg;
}

export function setMatchGameStats(game: number, arg: MatchGameStats): void {
  globalStore.currentMatch.matchGameStats[game] = arg;
}

export function setHandDrawn(hand: number, arg: number[]): void {
  globalStore.currentMatch.handsDrawn[hand] = arg;
}

export function setCardsOdds(arg: Chances): void {
  globalStore.currentMatch.cardsOdds = arg;
}

export function setGameWinner(arg: number): void {
  globalStore.currentMatch.gameWinner = arg;
}
