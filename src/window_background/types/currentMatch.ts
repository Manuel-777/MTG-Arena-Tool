import { Chances } from "./decks";
import Deck from "../../shared/deck";
import {
  GameInfo,
  GreMessage,
  AnnotationType,
  GameObject,
  ZoneType,
  ZoneData,
  PlayerData,
  TurnInfo,
  Timer,
  Result
} from "./greInterpreter";

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

interface CardCast {
  grpId: number;
  turn: number;
  player: number;
}

export interface PriorityTimers {
  date: Date;
  last: Date;
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
  annotations: AnnotationType[];
  processedAnnotations: number[];
  gameObjs: { [key: number]: GameObject };
  turnInfo: TurnInfo;
  priorityTimers: PriorityTimers;
  lastPriorityChangeTime: Date;
  currentPriority: number;
  cardsCast: CardCast[];
  latestMessage: number;
  msgId: number;
  GREtoClient: GreMessage[];
  cardTypesByZone: ZoneData;
  playerCardsUsed: number[];
  oppCardsUsed: number[];
  timers: { [key: number]: Timer };
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
    date: new Date(),
    last: new Date(),
    timers: []
  },
  lastPriorityChangeTime: new Date(),
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
  timers: {},
  zones: {},
  players: {},
  annotations: [],
  gameObjs: {},
  gameInfo: {
    matchID: "",
    gameNumber: 0,
    stage: "",
    type: "",
    variant: "",
    matchState: "",
    matchWinCondition: "",
    maxTimeoutCount: 0,
    maxPipCount: 0,
    timeoutDurationSec: 0,
    results: [],
    superFormat: "",
    mulliganType: "",
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
    phase: 0,
    step: 0,
    turnNumber: 0,
    priorityPlayer: 0,
    stormCount: 0,
    nextPhase: 0,
    nextStep: 0,
    currentPriority: 0
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
