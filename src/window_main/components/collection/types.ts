import { CellProps, Row, TableState } from "react-table";
import { DbCardData } from "../../../shared/types/Metadata";
import { TableControlsProps, TableViewRowProps } from "../tables/types";

export interface CardsData extends DbCardData {
  colors: number[];
  colorSortVal: string;
  boosterSortVal: string;
  rankSortVal: string;
  owned: number;
  acquired: number;
  wanted: number;
}

export interface CollectionTableState extends TableState<CardsData> {
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
  openCardCallback: (cardObj: DbCardData) => void;
}

export interface CollectionTableControlsProps
  extends TableControlsProps<CardsData> {
  exportCallback: (cardIds: string[]) => void;
  rows: Row<CardsData>[];
}

export interface CollectionTableRowProps extends TableViewRowProps<CardsData> {
  cardHoverCallback: (cardDiv: HTMLElement, card: DbCardData) => void;
  contextMenuCallback: (cardDiv: HTMLElement, card: DbCardData) => void;
  openCardCallback: (cardObj: DbCardData) => void;
}

export type CollectionTableCellProps = CellProps<CardsData>;
