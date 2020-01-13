import { TableState } from "react-table";
import { ExtendedMatchData } from "../../../window_background/data";
import { AggregatorFilters } from "../decks/types";
import {
  TableControlsProps,
  TableViewRowProps,
  TableData
} from "../tables/types";

export interface SerializedMatch extends ExtendedMatchData {
  archived?: boolean;
  set: string;
  type: "match";
}

export interface MatchTableData extends SerializedMatch, TableData {
  archivedSortVal: number;
  custom: boolean;
  colors: number[];
  colorSortVal: string;
  deckId: string;
  deckName: string;
  deckTags: string[];
  deckFormat: string;
  eventName: string;
  format: string;
  leaderboardPlace?: number;
  losses: number;
  oppArchetype: string;
  oppColors: number[];
  oppColorSortVal: string;
  oppLeaderboardPlace?: number;
  oppName: string;
  oppPercentile?: number;
  oppRank: string;
  oppTier: number;
  oppUserId: string;
  percentile?: number;
  rank: string;
  tier: number;
  timestamp: number;
  wins: number;
}

export interface MatchesTableState extends TableState<MatchTableData> {
  matchesTableMode: string;
}

export type TagCounts = { tag: string; q: number }[];

export interface MatchesTableProps {
  data: MatchTableData[];
  aggFilters: AggregatorFilters;
  events: string[];
  tags: TagCounts;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  openMatchCallback: (matchId: string | number) => void;
  filterMatchesCallback: (matchId?: string | string[]) => void;
  archiveCallback: (id: string | number) => void;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (id: string, tag: string) => void;
  tableStateCallback: (state: MatchesTableState) => void;
  cachedState: MatchesTableState;
  cachedTableMode: string;
}

export interface MatchesTableControlsProps
  extends TableControlsProps<MatchTableData> {
  aggFilters: AggregatorFilters;
  events: string[];
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
}

export interface MatchesTableRowProps
  extends TableViewRowProps<MatchTableData> {
  tags: TagCounts;
  openMatchCallback: (matchId: string | number) => void;
  archiveCallback: (id: string | number) => void;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (id: string, tag: string) => void;
}
