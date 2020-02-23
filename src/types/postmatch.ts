import { InventoryUpdate } from "./inventory";

export interface QuestUpdate {
  questId: string;
  goal: number;
  locKey: string;
  tileResourceId: string;
  treasureResourceId: string;
  questTrack: string;
  isNewQuest: boolean;
  endingProgress: number;
  startingProgress: number;
  canSwap: boolean;
  chestDescription: {
    image1: string;
    prefab: string;
    headerLocKey: string;
    quantity: string;
    locParams: { number1?: number; number2?: number; number3?: number };
    availableDate: string;
  };
  hoursWaitAfterComplete: number;
  inventoryUpdate?: InventoryUpdate;
}

export interface BattlePassUpdate {
  trackName: string;
  trackTier: number;
  trackDiff: {
    currentLevel: number;
    currentExp: number;
    oldLevel: number;
    oldExp: number;
    inventoryUpdates: any[];
  };
  rewardWebDiff: {
    currentUnlockedNodes: number[];
    currentAvailableNodes: number[];
    oldUnlockedNodes: number[];
    oldAvailableNodes: number[];
    inventoryUpdates: any[];
  };
  orbCountDiff: { oldOrbCount: number; currentOrbCount: number };
}

export interface PostMatchUpdate {
  questUpdate: QuestUpdate[];
  dailyWinUpdates: InventoryUpdate[];
  weeklyWinUpdates: InventoryUpdate[];
  eppUpdate: BattlePassUpdate;
  battlePassUpdate: BattlePassUpdate;
}
