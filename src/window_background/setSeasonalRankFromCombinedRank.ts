import { InternalRank } from "../types/rank";
import globals from "./globals";
import { SeasonalRankData } from "../types/Season";

export default function setSeasonalRankFromCombinedRank(
  rank: InternalRank,
  id: string
): void {
  const playerData = globals.store.getState().playerdata;
  const owner = globals.store.getState().appsettings.email;

  // get these from current match
  const type = "constructed";
  const timestamp = new Date().getTime();

  const newJson: SeasonalRankData = {
    owner,
    player: playerData.playerName,
    playerId: playerData.arenaId,
    rankUpdateType: type,
    id,
    eventId: "string",
    lastMatchId: "string",
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

  console.log("SeasonalRankData", newJson);
}
