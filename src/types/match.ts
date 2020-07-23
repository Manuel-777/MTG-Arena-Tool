import { InternalDeck } from "./Deck";
import { Result } from "./greInterpreter";
import { MatchGameStats } from "./currentMatch";
import { matchStateObject } from "../shared/store/currentMatchStore";

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
  companionGRPId: number;
  cardsUsed: number[];
}

type MatchState = typeof matchStateObject;

export interface InternalMatch {
  draws: number;
  arenaId: string;
  playerDeck: InternalDeck;
  oppDeck: InternalDeck;
  tags: any;
  date: string;
  lastPushedDate?: string; // not set until match is successfully pushed
  onThePlay: number;
  eventId: string;
  bestOf: number;
  postStats: {
    statsHeatMap: MatchState["statsHeatMap"];
    totalTurns: MatchState["totalTurns"];
    playerStats: MatchState["playerStats"];
    oppStats: MatchState["oppStats"];
  };
  gameStats: MatchGameStats[];
  toolVersion: number;
  lastPushedByVersion?: number; // not set until match is successfully pushed
  toolRunFromSource: boolean;
  id: string;
  duration: number;
  player: InternalPlayer;
  opponent: InternalPlayer;
  archived?: boolean;
  playerDeckHash?: string;
  jumpstartTheme?: string;
  type: "match";
}
