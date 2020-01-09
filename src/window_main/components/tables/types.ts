import {
  CellValue,
  ColumnInstance,
  Filters,
  FilterValue,
  IdType,
  Row,
  TablePropGetter,
  TableProps
} from "react-table";

export type TableData = Record<string, CellValue>;

export type FiltersVisible = { [key: string]: boolean };

export interface PagingControlsProps {
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageOptions: number[];
  pageCount: number;
  gotoPage: (updater: ((pageIndex: number) => number) | number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (pageSize: number) => void;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions?: string[];
}

export interface TableControlsProps<D extends TableData>
  extends PagingControlsProps {
  flatColumns: ColumnInstance<D>[];
  filters: Filters<D>;
  getTableProps: (propGetter?: TablePropGetter<D>) => TableProps;
  globalFilter: FilterValue;
  gridTemplateColumns: string;
  preGlobalFilteredRows: Row<D>[];
  setAllFilters: (
    updater: Filters<D> | ((filters: Filters<D>) => Filters<D>)
  ) => void;
  setFilter: (
    columnId: IdType<D>,
    updater: ((filterValue: FilterValue) => FilterValue) | FilterValue
  ) => void;
  setGlobalFilter: (filterValue: FilterValue) => void;
  setTableMode: (tableMode: string) => void;
  tableMode: string;
  toggleHideColumn: (columnId: IdType<D>, value?: boolean) => void;
  toggleSortBy: (
    columnId: IdType<D>,
    descending: boolean,
    isMulti: boolean
  ) => void;
  visibleHeaders: ColumnInstance<D>[];
}

export interface TableHeadersProps<D extends TableData> {
  filtersVisible: FiltersVisible;
  getTableProps: (propGetter?: TablePropGetter<D>) => TableProps;
  gridTemplateColumns: string;
  setFilter: (
    columnId: IdType<D>,
    updater: ((filterValue: FilterValue) => FilterValue) | FilterValue
  ) => void;
  setFiltersVisible: (filters: FiltersVisible) => void;
  visibleHeaders: ColumnInstance<D>[];
}

export interface TableViewRowProps<D extends TableData>
  extends React.HTMLAttributes<HTMLDivElement> {
  row: Row<D>;
  index: number;
  gridTemplateColumns: string;
}
