import { TableState } from "react-table";
import { ExtendedMatchData } from "../../../window_background/data";
import { AggregatorFilters } from "../../aggregator";
import {
  TableControlsProps,
  TableData,
  TableViewRowProps,
  TagCounts
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
  deckFormat: string;
  eventName: string;
  format: string;
  isOnPlay: boolean;
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

export interface MatchesTableProps {
  addTagCallback: (id: string, tag: string) => void;
  aggFilters: AggregatorFilters;
  archiveCallback: (id: string | number) => void;
  cachedState: TableState<MatchTableData>;
  cachedTableMode: string;
  data: MatchTableData[];
  deleteTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  events: string[];
  filterDataCallback: (data: MatchTableData[]) => void;
  openMatchCallback: (matchId: string | number) => void;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  tableModeCallback: (tableMode: string) => void;
  tableStateCallback: (state: TableState<MatchTableData>) => void;
  tags: TagCounts;
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
