import startOfDay from "date-fns/startOfDay";
import _ from "lodash";
import React from "react";
import {
  useExpanded,
  useFilters,
  useGlobalFilter,
  useGroupBy,
  usePagination,
  useSortBy,
  useTable,
  Column
} from "react-table";
import { vaultPercentFormat } from "../../economyUtils";
import {
  AggregatedContextCell,
  ArchivedCell,
  ArchiveHeader,
  LocalDateCell,
  LocalTimeCell,
  MetricCell,
  PercentCell,
  ShortTextCell,
  TextCell
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  archivedFilterFn,
  fuzzyTextFilterFn,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { PagingControlsProps } from "../tables/types";
import EconomyTableControls from "./EconomyTableControls";
import { txnSearchFilterFn } from "./filters";
import { EconomyTableRow } from "./rows";
import {
  EconomyTableControlsProps,
  EconomyTableProps,
  EconomyTableState,
  TransactionData
} from "./types";

function dateStart(values: number[]): number {
  return startOfDay(values?.[0] ?? NaN).getTime();
}

export default function EconomyTable({
  data,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  archiveCallback
}: EconomyTableProps): JSX.Element {
  const defaultColumn = React.useMemo(
    () => ({
      disableFilters: true,
      disableGroupBy: true
    }),
    []
  );
  const columns: Column<TransactionData>[] = React.useMemo(
    () => [
      { id: "txnId", accessor: "id" },
      { accessor: "id" },
      { accessor: "date" },
      {
        Header: "Days Ago",
        accessor: "daysAgo",
        Cell: MetricCell,
        disableFilters: false,
        disableGroupBy: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        mayToggle: true
      },
      {
        Header: "Time",
        accessor: "timestamp",
        Cell: LocalTimeCell,
        aggregate: dateStart,
        Aggregated: LocalDateCell,
        sortDescFirst: true,
        defaultVisible: true,
        gridWidth: "150px"
      },
      {
        Header: "Raw",
        accessor: "originalContext",
        disableSortBy: true,
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: TextCell,
        aggregate: "count",
        Aggregated: AggregatedContextCell,
        gridWidth: "400px",
        defaultVisible: true,
        mayToggle: true
      },
      {
        Header: "Type",
        accessor: "prettyContext",
        disableSortBy: true,
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: ShortTextCell,
        gridWidth: "200px",
        defaultVisible: true,
        mayToggle: true
      },
      {
        Header: "Context",
        accessor: "fullContext",
        disableSortBy: true,
        disableFilters: false,
        filter: "fuzzyText",
        Filter: TextBoxFilter,
        Cell: TextCell,
        aggregate: "count",
        Aggregated: AggregatedContextCell,
        gridWidth: "400px",
        defaultVisible: true,
        mayToggle: true
      },
      { accessor: "trackDiff" },
      { accessor: "trackLevelDelta" },
      { accessor: "delta" },
      {
        Header: "Cards",
        accessor: "cardsAddedCount",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Skins",
        accessor: "artSkinsAddedCount",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Wildcards",
        accessor: "wcDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Common WC",
        accessor: "wcCommonDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Uncommon WC",
        accessor: "wcUncommonDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Rare WC",
        accessor: "wcRareDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Mythic WC",
        accessor: "wcMythicDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Boosters",
        accessor: "boosterDeltaCount",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Vault",
        accessor: "vaultProgressDelta",
        Cell: PercentCell,
        percentFormatOptions: vaultPercentFormat,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "aetherizedCards" },
      {
        Header: "Duplicates",
        accessor: "aetherizedCardsCount",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      {
        Header: "Gold",
        accessor: "goldDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true,
        defaultVisible: true
      },
      {
        Header: "Gems",
        accessor: "gemsDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "xpGained" },
      {
        Header: "Experience",
        accessor: "xpGainedNumber",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true,
        defaultVisible: true
      },
      { accessor: "orbCountDiff" },
      {
        Header: "Orbs",
        accessor: "orbDelta",
        Cell: MetricCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between",
        aggregate: "sum",
        mayToggle: true
      },
      { accessor: "custom" },
      { accessor: "archived" },
      {
        id: "archivedCol",
        Header: ArchiveHeader,
        accessor: "archivedSortVal",
        disableSortBy: true,
        filter: "showArchived",
        Filter: ArchiveColumnFilter,
        disableFilters: false,
        Cell: ArchivedCell,
        sortType: "basic",
        gridWidth: "100px",
        mayToggle: true,
        defaultVisible: true
      }
    ],
    []
  );
  const filterTypes = React.useMemo(
    () => ({
      fuzzyText: fuzzyTextFilterFn,
      showArchived: archivedFilterFn
    }),
    []
  );
  const initialState: EconomyTableState = React.useMemo(() => {
    // default hidden columns
    const hiddenColumns = columns
      .filter(column => !column.defaultVisible)
      .map(column => column.id ?? column.accessor);
    const state = _.defaultsDeep(cachedState, {
      hiddenColumns,
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      groupBy: ["daysAgo"],
      sortBy: [{ id: "timestamp", desc: true }],
      pageSize: 3
    });
    // ensure data-only columns are all invisible
    for (const column of columns) {
      if (!column.defaultVisible && !column.mayToggle) {
        state.hiddenColumns.push(column.id ?? column.accessor);
      }
    }
    return state;
  }, [cachedState, columns]);

  const {
    flatColumns,
    headers,
    getTableProps,
    getTableBodyProps,
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
  } = useTable(
    {
      columns,
      data: React.useMemo(() => data, [data]),
      defaultColumn,
      filterTypes,
      globalFilter: txnSearchFilterFn,
      initialState,
      autoResetFilters: false,
      autoResetGlobalFilter: false,
      autoResetSortBy: false,
      archiveCallback,
      countLabel: "transactions"
    },
    useFilters,
    useGlobalFilter,
    useGroupBy,
    useExpanded,
    useSortBy,
    usePagination
  );
  const { filters, globalFilter, pageIndex, pageSize } = state;
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  const [isExpanded, setExpanded] = React.useState(true);

  React.useEffect(() => {
    tableStateCallback({ ...state, economyTableMode: tableMode });
  }, [state, tableMode, tableStateCallback]);

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
    pageSize,
    pageSizeOptions: ["3", "7", "21"]
  };

  const visibleHeaders = headers.filter(header => header.isVisible);
  const gridTemplateColumns = visibleHeaders
    .map(header => header.gridWidth ?? "1fr")
    .join(" ");

  const tableControlsProps: EconomyTableControlsProps = {
    canNextPage,
    canPreviousPage,
    filters,
    flatColumns,
    getTableProps,
    globalFilter,
    gotoPage,
    gridTemplateColumns,
    isExpanded,
    nextPage,
    pageCount,
    pageIndex,
    pageOptions,
    pageSize,
    preGlobalFilteredRows,
    previousPage,
    setExpanded,
    setAllFilters,
    setFilter,
    setGlobalFilter,
    setPageSize,
    setTableMode,
    tableMode,
    toggleHideColumn,
    toggleSortBy,
    visibleHeaders,
    pageSizeOptions: ["3", "7", "21"]
  };

  return (
    <div className="economy_table_wrap" style={{ marginTop: "12px" }}>
      <EconomyTableControls {...tableControlsProps} />
      <div className="economy_table_body" {...getTableBodyProps()}>
        {page.map((groupRow, groupIndex) => {
          prepareRow(groupRow);
          const economyRowProps = {
            row: groupRow,
            gridTemplateColumns,
            tableMode,
            prepareRow,
            isExpanded
          };
          return (
            <EconomyTableRow
              key={groupIndex}
              index={groupIndex}
              {...economyRowProps}
            />
          );
        })}
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}
