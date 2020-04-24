import { InternalRank } from "../types/rank";
import globals from "./globals";
import { SeasonalRankData } from "../types/Season";

export default function setSeasonalRankFromCombinedRank(
  rank: InternalRank,
  id: string,
  timestamp: string
): void {
  const playerData = globals.store.getState().playerdata;
  const owner = globals.store.getState().appsettings.email;
  const type = "constructed";
  const newJson: SeasonalRankData = {
    ...rank,
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
    seasonOrdinal: 0,
    timestamp: new Date(timestamp).getTime(),
    wasLossProtected: false
  };
}
