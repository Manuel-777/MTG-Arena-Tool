import electron from "electron";
import _ from "lodash";
import { DEFAULT_TILE } from "../shared/constants";
import database from "../shared/database";
import Deck from "../shared/deck";
import playerData from "../shared/player-data";
import { objectClone } from "../shared/util";
import { MatchData, matchDataDefault } from "../types/currentMatch";
import { InternalMatch } from "../types/match";
import getOpponentDeck from "./getOpponentDeck";
import globals from "./globals";

// Generate objects using default templates.
// Nothing in here should call IPC functions

export interface MatchCreatedEvent {
  controllerFabricUri: string;
  matchEndpointHost: string;
  matchEndpointPort: number;
  opponentScreenName: string;
  opponentIsWotc: boolean;
  matchId: string;
  opponentRankingClass: string;
  opponentRankingTier: number;
  opponentMythicPercentile: number;
  opponentMythicLeaderboardPlace: number;
  eventId: string;
  opponentAvatarSelection: string;
  opponentCardBackSelection: string;
  opponentPetSelection: { name: string; variant: string };
  avatarSelection: string;
  cardbackSelection: string;
  petSelection: { name: string; variant: string };
  battlefield: string;
  opponentCommanderGrpIds: number[];
  commanderGrpIds: number[];
}

// Draft Creation

const currentDraftDefault = {
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

export function createDraft(id: string) {
  const data = {
    ..._.cloneDeep(currentDraftDefault),
    id,
    draftId: id,
    owner: playerData.name
  };
  return data;
}

// Match Creation
export function createMatch(
  json: MatchCreatedEvent,
  matchBeginTime: Date
): MatchData {
  const match = _.cloneDeep(matchDataDefault);

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
  const eventId = match.eventId || match.InternalEventName;

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
export function completeMatch(
  match: InternalMatch,
  matchData: MatchData,
  matchEndTime: number
): InternalMatch | undefined {
  if (matchData.eventId === "AIBotMatch") return;

  const mode = matchIsLimited(matchData) ? "limited" : "constructed";

  const [playerWins, opponentWins, draws] = matchResults(matchData);

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
  if (matchData.player.originalDeck) {
    match.playerDeck = matchData.player.originalDeck.getSave();
  }
  match.oppDeck = getOpponentDeck();
  match.oppDeck.commandZoneGRPIds = matchData.opponent.commanderGrpIds;

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

export function createDeck(): Deck {
  return objectClone(deckDefault);
}
