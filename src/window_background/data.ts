import _ from 'lodash';
import database from '../shared/database';
import electron from 'electron';
import getOpponentDeck from './getOpponentDeck';
import globals from './globals';
import playerData from '../shared/player-data.js';
import { DEFAULT_TILE } from '../shared/constants';
import { MatchCreatedEvent } from '../shared/types/MatchCreatedEvent';
import { objectClone } from '../shared/util';
// Generate objects using default templates.
// Nothing in here should call IPC functions



// Draft Creation

var currentDraftDefault = {
  eventId: "",
  draftId: "",
  set: "",
  owner: "",
  pickedCards: [],
  packNumber: 0,
  pickNumber: 0,
  currentPack: [],
  date: undefined
};

export function createDraft(id: string, entry: any) {
  const data = {
    ..._.cloneDeep(currentDraftDefault),
    id,
    draftId: id,
    owner: playerData.name
  };
  return data;
}

// Match Creation

export interface DeckData {
  mainDeck: [];
  sideboard: [];
}

export interface PlayerMatchData {
  seat: number,
  deck: DeckData,
  life: number,
  turn: number,
  name: string,
  id: string,
  rank: string,
  tier: number,
  originalDeck?: any,
  percentile?: number,
  leaderboardPlace?: number,
  cards?: any[],
  commanderGrpIds: any
}

export interface ExtendedPlayerMatchData {
  userid: string;
  win: number;
  step?: number;
  seat: number,
  tier: number,
  name: string,
  rank: string,
  percentile?: number,
  leaderboardPlace?: number,
  commanderGrpIds: any
}

export interface MatchData {
  eventId: string;
  matchId: string;
  InternalEventName?: string,
  beginTime: number;
  matchTime: number;
  currentPriority: number;
  bestOf: number;
  game: number;
  priorityTimers: number[];
  lastPriorityChangeTime: number;
  results: any[];
  playerChances: Object;
  playerCardsLeft: Object;
  oppArchetype: string;
  oppCards: Object;
  onThePlay: number;
  GREtoClient: Object;
  processedAnnotations: any[];
  timers: Object;
  zones: any[];
  players: Object;
  annotations: any[];
  gameObjs: Object;
  gameInfo: Object;
  gameStage: string;
  turnInfo: Object;
  playerCardsUsed: any[];
  oppCardsUsed: any[];
  cardsCast: any[];
  player: PlayerMatchData;
  opponent: PlayerMatchData;
};

export interface ExtendedMatchData {
  draws: number;
  playerDeck: any;
  oppDeck: any;
  tags: any;
  date: number;
  onThePlay: number;
  eventId: string;
  bestOf: number;
  gameStats: any[];
  toolVersion: null;
  toolRunFromSource: boolean;
  id: string;
  duration: number;
  player: ExtendedPlayerMatchData;
  opponent: ExtendedPlayerMatchData;
}

const matchDataDefault: MatchData = {
  eventId: "",
  matchId: "",
  beginTime: 0,
  matchTime: 0,
  currentPriority: 0,
  bestOf: 1,
  game: 0,
  priorityTimers: [0, 0, 0, 0, 0],
  lastPriorityChangeTime: 0,
  results: [],
  playerChances: {},
  playerCardsLeft: {},
  oppArchetype: "",
  oppCards: {},
  onThePlay: 0,
  GREtoClient: {},
  processedAnnotations: [],
  timers: {},
  zones: [],
  players: {},
  annotations: [],
  gameObjs: {},
  gameInfo: {},
  gameStage: "",
  turnInfo: {},
  playerCardsUsed: [],
  oppCardsUsed: [],
  cardsCast: [],
  player: {
    seat: 1,
    deck: { mainDeck: [], sideboard: [] },
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1,
    commanderGrpIds: null
  },
  opponent: {
    seat: 2,
    deck: { mainDeck: [], sideboard: [] },
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1,
    commanderGrpIds: null
  }
};

