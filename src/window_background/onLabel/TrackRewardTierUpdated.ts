//import { playerDb } from "../../shared/db/LocalDatabase";
//import { parseWotcTimeFallback } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
//import saveEconomyTransaction from "../saveEconomyTransaction";
import { RankRewards } from "../../types/event";
//import { InternalEconomyTransaction } from "../../types/inventory";

interface EntryJson {
  chest: RankRewards | null;
  orbsRewarded: number;
}

interface Entry extends LogEntry {
  json: () => {};
}

// TrackRewardTier.Updated
// Is this used still? I need a sample of the log entry
// like.. REALLY need a sample..
export default function TrackRewardTierUpdated(entry: Entry): void {
  /*
  const json = entry.json();
  if (!json) return;
  console.log(json);
  const economy = { ...playerData.economy };

  const transaction: InternalEconomyTransaction = {
    id: entry.hash,
    context: "Track.RewardTier.Updated",
    timestamp: json.timestamp,
    date: parseWotcTimeFallback(json.timestamp),
    delta: {},
    ...json
  };

  if (transaction.inventoryDelta) {
    // this is redundant data, removing to save space
    delete transaction.inventoryDelta;
  }
  if (transaction.newTier !== undefined) {
    economy.trackTier = transaction.newTier;
  }

  if (transaction.orbCountDiff) {
    const orbDiff = transaction.orbCountDiff;
    transaction.orbCountDiff = orbDiff;
    if (orbDiff.currentOrbCount !== undefined) {
      economy.currentOrbCount = orbDiff.currentOrbCount;
    }
  }

  saveEconomyTransaction(transaction);

  // console.log(economy);
  playerDb.upsert("", "economy", economy);
  */
}
