import { playerDb } from "../../shared/db/LocalDatabase";
import globals from "../globals";
import LogEntry from "../../types/logDecoder";
import { RankUpdate } from "../../types/rank";
import { SeasonalRankData } from "../../types/Season";
import { IPC_RENDERER } from "../../shared/constants";
import { reduxAction } from "../../shared-redux/sharedRedux";
import globalStore, { seasonalList } from "../../shared-store";

interface Entry extends LogEntry {
  json: () => RankUpdate;
}

export default function RankUpdated(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  if (json.newClass == "Mythic" && json.oldClass == "Mythic") return;

  const playerData = globals.store.getState().playerdata;
  const owner = globals.store.getState().appsettings.email;
  const rank = JSON.parse(JSON.stringify(playerData.rank));

  const newJson: SeasonalRankData = {
    ...json,
    owner,
    player: playerData.playerName,
    id: entry.hash,
    //date: globals.logTime.toISOString(),
    timestamp: globals.logTime.getTime(),
    lastMatchId: globalStore.currentMatch.matchId,
    eventId: globalStore.currentMatch.eventId
  };

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
  const newSeasonal = [...seasonalList(), newJson];
  reduxAction(globals.store.dispatch, "SET_SEASONAL", newJson, IPC_RENDERER);
  playerDb.upsert("", "seasonal_rank", newSeasonal);

  const httpApi = require("../httpApi");
  httpApi.httpSetSeasonal(newJson);

  // New rank data
  reduxAction(globals.store.dispatch, "SET_RANK", rank, IPC_RENDERER);
  playerDb.upsert("", "rank", rank);
}