export function createMatch(json: MatchCreatedEvent, matchBeginTime: number): MatchData {
  var match = _.cloneDeep(matchDataDefault);

  match.player.originalDeck = globals.originalDeck;
  if (globals.originalDeck) {
    match.player.deck = globals.originalDeck.clone();
    match.playerCardsLeft = globals.originalDeck.clone();
  }

  match.player.commanderGrpIds = json.commanderGrpIds;

  match.opponent.name = json.opponentScreenName;
  match.opponent.rank = json.opponentRankingClass;
  match.opponent.tier = json.opponentRankingTier;
  match.opponent.commanderGrpIds = json.opponentCommanderGrpIds;

  match.opponent.percentile = json.opponentMythicPercentile;
  match.opponent.leaderboardPlace = json.opponentMythicLeaderboardPlace;

  match.opponent.cards = [];

  match.eventId = json.eventId;
  match.matchId = json.matchId + "-" + playerData.arenaId;
  match.gameStage = "";

  match.beginTime = matchBeginTime;

  match.lastPriorityChangeTime = matchBeginTime;

  return match;
}

function matchResults(matchData: MatchData): number[] {
  let playerWins = 0;
  let opponentWins = 0;
  let draws = 0;
  matchData.results.forEach(function(res) {
    if (res.scope == "MatchScope_Game") {
      if (res.result == "ResultType_Draw") {
        draws += 1;
      } else if (res.winningTeamId == matchData.player.seat) {
        playerWins += 1;
      }
      if (res.winningTeamId == matchData.opponent.seat) {
        opponentWins += 1;
      }
    }
  });

  return [playerWins, opponentWins, draws];
}

// Guess if an event is a limited or constructed event.
function matchIsLimited(match: MatchData): boolean {
  // old data uses InternalEventName
  var eventId = match.eventId || match.InternalEventName;

  // The order of can matter.
  if (eventId && database.limited_ranked_events.includes(eventId)) {
    return true;
  }
  if (eventId) {
    if (eventId.startsWith("QuickDraft")) {
      return true;
    }
    if (eventId.includes("Draft") || eventId.includes("Sealed")) {
      return true;
    }
    if (eventId.includes("Constructed")) {
      return false;
    }
  }
  return false;
}

// Given match data calculates derived data for storage.
// This is called when a match is complete.
export function completeMatch(match: ExtendedMatchData, matchData: MatchData, matchEndTime: number): ExtendedMatchData | undefined {
  if (matchData.eventId === "AIBotMatch") return;

  let mode = matchIsLimited(matchData) ? "limited" : "constructed";

  let [playerWins, opponentWins, draws] = matchResults(matchData);

  match.onThePlay = matchData.onThePlay;
  match.id = matchData.matchId;
  match.duration = matchData.matchTime;
  match.opponent = {
    name: matchData.opponent.name,
    rank: matchData.opponent.rank,
    tier: matchData.opponent.tier,
    percentile: matchData.opponent.percentile,
    leaderboardPlace: matchData.opponent.leaderboardPlace,
    userid: matchData.opponent.id,
    seat: matchData.opponent.seat,
    win: opponentWins,
    commanderGrpIds: matchData.opponent.commanderGrpIds
  };

  match.player = {
    name: playerData.name,
    rank: playerData.rank[mode].rank,
    tier: playerData.rank[mode].tier,
    step: playerData.rank[mode].step,
    percentile: playerData.rank[mode].percentile,
    leaderboardPlace: playerData.rank[mode].leaderboardPlace,
    userid: playerData.arenaId,
    seat: matchData.player.seat,
    win: playerWins,
    commanderGrpIds: matchData.player.commanderGrpIds
  };
  match.draws = draws;

  match.eventId = matchData.eventId;
  match.playerDeck = matchData.player.originalDeck.getSave();
  match.oppDeck = getOpponentDeck();

  if (
    (!match.tags || !match.tags.length) &&
    match.oppDeck.archetype &&
    match.oppDeck.archetype !== "-"
  ) {
    match.tags = [match.oppDeck.archetype];
  }
  if (matchEndTime) {
    match.date = matchEndTime;
  }
  match.bestOf = matchData.bestOf;

  match.gameStats = globals.matchGameStats;

  // Convert string "2.2.19" into number for easy comparison, 1 byte per part, allowing for versions up to 255.255.255
  match.toolVersion = globals.toolVersion;
  match.toolRunFromSource = !electron.remote.app.isPackaged;

  return match;
}

// Deck Creation
// This isn't typed yet because it's slightly more complicated.
const deckDefault = {
  deckTileId: DEFAULT_TILE,
  description: "",
  format: "Standard",
  colors: [],
  id: "00000000-0000-0000-0000-000000000000",
  lastUpdated: "2018-05-31T00:06:29.7456958",
  mainDeck: [],
  name: "Undefined",
  sideboard: []
};

export function createDeck() {
  return objectClone(deckDefault);
}
