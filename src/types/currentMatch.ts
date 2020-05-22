import { Chances } from "./Chances";
import Deck from "../shared/deck";
import {
  GameObject,
  ZoneType,
  ZoneData,
  PlayerData,
  Result
} from "./greInterpreter";
import {
  GREToClientMessage,
  AnnotationInfo,
  TurnInfo,
  GameInfo
} from "../proto/GreTypes";
import { InternalDeck } from "./Deck";

export interface MatchPlayer {
  seat: number;
  deck: Deck;
  cards: number[];
  originalDeck: Deck;
  commanderGrpIds: number[];
  name: string;
  life: number;
  turn: number;
  id: string;
  rank: string;
  tier: number;
  percentile: number;
  leaderboardPlace: number;
}

export interface CardCast {
  grpId: number;
  turn: number;
  player: number;
}

export interface PriorityTimers {
  last: number;
  timers: number[];
}

export interface MatchData {
  zones: { [key: string]: ZoneType };
  player: MatchPlayer;
  opponent: MatchPlayer;
  players: { [key: number]: PlayerData };
  bestOf: number;
  game: number;
  beginTime: Date;
  gameStage: string;
  playerCardsLeft: Deck;
  annotations: AnnotationInfo[];
  processedAnnotations: number[];
  gameObjs: { [key: number]: GameObject };
  turnInfo: TurnInfo;
  priorityTimers: PriorityTimers;
  currentPriority: number;
  cardsCast: CardCast[];
  latestMessage: number;
  msgId: number;
  GREtoClient: GREToClientMessage[];
  cardTypesByZone: ZoneData;
  playerCardsUsed: number[];
  oppCardsUsed: number[];
  gameInfo: GameInfo;
  results: Result[];
  onThePlay: number;
  matchId: string;
  matchTime: number;
  playerChances: Chances;
  playerCardsOdds: Chances;
  oppCards: Deck;
  eventId: string;
  InternalEventName?: string;
  oppArchetype: string;
}

export const matchDataDefault: MatchData = {
  eventId: "",
  matchId: "",
  beginTime: new Date(),
  matchTime: 0,
  currentPriority: 0,
  bestOf: 1,
  game: 0,
  priorityTimers: {
    last: 0,
    timers: []
  },
  latestMessage: 0,
  msgId: 0,
  GREtoClient: [],
  cardTypesByZone: [],
  playerCardsOdds: {
    sampleSize: 0,
    landB: 0,
    landG: 0,
    landR: 0,
    landU: 0,
    landW: 0,
    chanceArt: 0,
    chanceCre: 0,
    chanceEnc: 0,
    chanceIns: 0,
    chanceLan: 0,
    chancePla: 0,
    chanceSor: 0,
    deckSize: 0,
    cardsLeft: 0
  },
  results: [],
  playerChances: {
    sampleSize: 0,
    landB: 0,
    landG: 0,
    landR: 0,
    landU: 0,
    landW: 0,
    chanceArt: 0,
    chanceCre: 0,
    chanceEnc: 0,
    chanceIns: 0,
    chanceLan: 0,
    chancePla: 0,
    chanceSor: 0,
    deckSize: 0,
    cardsLeft: 0
  },
  playerCardsLeft: new Deck(),
  oppArchetype: "",
  oppCards: new Deck(),
  onThePlay: 0,
  processedAnnotations: [],
  zones: {},
  players: {},
  annotations: [],
  gameObjs: {},
  gameInfo: {
    matchID: "",
    gameNumber: 0,
    stage: "GameStage_None",
    type: "GameType_None",
    variant: "GameVariant_None",
    matchState: "MatchState_None",
    matchWinCondition: "MatchWinCondition_None",
    maxTimeoutCount: 0,
    maxPipCount: 0,
    timeoutDurationSec: 0,
    results: [],
    superFormat: "SuperFormat_None",
    mulliganType: "MulliganType_None",
    freeMulliganCount: 0,
    deckConstraintInfo: {
      minDeckSize: 0,
      maxDeckSize: 0,
      maxSideboardSize: 0
    }
  },
  gameStage: "",
  turnInfo: {
    activePlayer: 0,
    decisionPlayer: 0,
    phase: "Phase_None",
    step: "Step_None",
    turnNumber: 0,
    priorityPlayer: 0,
    nextPhase: "Phase_None",
    nextStep: "Step_None"
  },
  playerCardsUsed: [],
  oppCardsUsed: [],
  cardsCast: [],
  player: {
    seat: 1,
    deck: new Deck(),
    cards: [],
    originalDeck: new Deck(),
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1,
    commanderGrpIds: [],
    percentile: 0,
    leaderboardPlace: 0
  },
  opponent: {
    seat: 2,
    deck: new Deck(),
    cards: [],
    originalDeck: new Deck(),
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1,
    commanderGrpIds: [],
    percentile: 0,
    leaderboardPlace: 0
  }
};

export interface DeckChanges {
  added: number[];
  removed: number[];
}

export interface MatchGameStats {
  time: number;
  winner: number;
  win: boolean;
  shuffledOrder: number[];
  handsDrawn: number[][];
  handLands: number[];
  cardsCast: CardCast[];
  deckSize: number;
  landsInDeck: number;
  multiCardPositions: {
    [pos: string]: {
      [grpId: string]: number[];
    };
  };
  librarySize: number;
  landsInLibrary: number;
  libraryLands: number[];
  sideboardChanges: DeckChanges;
  deck: InternalDeck;
  cardsSeen: number[];
  onThePlay: number;
}
