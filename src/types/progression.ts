interface BattlePass {
  trackName: string;
  currentLevel: number;
  currentExp: number;
  rewardTiers: number[];
  currentOrbCount: number;
  unlockedNodeIds: number[];
  availableNodesToUnlock: number[];
  currentTier?: string;
}

export interface PlayerProgression {
  eppTrack: BattlePass;
  isEppTrackActive: boolean;
  activeBattlePass: BattlePass;
  expiredBattlePasses: BattlePass[];
  currentRenewalId: string;
}
