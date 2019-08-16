/*
  global
    originalDeck
*/

// Generate objects using default templates.
// Nothing in here should call IPC functions

const _ = require("lodash");

const { DEFAULT_TILE } = require("../shared/constants");

const { objectClone } = require("../shared/util");
const playerData = require("../shared/player-data.js");

const { parseWotcTime, parseWotcTimeFallback } = require("./background-util");

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

function createDraft(id, entry) {
  const data = {
    ..._.cloneDeep(currentDraftDefault),
    id,
    draftId: id,
    owner: playerData.name
  };
  return data;
}

// Match Creation

var currentMatchDefault = {
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
    tier: 1
  },
  opponent: {
    seat: 2,
    deck: { mainDeck: [], sideboard: [] },
    life: 20,
    turn: 0,
    name: "",
    id: "",
    rank: "",
    tier: 1
  }
};

function createMatch(json, matchBeginTime) {
  var match = _.cloneDeep(currentMatchDefault);

  match.player.originalDeck = originalDeck;
  match.player.deck = originalDeck.clone();
  match.playerCardsLeft = originalDeck.clone();

  match.opponent.name = json.opponentScreenName;
  match.opponent.rank = json.opponentRankingClass;
  match.opponent.tier = json.opponentRankingTier;

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

// Deck Creation

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

function createDeck() {
  return objectClone(deckDefault);
}

module.exports = {
  createDeck,
  createDraft,
  createMatch
};
