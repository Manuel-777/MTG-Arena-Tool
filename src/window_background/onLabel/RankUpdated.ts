import { playerDb } from "../../shared/db/LocalDatabase";
import globals from "../globals";
import LogEntry from "../../types/logDecoder";
import { RankUpdate, InternalRankUpdate } from "../../types/rank";
import { IPC_RENDERER } from "../../shared/constants";
import { reduxAction } from "../../shared-redux/sharedRedux";

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

  const playerData = globals.store.getState().playerdata;
  const rank = JSON.parse(JSON.stringify(playerData.rank));

  // newJson.wasLossProtected
  // newJson.seasonOrdinal
  const updateType = newJson.rankUpdateType.toLowerCase() as
    | "constructed"
    | "limited";

  rank[updateType].rank = newJson.newClass;
  rank[updateType].tier = newJson.newLevel;
  rank[updateType].step = newJson.newStep;
  rank[updateType].seasonOrdinal = newJson.seasonOrdinal;

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

  const httpApi = require("../httpApi");
  httpApi.httpSetSeasonal(newJson);

  // New rank data
  reduxAction(globals.store.dispatch, "SET_RANK", rank, IPC_RENDERER);
  playerDb.upsert("", "rank", rank);
}
