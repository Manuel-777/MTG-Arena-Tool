/*
  global
    originalDeck
    matchGameStats
    getOpponentDeck
    toolVersion
*/

// Generate objects using default templates.
// Nothing in here should call IPC functions

const _ = require("lodash");
const electron = require("electron");

const { DEFAULT_TILE } = require("../shared/constants");

const { objectClone } = require("../shared/util");
const playerData = require("../shared/player-data.js");
const database = require("../shared/database");

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

var matchDataDefault = {
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
  var match = _.cloneDeep(matchDataDefault);

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

function matchResults(matchData) {
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

// Given match data calculates derived data for storage.
// This is called when a match is complete.
function completeMatch(match, matchData, matchEndTime) {
  if (matchData.eventId === "AIBotMatch") return;

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
    win: opponentWins
  };

  let mode;
  if (database.ranked_events.includes(matchData.eventId)) {
    mode = "limited";
  } else {
    mode = "constructed";
  }

  match.player = {
    name: playerData.name,
    rank: playerData.rank[mode].rank,
    tier: playerData.rank[mode].tier,
    step: playerData.rank[mode].step,
    percentile: playerData.rank[mode].percentile,
    leaderboardPlace: playerData.rank[mode].leaderboardPlace,
    userid: playerData.arenaId,
    seat: matchData.player.seat,
    win: playerWins
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

  match.gameStats = matchGameStats;

  // Convert string "2.2.19" into number for easy comparison, 1 byte per part, allowing for versions up to 255.255.255
  match.toolVersion = toolVersion;
  match.toolRunFromSource = !electron.remote.app.isPackaged;

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
  createMatch,
  completeMatch
};
