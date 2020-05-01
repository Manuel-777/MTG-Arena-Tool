import _ from "lodash";
import React, { useCallback } from "react";
import { Column, Row } from "react-table";
import {
  EVENTS_TABLE_MODE,
  IPC_ALL,
  IPC_RENDERER
} from "../../../shared/constants";
import Aggregator, { AggregatorFilters } from "../../aggregator";
import { toggleArchived } from "../../rendererUtil";
import { ListItemEvent } from "../list-item/ListItemEvent";
import MatchResultsStatsPanel from "../misc/MatchResultsStatsPanel";
import {
  ArchivedCell,
  ArchiveHeader,
  ColorsCell,
  DurationCell,
  FormatCell,
  MetricCell,
  RelativeTimeCell,
  ShortTextCell,
  SubTextCell,
  TextCell
} from "../tables/cells";
import {
  ArchiveColumnFilter,
  ColorColumnFilter,
  NumberRangeColumnFilter,
  TextBoxFilter
} from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { TableViewRow } from "../tables/TableViewRow";
import { BaseTableProps } from "../tables/types";
import { useAggregatorArchiveFilter } from "../tables/useAggregatorArchiveFilter";
import { useBaseReactTable } from "../tables/useBaseReactTable";
import EventsTableControls from "./EventsTableControls";
import { eventSearchFilterFn } from "./filters";
import {
  EventsTableControlsProps,
  EventsTableProps,
  EventTableData
} from "./types";
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import useResize from "../../hooks/useResize";
import { animated } from "react-spring";
import { reduxAction } from "../../../shared-redux/sharedRedux";

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
    Cell: SubTextCell,
    gridWidth: "210px",
    mayToggle: true
  },
  {
    Header: "Event",
    accessor: "displayName",
    disableFilters: false,
    filter: "fuzzyText",
    Filter: TextBoxFilter,
    Cell: ShortTextCell,
    gridWidth: "210px",
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
    Cell: SubTextCell,
    gridWidth: "210px",
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

function getDataAggFilters(data: Row<EventTableData>[]): AggregatorFilters {
  const matchIds = _.flatten(data.map(row => row.original.stats.matchIds));
  return { matchIds };
}

export default function EventsTable({
  data,
  aggFilters,
  events,
  setAggFiltersCallback,
  tableModeCallback,
  tableStateCallback,
  cachedState,
  cachedTableMode,
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
    customProps: { archiveCallback: toggleArchived, editTagCallback },
    data,
    defaultState: {
      filters: [{ id: "archivedCol", value: "hideArchived" }],
      sortBy: [{ id: "timestamp", desc: true }]
    },
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
  useAggregatorArchiveFilter(table, aggFilters, setAggFiltersCallback);
  const { getTableBodyProps, page, prepareRow, rows } = table;
  const eventsTableControlsProps: EventsTableControlsProps = {
    aggFilters,
    events,
    setAggFiltersCallback,
    ...tableControlsProps
  };
  const isTableMode = tableMode === EVENTS_TABLE_MODE;
  const panelWidth = useSelector(
    (state: AppState) => state.settings.right_panel_width
  );
  const dispatcher = useDispatch();
  const finishResize = useCallback(
    (newWidth: number) => {
      reduxAction(
        dispatcher,
        "SET_SETTINGS",
        { right_panel_width: newWidth },
        IPC_ALL ^ IPC_RENDERER
      );
    },
    [dispatcher]
  );
  const [width, bind] = useResize(panelWidth, finishResize);

  return (
    <>
      <div className={"wrapper_column"}>
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
                  <ListItemEvent
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
      </div>
      <animated.div {...bind()} className={"sidebar-dragger"}></animated.div>
      <animated.div
        className={"sidebar-main"}
        style={{ width, minWidth: width, maxWidth: width }}
      >
        <MatchResultsStatsPanel
          prefixId={"events_top"}
          aggregator={
            new Aggregator({ ...aggFilters, ...getDataAggFilters(rows) })
          }
          showCharts
        />
      </animated.div>
    </>
  );
}
