/* eslint-disable @typescript-eslint/no-explicit-any */
import { SerializedDeck } from "../../../shared/types/Deck";

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
  date?: Date;
  showArchived?: boolean;
}

export interface DecksTableState {
  hiddenColumns: string[];
  filters: { [key: string]: any };
  sortBy: [{ id: string; desc: boolean }];
  decksTableMode: string;
}

export interface DecksTableProps {
  data: DecksData[];
  filters: AggregatorFilters;
  filterMatchesCallback: (filters: AggregatorFilters) => void;
  openDeckCallback: (id: string) => void;
  filterDecksCallback: (deckId?: string | string[]) => void;
  archiveDeckCallback: (id: string) => void;
  tagDeckCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
  tableStateCallback: (state: DecksTableState) => void;
  cachedState: DecksTableState;
  cachedTableMode: string;
}

export interface DecksTableControlsProps {
  canNextPage: boolean;
  canPreviousPage: boolean;
  filterMatchesCallback: (filters: AggregatorFilters) => void;
  filters: AggregatorFilters;
  flatColumns: any[];
  getTableProps: any;
  globalFilter: any;
  gotoPage: any;
  gridTemplateColumns: string;
  nextPage: any;
  pageCount: number;
  pageIndex: number;
  pageOptions: any;
  pageSize: number;
  preGlobalFilteredRows: any[];
  previousPage: any;
  setAllFilters: any;
  setFilter: any;
  setGlobalFilter: any;
  setPageSize: any;
  setTableMode: any;
  tableMode: string;
  toggleHideColumn: any;
  toggleSortBy: any;
  visibleHeaders: any[];
}

export interface DecksTableRowProps {
  row: any;
  index: number;
  openDeckCallback: (id: string) => void;
  gridTemplateColumns: string;
}

export interface DecksTableCellProps {
  cell: any;
  archiveDeckCallback: (id: string) => void;
  tagDeckCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
}
