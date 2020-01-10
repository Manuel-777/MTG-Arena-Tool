import { CellProps, TableState } from "react-table";
import { SerializedDeck } from "../../../shared/types/Deck";
import { TableControlsProps } from "../tables/types";

export interface DeckStats {
  wins: number;
  losses: number;
  total: number;
  duration: number;
  winrate: number;
  interval: number;
  winrateLow: number;
  winrateHigh: number;
}

export interface MissingWildcards {
  rare: number;
  common: number;
  uncommon: number;
  mythic: number;
}

export interface DecksData extends SerializedDeck, DeckStats, MissingWildcards {
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

export interface AggregatorFilters {
  date?: Date | string;
  showArchived?: boolean;
  eventId?: string;
}

export interface DecksTableState extends TableState<DecksData> {
  decksTableMode: string;
}

export interface DecksTableProps {
  data: DecksData[];
  aggFilters: AggregatorFilters;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  openDeckCallback: (id: string) => void;
  filterDecksCallback: (deckId?: string | string[]) => void;
  archiveCallback: (id: string) => void;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
  tableStateCallback: (state: DecksTableState) => void;
  cachedState: DecksTableState;
  cachedTableMode: string;
}

export interface DecksTableControlsProps extends TableControlsProps<DecksData> {
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  aggFilters: AggregatorFilters;
}

export type DecksTableCellProps = CellProps<DecksData>;
