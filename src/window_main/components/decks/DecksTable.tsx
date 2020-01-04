/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
import _ from "lodash";
import React from "react";

import { DECKS_TABLE_MODE } from "../../../shared/constants";

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
  deckSearchFilterFn
} from "./filters";
import {
  DecksTableProps,
  DecksTableState,
  DecksTableControlsProps
} from "./types";
import PagingControls, { PagingControlsProps } from "../PagingControls";
import DecksTableControls from "./DecksTableControls";
import { DecksTableViewRow, DecksArtViewRow } from "./rows";

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
        Cell: NameCell,
        gridWidth: "200px",
        defaultVisible: true
      },
      {
        Header: "Colors",
        disableFilters: false,
        accessor: "colorSortVal",
        Filter: ColorColumnFilter,
        filter: "colors",
        minWidth: 170,
        Cell: ColorsCell,
        gridWidth: "150px",
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "colors" },
      {
        Header: "Format",
        accessor: "format",
        disableFilters: false,
        Filter: TextBoxFilter,
        filter: "fuzzyText",
        Cell: FormatCell,
        gridWidth: "150px",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Tags",
        accessor: "tags",
        disableFilters: false,
        Filter: TextBoxFilter,
        filter: "fuzzyText",
        disableSortBy: true,
        Cell: TagsCell,
        gridWidth: "200px",
        mayToggle: true
      },
      {
        Header: "Last Updated",
        accessor: "timeUpdated",
        Cell: DatetimeCell,
        sortDescFirst: true,
        mayToggle: true,
        needsTileLabel: true
      },
      {
        Header: "Last Played",
        accessor: "timePlayed",
        Cell: DatetimeCell,
        sortDescFirst: true,
        mayToggle: true,
        needsTileLabel: true
      },
      {
        Header: "Last Touched",
        accessor: "timeTouched",
        Cell: DatetimeCell,
        sortDescFirst: true,
        mayToggle: true,
        defaultVisible: true,
        needsTileLabel: true
      },
      {
        Header: "Won",
        accessor: "wins",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        needsTileLabel: true
      },
      {
        Header: "Lost",
        accessor: "losses",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        needsTileLabel: true
      },
      {
        Header: "Total",
        accessor: "total",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        needsTileLabel: true
      },
      {
        Header: "Total Duration",
        accessor: "duration",
        Cell: DurationCell,
        mayToggle: true,
        needsTileLabel: true
      },
      {
        Header: "Avg. Duration",
        accessor: "avgDuration",
        Cell: DurationCell,
        mayToggle: true,
        needsTileLabel: true
      },
      {
        Header: "Winrate",
        accessor: "winrate100",
        Cell: WinRateCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true,
        defaultVisible: true,
        needsTileLabel: true
      },
      { accessor: "winrate" },
      { accessor: "interval", sortInverted: true },
      { accessor: "winrateLow" },
      { accessor: "winrateHigh" },
      {
        Header: "Since last edit",
        accessor: "lastEditWinrate",
        Cell: LastEditWinRateCell,
        mayToggle: true,
        needsTileLabel: true
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
        filter: "between",
        mayToggle: true
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
        Cell: ArchivedCell,
        sortType: "basic",
        mayToggle: true,
        defaultVisible: true
      }
    ],
    []
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
    // default hidden columns
    const hiddenColumns = columns
      .filter(column => !column.defaultVisible)
      .map(column => column.id ?? column.accessor);
    const state = _.defaultsDeep(cachedState, {
      hiddenColumns,
      sortBy: [{ id: "timeTouched", desc: true }],
      pageSize: 25
    });
    // ensure data-only columns are all invisible
    for (const column of columns) {
      if (!column.defaultVisible && !column.mayToggle) {
        state.hiddenColumns.push(column.id);
      }
    }
    return state;
  }, [cachedState, columns]);

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
      globalFilter: deckSearchFilterFn,
      initialState,
      autoResetFilters: false,
      autoResetGlobalFilter: false,
      autoResetSortBy: false,
      ...cellCallbacks
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

  const pagingProps: PagingControlsProps = {
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

  const visibleHeaders = headers.filter((header: any) => header.isVisible);
  const gridTemplateColumns = visibleHeaders
    .map((header: any) => header.gridWidth ?? "1fr")
    .join(" ");

  const tableControlsProps: DecksTableControlsProps = {
    canNextPage,
    canPreviousPage,
    filterMatchesCallback,
    filters,
    flatColumns,
    getTableProps,
    globalFilter,
    gotoPage,
    gridTemplateColumns,
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
    toggleSortBy,
    visibleHeaders
  };

  return (
    <div className="decks_table_wrap">
      <DecksTableControls {...tableControlsProps} />
      <div className="decks_table_body" {...getTableBodyProps()}>
        {page.map((row: any, index: number) => {
          prepareRow(row);
          const RowRenderer =
            tableMode === DECKS_TABLE_MODE
              ? DecksTableViewRow
              : DecksArtViewRow;
          return (
            <RowRenderer
              openDeckCallback={openDeckCallback}
              row={row}
              index={index}
              key={row.index}
              gridTemplateColumns={gridTemplateColumns}
            />
          );
        })}
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}
