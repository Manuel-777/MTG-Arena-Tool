import { CellProps, TableState } from "react-table";
import { SerializedDeck } from "../../../shared/types/Deck";
import { TableControlsProps, AggregatorFilters } from "../tables/types";

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

export interface DecksTableProps {
  addTagCallback: (id: string, tag: string) => void;
  archiveCallback: (id: string) => void;
  aggFilters: AggregatorFilters;
  cachedState: TableState<DecksData>;
  cachedTableMode: string;
  data: DecksData[];
  deleteTagCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  filterDataCallback: (data: DecksData[]) => void;
  openDeckCallback: (id: string) => void;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  tableModeCallback: (tableMode: string) => void;
  tableStateCallback: (state: TableState<DecksData>) => void;
}

export interface DecksTableControlsProps extends TableControlsProps<DecksData> {
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
  aggFilters: AggregatorFilters;
}

export type DecksTableCellProps = CellProps<DecksData>;
