import { playerDb } from "../../shared/db/LocalDatabase";
import pd from "../../shared/PlayerData";
import globals from "../globals";
import { setData } from "../backgroundUtil";
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
  const rank = { ...playerData.rank };

  // newJson.wasLossProtected
  // newJson.seasonOrdinal
  const updateType = newJson.rankUpdateType.toLowerCase() as
    | "constructed"
    | "limited";

  rank[updateType].rank = newJson.newClass;
  rank[updateType].tier = newJson.newLevel;
  rank[updateType].step = newJson.newStep;
  rank[updateType].seasonOrdinal = newJson.seasonOrdinal;

  const seasonalRank = pd.addSeasonalRank(
    newJson,
    newJson.seasonOrdinal,
    updateType
  );

  const httpApi = require("../httpApi");
  httpApi.httpSetSeasonal(newJson);

  reduxAction(globals.store.dispatch, "SET_RANK", rank, IPC_RENDERER);
  setData({ seasonalRank });
  playerDb.upsert("", "rank", rank);
  playerDb.upsert("", "seasonal_rank", seasonalRank);
}
