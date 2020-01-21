import React from "react";
import { Column } from "react-table";
import { EVENTS_TABLE_MODE } from "../../../shared/constants";
import {
  ArchivedCell,
  ArchiveHeader,
  ColorsCell,
  DurationCell,
  FormatCell,
  MetricCell,
  RelativeTimeCell,
  ShortTextCell,
  TextCell
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  ColorColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import { useBaseReactTable } from "../tables/hooks";
import PagingControls from "../tables/PagingControls";
import { TableViewRow } from "../tables/TableViewRow";
import { BaseTableProps } from "../tables/types";
import EventsListViewRow from "./EventsListViewRow";
import EventsTableControls from "./EventsTableControls";
import { eventSearchFilterFn } from "./filters";
import {
  EventsTableControlsProps,
  EventsTableProps,
  EventTableData
} from "./types";
import TableHeaders from "../tables/TableHeaders";

const columns: Column<EventTableData>[] = [
  { accessor: "id" },
  { accessor: "date" },
  {
    Header: "Date",
    accessor: "timestamp",
    Cell: RelativeTimeCell,
    sortDescFirst: true,
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Code",
    accessor: "InternalEventName",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: ShortTextCell,
    gridWidth: "200px",
    mayToggle: true
  },
  {
    Header: "Event",
    accessor: "displayName",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: ShortTextCell,
    gridWidth: "200px",
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Format",
    accessor: "format",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: FormatCell,
    gridWidth: "150px",
    mayToggle: true
  },
  { accessor: "CourseDeck" },
  { accessor: "deckId" },
  {
    Header: "Deck",
    accessor: "deckName",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: ShortTextCell,
    gridWidth: "200px",
    mayToggle: true,
    defaultVisible: true
  },
  { accessor: "colors" },
  {
    Header: "Colors",
    disableFilters: false,
    accessor: "colorSortVal",
    Filter: ColorColumnFilter,
    filter: "colors",
    Cell: ColorsCell,
    gridWidth: "150px",
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Duration",
    accessor: "duration",
    Cell: DurationCell,
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Won",
    accessor: "wins",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Lost",
    accessor: "losses",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true,
    defaultVisible: true
  },
  {
    Header: "Games Won",
    accessor: "gameWins",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true
  },
  {
    Header: "Games Lost",
    accessor: "gameLosses",
    Cell: MetricCell,
    disableFilters: false,
    Filter: NumberRangeColumnFilter,
    filter: "between",
    mayToggle: true
  },
  { accessor: "isMissingMatchData" },
  { accessor: "CurrentEventState" },
  {
    Header: "State",
    accessor: "eventState",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: TextCell,
    mayToggle: true
  },
  { accessor: "custom" },
  { accessor: "archived" },
  {
    id: "archivedCol",
    Header: ArchiveHeader,
    accessor: "archivedSortVal",
    filter: "showArchived",
    Filter: ArchiveColumnFilter,
    disableFilters: false,
    Cell: ArchivedCell,
    gridWidth: "110px",
    sortType: "basic",
    mayToggle: true
  }
];

export default function EventsTable({
  data,
  aggFilters,
  events,
  setAggFiltersCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
  filterDataCallback,
  editTagCallback
}: EventsTableProps): JSX.Element {
  const [tableMode, setTableMode] = React.useState(cachedTableMode);
  React.useEffect(() => tableModeCallback(tableMode), [
    tableMode,
    tableModeCallback
  ]);
  const tableProps: BaseTableProps<EventTableData> = {
    cachedState,
    columns,
    customProps: { editTagCallback },
    data,
    defaultState: {
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      sortBy: [{ id: "timestamp", desc: true }]
    },
    filterDataCallback,
    globalFilter: eventSearchFilterFn,
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
  const eventsTableControlsProps: EventsTableControlsProps = {
    aggFilters,
    events,
    setAggFiltersCallback,
    ...tableControlsProps
  };
  const isTableMode = tableMode === EVENTS_TABLE_MODE;
  return (
    <div className="react_table_wrap">
      <EventsTableControls {...eventsTableControlsProps} />
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
          {page.map((row, index) => {
            prepareRow(row);
            if (tableMode === EVENTS_TABLE_MODE) {
              return (
                <TableViewRow
                  row={row}
                  index={index}
                  key={row.index}
                  gridTemplateColumns={gridTemplateColumns}
                />
              );
            }
            return (
              <EventsListViewRow
                row={row}
                index={index}
                key={row.index}
                gridTemplateColumns={gridTemplateColumns}
              />
            );
          })}
        </div>
      </div>
      <PagingControls {...pagingProps} />
    </div>
  );
}
