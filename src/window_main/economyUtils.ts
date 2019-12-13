import db from "../shared/database";
import _ from "lodash";
import { getReadableEvent } from "../shared/util";

const questMap = {
  "a4a06519-fd8a-422a-b20f-8fc7a175feef": "Quests/Quest_Azorius_Justiciar",
  "7658b13d-861b-4c0c-bc7b-e01efcfa64ae": "Quests/Quest_Azorius_Judge",
  "59fd1ddb-6445-4016-aeef-d401e7ac98df": "Quests/Quest_Boros_Vigor",
  "7d257bad-9007-4e1f-b00e-697737130fdb": "Quests/Quest_Boros_Reckoner",
  "2bc8f0c7-60d8-40fc-aceb-41b8b66e7118": "Quests/Quest_Horrible_Horde",
  "84bb640d-58fd-40b3-84c6-b3cb989e493a": "Quests/Quest_Creature_Comforts",
  "d901ed54-99f1-4872-a134-78a25e794ed2": "Quests/Quest_Dimir_Cutpurse",
  "14480b30-416b-4283-83cb-e8ef509bfe37": "Quests/Quest_Dimir_Guile",
  "93a9ee9c-9196-4301-8ce8-737f06b01f62": "Quests/Quest_Tragic_Slip",
  "3ddedbc9-fe86-4adc-8b85-74d9f5e6302c": "Quests/Quest_Fatal_Push",
  "332718c9-33c1-4446-97aa-e3c9c95b8a3f": "Quests/Quest_Gruul_Bloodthirst",
  "b36bbc38-11df-402e-b94c-b74c37a27e37": "Quests/Quest_Gruul_Scrapper",
  "258d1f41-0481-4a5f-9f2c-e307aae75817": "Quests/Quest_Golgari_Guildmage",
  "20e3c215-ba16-41b7-8d90-255f4a15453c": "Quests/Quest_Golgari_Necromancy",
  "79c12017-2e82-45b4-bc90-77d8897265bd": "Quests/Quest_Izzet_Comprehension",
  "b50625d4-028c-42b0-86cd-573e96b53c7f": "Quests/Quest_Izzet_Chronarch",
  "77b5aa57-3531-4d3f-969b-3f4b5ad019fb": "Quests/Quest_Nissas_Campaign",
  "39892322-3ea8-4131-911d-fa6386c7b2d4": "Quests/Quest_Nissas_Journey",
  "27ca3d82-d417-4d47-99ae-1d64840db46c": "Quests/Quest_Orzhov_Domination",
  "80c38efd-a07d-452f-b701-921471bdcf2f": "Quests/Quest_Orzhov_Advokist",
  "592d1212-b2a2-4d26-8c3a-aa173828acdf": "Quests/Quest_Almighty_Army",
  "7af15f62-732e-4f2e-8bcc-1b9379517aaa": "Quests/Quest_Raiding_Party",
  "8063315c-e17e-46c8-a408-b6281603c260": "Quests/Quest_Rakdos_Destruction",
  "90c7f0d6-e165-44fc-88c8-fdf557bd178d": "Quests/Quest_Rakdos_Cackler",
  "fa28d3a3-63f6-4d00-b74f-4292e71a1c72": "Quests/Quest_Selesnya_Silence",
  "6a4ef8b1-cf56-4c61-b3c8-f886bd804e92": "Quests/Quest_Selesnya_Sentry",
  "a28b4eb1-345e-41a8-b3f6-033773cb6682": "Quests/Quest_Simic_Evolution",
  "85e3c2f5-94d2-4574-b8d6-084ba371dcca": "Quests/Quest_Simic_Manipulator"
};

// These should match the full text of the event
const economyTransactionContextsMap = {
  "Booster.Open": "Booster Open",
  "Booster.Open.BoosterOpen": "Booster Open",
  "Event.GrantCardPool": "Event Card Pool",
  "Event.GrantCardPool.ModifyPlayerInventory": "Event Card Pool",
  "Event.PayEntry": "Pay Event Entry",
  "Event.PayEntry.EventPayEntry": "Pay Event Entry",
  "Event.Season.Constructed.Payout": "Constructed Season Rewards",
  "Event.Season.Limited.Payout": "Limited Season Rewards",
  "PlayerReward.OnMatchCompletedDaily": "Match Rewards: Daily Wins",
  PurchasedCosmetic: "Cosmetic Purchase",
  "Quest Completed": "Match Rewards: Quest Reward",
  Store: "Store Transaction",
  "PlayerInventory.RedeemBulkWildcards": "Redeem Wildcard",
  "PlayerInventory.RedeemBulkWildcards.WildCardRedemption": "Redeem Wildcard",
  "WildCard.Redeem": "Redeem Wildcard",
  "Vault.Complete": "Vault Opening",
  "PlayerReward.OnMatchCompletedWeekly": "Match Rewards: Weekly Wins",
  "PlayerProgression.OrbSpend": "Orb Spend",
  "Track Progress": "Match Rewards: Level Up",
  "Track.RewardTier.Updated": "Mastery Pass Purchase",
  "Player Rewards": "Match Rewards",
  "Event Prize": "Event Rewards"
};

