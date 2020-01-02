import { DbCardData } from "../../../shared/types/Metadata";

export interface CardsData extends DbCardData {
  colors: number[];
  colorSortVal: string;
  boosterSortVal: string;
  rankSortVal: string;
  owned: number;
  acquired: number;
  wanted: number;
}

export interface CollectionTableState {
  hiddenColumns: string[];
  filters: { [key: string]: any };
  sortBy: [{ id: string; desc: boolean }];
  collectionTableMode: string;
}

export interface CollectionTableProps {
  data: CardsData[];
  cardHoverCallback: (cardDiv: HTMLElement, card: DbCardData) => void;
  contextMenuCallback: (cardDiv: HTMLElement, card: DbCardData) => void;
  tableStateCallback: (state: CollectionTableState) => void;
  cachedState: CollectionTableState;
  cachedTableMode: string;
  filterCallback: (cardIds: string[]) => void;
  exportCallback: (cardIds: string[]) => void;
  openCardCallback: (cardObj: any) => void;
}

export interface CollectionTableControlsProps {
  canNextPage: boolean;
  canPreviousPage: boolean;
  exportCallback: (cardIds: string[]) => void;
  filters: any;
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
  rows: any[];
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

export interface CardRowProps {
  row: any;
  index: number;
  cardHoverCallback: (cardDiv: HTMLElement, card: DbCardData) => void;
  contextMenuCallback: (cardDiv: HTMLElement, card: DbCardData) => void;
  openCardCallback: (cardObj: any) => void;
  gridTemplateColumns: string;
}

export interface CellProps {
  cell: any;
}

export interface StyledArtTileCellProps {
  url: string;
  className?: string;
}
