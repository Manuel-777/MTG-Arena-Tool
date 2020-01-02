/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
import _ from "lodash";
import React from "react";

import { TABLE_MODE } from "../../../shared/constants";

import {
  NameCell,
  ColorsCell,
  FormatCell,
  TagsCell,
  DurationCell,
  DatetimeCell,
  MetricCell,
  WinRateCell,
  LastEditWinRateCell,
  MissingCardsCell,
  ArchiveHeader,
  ArchivedCell
} from "./cells";
import {
  TextBoxFilter,
  ColorColumnFilter,
  NumberRangeColumnFilter,
  ArchiveColumnFilter,
  fuzzyTextFilterFn,
  archivedFilterFn,
  colorsFilterFn,
  uberSearchFilterFn
} from "./filters";
import { CellProps, DecksTableProps, DecksTableState } from "./types";
import PagingControls from "../PagingControls";
import DecksTableControls from "./DecksTableControls";
import { TableViewRow, DeckTile } from "./rows";

const ReactTable = require("react-table"); // no @types package for current rc yet

export default function DecksTable({
  data,
  filters,
  filterMatchesCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterDecksCallback,
  openDeckCallback,
  ...cellCallbacks
}: DecksTableProps): JSX.Element {
  const CellWrapper = (
    component: (props: CellProps) => JSX.Element
  ): ((props: CellProps) => JSX.Element) => {
    return (props: CellProps): JSX.Element =>
      component({ ...props, ...cellCallbacks });
  };
  const defaultColumn = React.useMemo(
    () => ({
      disableFilters: true
    }),
    []
  );
  const columns = React.useMemo(
    () => [
      { id: "deckId", accessor: "id" },
      { accessor: "deckTileId" },
      {
        Header: "Name",
        accessor: "name",
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        sortType: "alphanumeric",
        Cell: CellWrapper(NameCell)
      },
      {
        Header: "Colors",
        disableFilters: false,
        accessor: "colorSortVal",
        Filter: ColorColumnFilter,
        filter: "colors",
        minWidth: 170,
        Cell: ColorsCell
      },
      { accessor: "colors" },
      {
        Header: "Format",
        accessor: "format",
        disableFilters: false,
        Filter: TextBoxFilter,
        filter: "fuzzyText",
        Cell: CellWrapper(FormatCell)
      },
      {
        Header: "Tags",
        accessor: "tags",
        disableFilters: false,
        Filter: TextBoxFilter,
        filter: "fuzzyText",
        disableSortBy: true,
        Cell: CellWrapper(TagsCell)
      },
      {
        Header: "Last Updated",
        accessor: "timeUpdated",
        Cell: DatetimeCell,
        sortDescFirst: true
      },
      {
        Header: "Last Played",
        accessor: "timePlayed",
        Cell: DatetimeCell,
        sortDescFirst: true
      },
      {
        Header: "Last Touched",
        accessor: "timeTouched",
        Cell: DatetimeCell,
        sortDescFirst: true
      },
      {
        Header: "Won",
        accessor: "wins",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between"
      },
      {
        Header: "Lost",
        accessor: "losses",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between"
      },
      {
        Header: "Total",
        accessor: "total",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between"
      },
      {
        Header: "Total Duration",
        accessor: "duration",
        Cell: DurationCell
      },
      {
        Header: "Avg. Duration",
        accessor: "avgDuration",
        Cell: DurationCell
      },
      {
        Header: "Winrate",
        accessor: "winrate100",
        Cell: WinRateCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between"
      },
      { accessor: "winrate" },
      { accessor: "interval", sortInverted: true },
      { accessor: "winrateLow" },
      { accessor: "winrateHigh" },
      {
        Header: "Since last edit",
        accessor: "lastEditWinrate",
        Cell: LastEditWinRateCell
      },
      { accessor: "lastEditWins" },
      { accessor: "lastEditLosses" },
      { accessor: "lastEditTotal" },
      {
        Header: "Booster Cost",
        accessor: "boosterCost",
        Cell: MissingCardsCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between"
      },
      { accessor: "rare" },
      { accessor: "common" },
      { accessor: "uncommon" },
      { accessor: "mythic" },
      { accessor: "custom" },
      { accessor: "archived" },
      {
        id: "archivedCol",
        Header: ArchiveHeader,
        accessor: "archivedSortVal",
        filter: "showArchived",
        Filter: ArchiveColumnFilter,
        minWidth: 98,
        disableFilters: false,
        Cell: CellWrapper(ArchivedCell),
        sortType: "basic"
      }
    ],
    [CellWrapper]
  );
  const filterTypes = React.useMemo(
    () => ({
      fuzzyText: fuzzyTextFilterFn,
      showArchived: archivedFilterFn,
      colors: colorsFilterFn
    }),
    []
  );
  const initialState: DecksTableState = React.useMemo(() => {
    const state = _.defaultsDeep(cachedState, {
      hiddenColumns: [
        "deckTileId",
        "archived",
        "deckId",
        "custom",
        "boosterCost",
        "colors",
        "lastEditLosses",
        "lastEditTotal",
        "lastEditWinrate",
        "lastEditWins",
        "timePlayed",
        "timeUpdated",
        "wins",
        "losses",
        "total",
        "rare",
        "common",
        "uncommon",
        "mythic",
        "duration",
        "avgDuration",
        "interval",
        "winrate",
        "winrateLow",
        "winrateHigh"
      ],
      sortBy: [{ id: "timeTouched", desc: true }],
      pageSize: 25
    });
    if (!state.hiddenColumns.includes("archived")) {
      state.hiddenColumns.push("archived");
    }
    if (!state.hiddenColumns.includes("deckTileId")) {
      state.hiddenColumns.push("deckTileId");
    }
    return state;
  }, [cachedState]);

  const {
    flatColumns,
    headers,
    getTableProps,
    getTableBodyProps,
    rows,
    page,
    prepareRow,
    toggleSortBy,
    toggleHideColumn,
    setAllFilters,
    setFilter,
    preGlobalFilteredRows,
    setGlobalFilter,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state
  } = ReactTable.useTable(
    {
      columns,
      data: React.useMemo(() => data, [data]),
      defaultColumn,
      filterTypes,
      globalFilter: uberSearchFilterFn,
      initialState,
      autoResetFilters: false,
      autoResetGlobalFilter: false,
      autoResetSortBy: false,
      autoResetPage: false
    },
    ReactTable.useFilters,
    ReactTable.useGlobalFilter,
    ReactTable.useSortBy,
    ReactTable.usePagination
  );
  const { globalFilter, pageIndex, pageSize } = state;
  const [tableMode, setTableMode] = React.useState(cachedTableMode);

  React.useEffect(() => {
    tableStateCallback({ ...state, decksTableMode: tableMode });
  }, [state, tableMode, tableStateCallback]);
  React.useEffect(() => {
    filterDecksCallback(rows.map((row: any) => row.values.deckId));
  }, [filterDecksCallback, rows]);

  const pagingProps = {
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    pageIndex,
    pageSize
  };

  const tableControlsProps = {
    canNextPage,
    canPreviousPage,
    filterMatchesCallback,
    filters,
    flatColumns,
    getTableProps,
    globalFilter,
    gotoPage,
    headers,
    nextPage,
    pageCount,
    pageIndex,
    pageOptions,
    pageSize,
    preGlobalFilteredRows,
    previousPage,
    setAllFilters,
    setFilter,
    setGlobalFilter,
    setPageSize,
    setTableMode,
    tableMode,
    toggleHideColumn,
    toggleSortBy
  };

  return (
    <div className="decks_table_wrap">
      <DecksTableControls {...tableControlsProps} />
      <div className="decks_table_body" {...getTableBodyProps()}>
        {page.map((row: any, index: number) => {
          prepareRow(row);
          const RowRenderer =
            tableMode === TABLE_MODE ? TableViewRow : DeckTile;
          return (
            <RowRenderer
              openDeckCallback={openDeckCallback}
              row={row}
              index={index}
              key={row.index}
            />
          );
        })}
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}
