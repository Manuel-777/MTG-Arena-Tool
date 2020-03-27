import startOfDay from "date-fns/startOfDay";
import React from "react";
import { Column, useExpanded, useGroupBy, useSortBy } from "react-table";
import { EVENTS_TABLE_MODE } from "../../../shared/constants";
import {
  AggregatedContextCell,
  ArchivedCell,
  ArchiveHeader,
  LocalDateCell,
  LocalTimeCell,
  MetricCell,
  PercentCell,
  TextCell
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { BaseTableProps } from "../tables/types";
import { useBaseReactTable } from "../tables/useBaseReactTable";
import EconomyTableControls from "./EconomyTableControls";
import { vaultPercentFormat } from "./economyUtils";
import { txnSearchFilterFn } from "./filters";
import { EconomyTableRow } from "./rows";
import {
  EconomyTableControlsProps,
  EconomyTableProps,
  TransactionData
} from "./types";

function dateStart(values: number[]): number {
  return startOfDay(values?.[0] ?? NaN).getTime();
}

const columns: Column<TransactionData>[] = [
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
    gridWidth: "170px"
  },
  {
    Header: "Code",
    accessor: "originalContext",
    disableSortBy: true,
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: TextCell,
    aggregate: "count",
    Aggregated: AggregatedContextCell,
    gridWidth: "400px",
    mayToggle: true
  },
  { accessor: "prettyContext" },
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
    Header: "Cosmetics",
    accessor: "vanityAddedCount",
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
    Header: "Draft Tokens",
    accessor: "draftTokensDelta",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    aggregate: "sum",
    mayToggle: true
  },
  {
    Header: "Sealed Tokens",
    accessor: "sealedTokensDelta",
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
    gridWidth: "110px",
    sortType: "basic",
    mayToggle: true
  }
];

export default function EconomyTable({
  data,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  archiveCallback
}: EconomyTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  React.useEffect(() => tableModeCallback(tableMode), [
    tableMode,
    tableModeCallback
  ]);
  const tableProps: BaseTableProps<TransactionData> = {
    cachedState,
    columns,
    customProps: { archiveCallback, countLabel: "transactions" },
    customHooks: [useGroupBy, useSortBy, useExpanded],
    data,
    defaultState: {
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      groupBy: ["daysAgo"],
      sortBy: [{ id: "timestamp", desc: true }],
      pageSize: 3
    },
    globalFilter: txnSearchFilterFn,
    setTableMode,
    tableMode,
    tableStateCallback
  };
  const {
    table,
    gridTemplateColumns,
    headersProps,
    pagingProps,
    tableControlsProps
  } = useBaseReactTable(tableProps);
  const { getTableBodyProps, page, prepareRow } = table;
  const pageSizeOptions = ["3", "7", "21"];
  const pageLabel = "days";
  pagingProps.pageSizeOptions = pageSizeOptions;
  pagingProps.pageLabel = pageLabel;
  const [isExpanded, setExpanded] = React.useState(true);
  const economyTableControlsProps: EconomyTableControlsProps = {
    isExpanded,
    setExpanded,
    ...tableControlsProps
  };
  const isTableMode = tableMode === EVENTS_TABLE_MODE;
  return (
    <div className="wrapper_column">
      <div className="react_table_wrap">
        <EconomyTableControls {...economyTableControlsProps} />
        <div
          className="med_scroll"
          style={isTableMode ? { overflowX: "auto" } : undefined}
        >
          <TableHeaders
            {...headersProps}
            style={
              isTableMode
                ? { width: "fit-content" }
                : { overflowX: "auto", overflowY: "hidden" }
            }
          />
          <div
            className={
              isTableMode ? "react_table_body" : "react_table_body_no_adjust"
            }
            {...getTableBodyProps()}
          >
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
        </div>
        <PagingControls {...pagingProps} />
      </div>
    </div>
  );
}
