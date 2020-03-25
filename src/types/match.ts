import Deck from "../shared/deck";
import { InternalDeck } from "./Deck";
import { Result } from "./greInterpreter";

interface ReservedPlayer {
  userId: string;
  playerName: string;
  systemSeatId: number;
  teamId: number;
  connectionInfo: {
    connectionState: string;
  };
  courseId: string;
}

interface RoomPlayer {
  userId: string;
  systemSeatId: number;
}

export interface MatchGameRoomStateChange {
  transactionId: string;
  timestamp: string;
  players: RoomPlayer[];
  matchGameRoomStateChangedEvent: {
    gameRoomInfo: MatchGameRoom;
  };
}

type MatchGameRoom =
  | MatchGameRoomStateTypePlaying
  | MatchGameRoomStateTypeMatchCompleted;

interface GameRoomInfo {
  stateType: string;
}

interface MatchGameRoomStateTypePlaying extends GameRoomInfo {
  stateType: "MatchGameRoomStateType_Playing";
  gameRoomConfig: {
    eventId: string;
    reservedPlayers: ReservedPlayer[];
    matchId: string;
    matchConfig: {};
    greConfig: {
      gameStateRedactorConfiguration: {
        enableRedaction: boolean;
        enableForceDiff: boolean;
      };
      clipsConfiguration: {};
      checkpointConfiguration: {};
    };
    greHostLoggerLevel: string;
    joinRoomTimeoutSecs: number;
    playerDisconnectTimeoutSecs: number;
  };
}

interface MatchGameRoomStateTypeMatchCompleted extends GameRoomInfo {
  stateType: "MatchGameRoomStateType_MatchCompleted";
  gameRoomConfig: {
    eventId: string;
    matchId: string;
  };
  finalMatchResult: {
    matchId: string;
    matchCompletedReason: string;
    resultList: Result[];
  };
}

export interface PlayerMatchData {
  seat: number;
  deck: Deck;
  life: number;
  turn: number;
  name: string;
  id: string;
  rank: string;
  tier: number;
  originalDeck?: Deck;
  percentile?: number;
  leaderboardPlace?: number;
  cards?: any[];
  commanderGrpIds: number[];
}

export interface InternalPlayer {
  userid: string;
  win: number;
  step?: number;
  seat: number;
  tier: number;
  name: string;
  rank: string;
  percentile?: number;
  leaderboardPlace?: number;
  commanderGrpIds: any;
}

export interface InternalMatch {
  draws: number;
  playerDeck: InternalDeck;
  oppDeck: InternalDeck;
  tags: any;
  date: number;
  onThePlay: number;
  eventId: string;
  bestOf: number;
  gameStats: any[];
  toolVersion: number;
  toolRunFromSource: boolean;
  id: string;
  duration: number;
  player: InternalPlayer;
  opponent: InternalPlayer;
  archived?: boolean;
  set: string;
  type: "match";
}