type EconomyTransactionKeys = keyof typeof economyTransactionContextsMap;

function isEconomyTransactionKey(s: string): s is EconomyTransactionKeys {
  return s in economyTransactionContextsMap;
}

const trackCodeMap = {
  BattlePass_ELD: "Throne of Eldraine",
  BattlePass_M20: "Core Set 2020",
  EarlyPlayerProgression: "New Player Experience"
};

function isTrackCode(s: string): s is MasteryTrackKeys {
  return s in trackCodeMap;
}

type MasteryTrackKeys = keyof typeof trackCodeMap;

function getReadableTrack(trackCode: string) {
  return (
    (isTrackCode(trackCode) && trackCodeMap[trackCode]) ||
    getReadableCode(trackCode)
  );
}

// quick and dirty generic pretty formatting
// "WhyDoesWotc.KeepChanging.Codes" => "Why Does Wotc: Keep Changing: Codes"
function getReadableCode(code: string) {
  let result = "";
  code.split(".").forEach(group => {
    result += ": " + _.startCase(group);
  });
  return result.substring(2);
}

type QuestKeys = keyof typeof questMap;

function isQuestCode(s: string): s is QuestKeys {
  return s in questMap;
}

function getReadableQuest(questCode: string) {
  if (isQuestCode(questCode)) {
    return questMap[questCode].slice(13).replace(/_/g, " ");
  }
  // If no readable quest name, just use a small portion of the ID.
  return `#${questCode.substring(0, 6)}`;
}

export function getCollationSet(collationid: number) {
  for (let name in db.sets) {
    if (db.sets[name].collation === collationid) {
      return name;
    }
  }
  return "";
}

export function getPrettyContext(context: string, full = true) {
  if (context == undefined || !context) {
    return "-";
  }

  if (context.startsWith("Track.Progress")) {
    const trackCode = context.substring(15);
    return full
      ? `Match Rewards: Level Up: ${getReadableTrack(trackCode)}`
      : "Match Rewards";
  }

  if (context.startsWith("Event.Prize")) {
    const eventCode = context.substring(12);
    return full
      ? `Event Rewards: ${getReadableEvent(eventCode)}`
      : "Event Rewards";
  }

  if (context.endsWith("EventReward")) {
    const eventCode = context.split(".")[0];
    return full
      ? `Event Rewards: ${getReadableEvent(eventCode)}`
      : "Event Rewards";
  }

  if (context.startsWith("PostMatch.Update")) {
    const rewardCode = context.substring(17);
    let readableReward = getReadableCode(rewardCode);
    if (rewardCode.startsWith("BattlePassLevelUp")) {
      const trackCode = rewardCode.substring(18);
      readableReward = "Level Up: " + getReadableTrack(trackCode);
    } else if (rewardCode.startsWith("QuestReward")) {
      const questCode = rewardCode.substring(12);
      readableReward = "Quest Reward: " + getReadableQuest(questCode);
    }
    return full ? `Match Rewards: ${readableReward}` : "Match Rewards";
  }

  if (context.startsWith("Quest.Completed")) {
    const questCode = context.substring(16);
    return full
      ? `Match Rewards: Quest Reward: ${getReadableQuest(questCode)}`
      : "Match Rewards";
  }

  if (context.startsWith("Store.Fulfillment")) {
    const storeCode = context.substring(18);
    if (!storeCode || !full) {
      return "Store Transaction";
    }
    return `Store Transaction: ${getReadableCode(storeCode)}`;
  }

  // If there's no valid pretty context, fallback on generic formatting
  const pretty =
    (isEconomyTransactionKey(context) &&
      economyTransactionContextsMap[context]) ||
    getReadableCode(context);

  if (!full && pretty.includes(":")) {
    return pretty.split(":")[0];
  }

  return pretty;
}

export const vaultPercentFormat = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
};

export interface EconomyState {
  showArchived: boolean;
  filterEconomy: string;
  daysago: number;
  dayList: any[];
  sortedChanges: any[];
}
