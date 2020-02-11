export interface RankBase {
  id: string;
  playerId: string;
  seasonOrdinal: number;
  newClass: string;
  oldClass: string;
  newLevel: number;
  oldLevel: number;
  oldStep: number;
  newStep: number;
  wasLossProtected: boolean;
  rankUpdateType: string;
  oldMythicPercentile: number;
  newMythicPercentile: number;
  newMythicLeaderboardPlacement: number;
}

export interface RankUpdate extends RankBase {
  timestamp: string;
}

export interface InternalRankUpdate extends RankBase {
  timestamp: number;
  date: string;
  lastMatchId: string;
  eventId: string;
}

export interface InternalRankData {
  rank: string;
  tier: number;
  step: number;
  won: number;
  lost: number;
  drawn: number;
  percentile: number;
  leaderboardPlace: number;
  seasonOrdinal: number;
}

export interface InternalRank extends Record<string, InternalRankData> {
  constructed: InternalRankData;
  limited: InternalRankData;
}
