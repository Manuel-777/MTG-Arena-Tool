import { InternalRank } from "../types/rank";
import globals from "./globals";
import { SeasonalRankData } from "../types/Season";
import globalStore, { seasonalList } from "../shared-store";
import { reduxAction } from "../shared-redux/sharedRedux";
import { IPC_RENDERER } from "../shared/constants";
import { playerDb } from "../shared/db/LocalDatabase";

export default function setSeasonalRankFromCombinedRank(
  rank: InternalRank,
  id: string
): void {
  const playerData = globals.store.getState().playerdata;
  const currentMatch = globalStore.currentMatch;
  const owner = globals.store.getState().appsettings.email;

  if (currentMatch.matchId == "") return;

  // get these from current match
  const type =
    currentMatch.gameInfo.superFormat == "SuperFormat_Constructed"
      ? "constructed"
      : "limited";
  const timestamp = globals.logTime.getTime();

  const newJson: SeasonalRankData = {
    owner,
    player: playerData.playerName,
    playerId: playerData.arenaId,
    rankUpdateType: type,
    id,
    eventId: currentMatch.eventId,
    lastMatchId: currentMatch.matchId,
    newClass: rank[type].rank,
    newLevel: rank[type].tier,
    newStep: rank[type].step,
    oldClass: playerData.rank[type].rank,
    oldLevel: playerData.rank[type].tier,
    oldStep: playerData.rank[type].step,
    seasonOrdinal: playerData.rank[type].seasonOrdinal,
    timestamp: timestamp,
    wasLossProtected: false
  };

  if (newJson.newClass == "Mythic" && newJson.oldClass == "Mythic") {
    newJson.oldLevel = playerData.rank[type].percentile;
    newJson.newLevel = rank[type].percentile;
    newJson.oldStep = playerData.rank[type].leaderboardPlace;
    newJson.newStep = rank[type].leaderboardPlace;
  }

  //console.log("SeasonalRankData", newJson);

  const newSeasonal = [...seasonalList(), newJson];
  reduxAction(globals.store.dispatch, "SET_SEASONAL", newJson, IPC_RENDERER);
  playerDb.upsert("", "seasonal_rank", newSeasonal);

  const httpApi = require("./httpApi");
  httpApi.httpSetSeasonal(newJson);
}
