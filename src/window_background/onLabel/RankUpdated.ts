import { playerDb } from "../../shared/db/LocalDatabase";
import playerData from "../../shared/player-data";
import globals from "../globals";
import { setData } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
import { RankUpdate, InternalRankUpdate } from "../../types/rank";

interface Entry extends LogEntry {
  json: () => RankUpdate;
}

export default function RankUpdated(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  const newJson: InternalRankUpdate = {
    ...json,
    id: entry.hash,
    date: globals.logTime.toISOString(),
    timestamp: globals.logTime.getTime(),
    lastMatchId: globals.currentMatch.matchId,
    eventId: globals.currentMatch.eventId
  };

  const rank = { ...playerData.rank };

  // newJson.wasLossProtected
  // newJson.seasonOrdinal
  const updateType = newJson.rankUpdateType.toLowerCase();

  rank[updateType].rank = newJson.newClass;
  rank[updateType].tier = newJson.newLevel;
  rank[updateType].step = newJson.newStep;
  rank[updateType].seasonOrdinal = newJson.seasonOrdinal;

  const seasonal_rank = playerData.addSeasonalRank(
    newJson,
    newJson.seasonOrdinal,
    updateType
  );

  const httpApi = require("../httpApi");
  httpApi.httpSetSeasonal(newJson);

  setData({ rank, seasonal_rank });
  playerDb.upsert("", "rank", rank);
  playerDb.upsert("", "seasonal_rank", seasonal_rank);
}