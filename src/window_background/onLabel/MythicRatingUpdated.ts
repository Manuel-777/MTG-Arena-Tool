import db from "../../shared/database";
import { playerDb } from "../../shared/db/LocalDatabase";

import pd from "../../shared/PlayerData";
import globals from "../globals";
import { parseWotcTimeFallback, setData } from "../backgroundUtil";

import LogEntry from "../../types/logDecoder";
import { InternalRank, RankUpdate } from "../../types/rank";

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

  const seasonalRank = pd.addSeasonalRank(
    newJson,
    rank.constructed.seasonOrdinal,
    type
  );

  setData({ rank, seasonalRank });
  playerDb.upsert("", "rank", rank);
  playerDb.upsert("", "seasonal_rank", seasonalRank);
}
