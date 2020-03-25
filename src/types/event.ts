import { ArenaV3Deck, InternalDeck } from "./Deck";

export interface EventInstanceData {
  CurrentWins: number;
  CurrentLosses?: number;
  ProcessedMatchIds?: string[];
}

export interface WinLossGate {
  MaxWins: number;
  MaxLosses: number;
  MaxGames: number;
  CurrentWins: number;
  CurrentLosses: number;
  CurrentGames: number;
  ProcessedMatchIds: string[];
}

export interface WinNoGate {
  CurrentWins: number;
  ProcessedMatchIds: string[];
}

export interface InternalEvent {
  Id?: string;
  _id?: string;
  id: string;
  CourseDeck: InternalDeck;
  archived?: boolean;
  CurrentEventState: string | number;
  custom: boolean;
  date: string;
  InternalEventName: string;
  ModuleInstanceData: ModuleInstanceData;
  type: "Event";
}

export interface ModuleInstanceData {
  HasPaidEntry?: string;
  DeckSelected?: boolean;
  DraftInfo?: {
    DraftId: string;
  };
  DraftComplete?: boolean;
  HasGranted?: boolean;
  WinLossGate?: WinLossGate;
  WinNoGate?: WinNoGate;
}

export interface PlayerCourse {
  Id: string;
  InternalEventName: string;
  PlayerId: string | null;
  ModuleInstanceData: ModuleInstanceData;
  CurrentEventState: string;
  CurrentModule: string;
  CardPool: null | number[];
  CourseDeck: null | ArenaV3Deck;
  PreviousOpponents: string[];
}

export interface ActiveEvent {
  PublicEventName: string;
  InternalEventName: string;
  EventState: string;
  EventType: string;
  ModuleGlobalData: { DeckSelect: string };
  StartTime: string;
  LockedTime: string;
  ClosedTime: string;
  Parameters: any; // Missing type here
  Group: string;
  PastEntries: string | null;
  DisplayPriority: number;
  IsArenaPlayModeEvent: boolean;
  Emblems: string | null;
  UILayoutOptions: {
    ResignBehavior: string;
    WinTrackBehavior: string;
    EventBladeBehavior: string;
    DeckButtonBehavior: string;
    TemplateName: string | null;
  };
  SkipValidation: boolean;
  DoesUpdateQuests: boolean;
  DoesUpdateDailyWeeklyRewards: boolean;
  AllowUncollectedCards: boolean;
}

export interface RankInfo {
  rankClass: Rank;
  level: number;
  steps: number;
}

export interface RankRewards {
  image1: string | null;
  image2: string | null;
  image3: string | null;
  prefab: string;
  referenceId: string;
  headerLocKey: string;
  descriptionLocKey: string;
  quantity: string;
  locParams: { number1?: number; number2?: number; number3?: number };
  availableDate: string;
}

export enum Rank {
  Bronze,
  Silver,
  Gold,
  Platinum,
  Diamond,
  Mythic
}

export interface SeasonAndRankDetail {
  currentSeason: {
    seasonOrdinal: number;
    seasonStartTime: string;
    seasonEndTime: string;
    seasonLimitedRewards: Map<Rank, RankRewards>;
    seasonConstructedRewards: Map<Rank, RankRewards>;
    minMatches: number;
  };
  limitedRankInfo: RankInfo[];
  constructedRankInfo: RankInfo[];
}
