import db from "../../shared/database";
import { playerDb } from "../../shared/db/LocalDatabase";

import globals from "../globals";
import { parseWotcTimeFallback } from "../backgroundUtil";

import LogEntry from "../../types/logDecoder";
import { InternalRank, RankUpdate } from "../../types/rank";
import { reduxAction } from "../../shared-redux/sharedRedux";
import { IPC_RENDERER } from "../../shared/constants";

interface Entry extends LogEntry {
  json: () => RankUpdate;
}

export default function MythicRatingUpdated(entry: Entry): void {
  const json = entry.json();
  // This is exclusive to constructed?
  // Not sure what the limited event is called.

  // Example data:
  // (-1) Incoming MythicRating.Updated {
  //   "oldMythicPercentile": 100.0,
  //   "newMythicPercentile": 100.0,
  //   "newMythicLeaderboardPlacement": 77,
  //   "context": "PostMatchResult"
  // }

  if (!json) return;
  const newJson = {
    ...json,
    date: json.timestamp,
    timestamp: parseWotcTimeFallback(json.timestamp).getTime(),
    lastMatchId: globals.currentMatch.matchId,
    eventId: globals.currentMatch.eventId
  };

  // Default constructed?
  let type = "constructed";
  // should probably be db.constructed_ranked_events
  if (db.standard_ranked_events.includes(newJson.eventId)) {
    type = "constructed";
  } else if (db.limited_ranked_events.includes(newJson.eventId)) {
    type = "limited";
  }

  const playerData = globals.store.getState().playerdata;
  const rank: InternalRank = { ...playerData.rank };

  rank.constructed.percentile = newJson.newMythicPercentile;
  rank.constructed.leaderboardPlace = newJson.newMythicLeaderboardPlacement;

  // Rank update / seasonal
  reduxAction(globals.store.dispatch, "SET_SEASONAL", newJson, IPC_RENDERER);
  const newSeasonalRank: Record<string, string[]> = {
    ...globals.store.getState().seasonal.seasonal
  };
  const season = `${newJson.rankUpdateType.toLowerCase()}_${
    newJson.seasonOrdinal
  }`;
  newSeasonalRank[season] = [...(newSeasonalRank[season] || []), newJson.id];
  playerDb.upsert("", "seasonal_rank", newSeasonalRank);

  // New rank data
  reduxAction(globals.store.dispatch, "SET_RANK", rank, IPC_RENDERER);
  playerDb.upsert("", "rank", rank);
}
