export interface Season {
  currentSeason: SeasonInfo;
  limitedRankInfo: RankClassInfo[];
  constructedRankInfo: RankClassInfo[];
}

interface SeasonInfo {
  seasonOrdinal: number;
  seasonStartTime: Date;
  seasonEndTime: Date;
  seasonLimitedRewards: Map<Rank, SeasonRewardInfo>;
  seasonConstructedRewards: Map<Rank, SeasonRewardInfo>;
  minMatches: number;
}

export enum Rank {
  Bronze,
  Silver,
  Gold,
  Platinum,
  Diamond,
  Mythic
}

interface SeasonRewardInfo {
  image1: string | null;
  image2: string | null;
  image3: string | null;
  prefab: string;
  referenceId: string;
  headerLocKey: string;
  descriptionLocKey: string;
  quantity: string;
  locParams: Map<string, number>;
  availableDate: Date;
}

export interface RankClassInfo {
  rankClass: Rank;
  level: number;
  steps: number;
}
