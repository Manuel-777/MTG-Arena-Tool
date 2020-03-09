import { CellProps, TableState } from "react-table";
import { InternalDeck } from "../../../types/Deck";
import { AggregatorFilters, AggregatorStats } from "../../aggregator";
import {
  TableControlsProps,
  TableData,
  TableViewRowProps,
  TagCounts
} from "../tables/types";

export interface CardCounts {
  [key: string]: number;
}

export interface MissingWildcards {
  rare: number;
  common: number;
  uncommon: number;
  mythic: number;
}

export interface DecksData
  extends InternalDeck,
    AggregatorStats,
    MissingWildcards,
    TableData {
  winrate100: number;
  archivedSortVal: number;
  avgDuration: number;
  boosterCost: number;
  colorSortVal: string;
  timeUpdated: number;
  timePlayed: number;
  timeTouched: number;
  lastEditWins: number;
  lastEditLosses: number;
  lastEditTotal: number;
  lastEditWinrate: number;
}

export interface DecksTableProps {
  addTagCallback: (id: string, tag: string) => void;
  archiveCallback: (id: string | number) => void;
  aggFilters: AggregatorFilters;
  cachedState?: TableState<DecksData>;
  cachedTableMode: string;
  data: DecksData[];
  events: string[];
  deleteTagCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  openDeckCallback: (deck: InternalDeck) => void;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  tableModeCallback: (tableMode: string) => void;
  tableStateCallback: (state: TableState<DecksData>) => void;
}

export interface DecksTableControlsProps extends TableControlsProps<DecksData> {
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  aggFilters: AggregatorFilters;
  events: string[];
}

export interface DecksTableRowProps extends TableViewRowProps<DecksData> {
  tags: TagCounts;
  openDeckCallback: (deck: InternalDeck) => void;
  archiveCallback: (id: string | number) => void;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (id: string, tag: string) => void;
}

export type DecksTableCellProps = CellProps<DecksData>;
