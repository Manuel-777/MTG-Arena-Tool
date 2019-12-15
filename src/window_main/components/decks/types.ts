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
  onlyCurrentDecks?: boolean;
  date?: Date;
  showArchived?: boolean;
}

export interface DecksTableState {
  hiddenColumns: string[];
  filters: { [key: string]: any };
  sortBy: [{ id: string; desc: boolean }];
}

export interface DecksTableProps {
  data: DecksData[];
  filters: AggregatorFilters;
  filterMatchesCallback: (filters: AggregatorFilters) => void;
  openDeckCallback: (id: string) => void;
  archiveDeckCallback: (id: string) => void;
  tagDeckCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
  tableStateCallback: (state: DecksTableState) => void;
  cachedState: DecksTableState;
}

export interface CellProps {
  cell: any;
  openDeckCallback: (id: string) => void;
  archiveDeckCallback: (id: string) => void;
  tagDeckCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
}

export interface StyledArtTileCellProps {
  url: string;
}

export interface StyledTagProps {
  backgroundColor: string;
  fontStyle: string;
}

export interface DeckTagProps {
  deckid: string;
  tag: string;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
}

export interface StyledArchivedCellProps {
  archived: boolean;
}
