import globals from "./globals";
import globalStore, { seasonalList, seasonalExists } from "../shared/store";
import { reduxAction } from "../shared/redux/sharedRedux";
import { playerDb } from "../shared/db/LocalDatabase";
import { httpSetSeasonal } from "./httpApi";
import { constants, InternalRank, SeasonalRankData } from "mtgatool-shared";

const { IPC_RENDERER } = constants;

export default function setSeasonalRankFromCombinedRank(
  rank: InternalRank
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
    playerId: playerData.arenaId,
    arenaId: playerData.playerName,
    rankUpdateType: type,
    id: currentMatch.matchId,
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
    wasLossProtected: false,
  };

  if (newJson.newClass == "Mythic" && newJson.oldClass == "Mythic") {
    newJson.oldLevel = playerData.rank[type].percentile;
    newJson.newLevel = rank[type].percentile;
    newJson.oldStep = playerData.rank[type].leaderboardPlace;
    newJson.newStep = rank[type].leaderboardPlace;
  }

  //debugLog("SeasonalRankData", newJson);
  if (!seasonalExists(currentMatch.matchId)) {
    reduxAction(
      globals.store.dispatch,
      { type: "SET_SEASONAL", arg: newJson },
      IPC_RENDERER
    );
    playerDb.upsert("", "seasonal", seasonalList());
  }

  httpSetSeasonal(newJson);
}
