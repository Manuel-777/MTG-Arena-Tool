/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from "lodash";
import React, { useState } from "react";
import styled from "styled-components";
import { CSSTransition } from "react-transition-group";

import { getCardArtCrop } from "../../../shared/util";
import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { TABLE_MODES, TABLE_MODE } from "../../../shared/constants";

import FilterPanel from "../../FilterPanel";
import {
  NameCell,
  ColorsCell,
  FormatCell,
  TagsCell,
  DurationCell,
  DatetimeCell,
  MetricCell,
  MetricText,
  WinRateCell,
  LastEditWinRateCell,
  MissingCardsCell,
  ArchiveHeader,
  ArchivedCell,
  StyledArtTileCell
} from "./cells";
import {
  StyledCheckboxContainer,
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

const ReactTable = require("react-table"); // no @types package for current rc yet

const PresetButton = styled(MetricText).attrs(props => ({
  className: (props.className ?? "") + " button_simple"
}))`
  margin: 0 4px 5px 4px;
  width: 90px;
`;

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
      {
        accessor: "deckTileId",
        disableFilters: false,
        filter: "uberSearch",
        Filter: TextBoxFilter
      },
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
      colors: colorsFilterFn,
      uberSearch: uberSearchFilterFn
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
  const [tableMode, setTableMode] = useState(cachedTableMode);

  const {
    flatColumns,
    headers,
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    page,
    prepareRow,
    toggleSortBy,
    toggleHideColumn,
    setAllFilters,
    setFilter,
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
      initialState,
      autoResetFilters: false,
      autoResetSortBy: false,
      autoResetPage: false
    },
    ReactTable.useFilters,
    ReactTable.useSortBy,
    ReactTable.usePagination
  );
  const { pageIndex, pageSize } = state;

  React.useEffect(() => {
    tableStateCallback({ ...state, decksTableMode: tableMode });
  }, [state, tableMode, tableStateCallback]);
  React.useEffect(() => {
    filterDecksCallback(rows.map((row: any) => row.values.deckId));
  }, [filterDecksCallback, rows]);

  const toggleableIds = [
    "name",
    "format",
    "colorSortVal",
    "duration",
    "avgDuration",
    "boosterCost",
    "lastEditWinrate",
    "timePlayed",
    "timeUpdated",
    "timeTouched",
    "losses",
    "tags",
    "total",
    "winrate100",
    "wins",
    "archivedCol"
  ];

  const toggleableColumns = flatColumns.filter((column: any) =>
    toggleableIds.includes(column.id)
  );

  const initialFiltersVisible: { [key: string]: boolean } = {};
  let deckTileColumn: any;
  for (const column of flatColumns) {
    if (column.id === "deckTileId") {
      deckTileColumn = column;
      initialFiltersVisible[column.id] = true; // uber search always visible
    } else if (column.canFilter) {
      initialFiltersVisible[column.id] = false;
    }
  }
  const [filtersVisible, setFiltersVisible] = useState(initialFiltersVisible);
  const [togglesVisible, setTogglesVisible] = useState(false);
  const filterPanel = new FilterPanel(
    "decks_top",
    filterMatchesCallback,
    filters,
    [],
    [],
    [],
    false,
    [],
    false,
    null,
    false,
    false
  );

  const recentFilters = (): { id: string; value: any }[] => [
    { id: "archivedCol", value: "hideArchived" }
  ];
  const bestFilters = (): { id: string; value: any }[] => [
    { id: "archivedCol", value: "hideArchived" },
    { id: "wins", value: [5, undefined] },
    { id: "winrate100", value: [50, undefined] }
  ];
  const wantedFilters = (): { id: string; value: any }[] => [
    { id: "archivedCol", value: "hideArchived" },
    { id: "boosterCost", value: [1, undefined] }
  ];

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

  return (
    <div className="decks_table_wrap">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          color: "var(--color-light)",
          paddingBottom: "8px"
        }}
      >
        <div className="decks_table_toggles">
          <span style={{ paddingBottom: "8px" }}>Filter match results:</span>
          <span style={{ width: "260px" }}>{filterPanel.render()}</span>
          <span style={{ paddingBottom: "8px" }}>Presets:</span>
          <PresetButton
            onClick={(): void => {
              setAllFilters(recentFilters);
              setFiltersVisible(initialFiltersVisible);
              toggleSortBy("timeTouched", true);
              for (const columnId of toggleableIds) {
                const isVisible = [
                  "name",
                  "format",
                  "colorSortVal",
                  "timeTouched",
                  "lastEditWinrate"
                ].includes(columnId);
                toggleHideColumn(columnId, !isVisible);
              }
            }}
          >
            Recent
          </PresetButton>
          <PresetButton
            onClick={(): void => {
              setAllFilters(bestFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                wins: true,
                winrate100: true
              });
              toggleSortBy("winrate100", true);
              for (const columnId of toggleableIds) {
                const isVisible = [
                  "name",
                  "format",
                  "colorSortVal",
                  "losses",
                  "winrate100",
                  "wins"
                ].includes(columnId);
                toggleHideColumn(columnId, !isVisible);
              }
            }}
          >
            Best
          </PresetButton>
          <PresetButton
            onClick={(): void => {
              setAllFilters(wantedFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                boosterCost: true
              });
              toggleSortBy("boosterCost", true);
              for (const columnId of toggleableIds) {
                const isVisible = [
                  "name",
                  "format",
                  "colorSortVal",
                  "boosterCost",
                  "timeUpdated"
                ].includes(columnId);
                toggleHideColumn(columnId, !isVisible);
              }
            }}
          >
            Wanted
          </PresetButton>
          <MetricText
            onClick={(): void => setTogglesVisible(!togglesVisible)}
            className="button_simple"
            style={{ margin: "0 0 5px 12px" }}
          >
            {togglesVisible ? "Hide" : "Show"} Column Toggles
          </MetricText>
        </div>
        <div className="decks_table_toggles">
          {togglesVisible &&
            toggleableColumns.map((column: any) => (
              <StyledCheckboxContainer key={column.id}>
                {column.render("Header")}
                <input type="checkbox" {...column.getToggleHiddenProps()} />
                <span className={"checkmark"} />
              </StyledCheckboxContainer>
            ))}
        </div>
        <div className="decks_table_search_cont">
          <WrappedReactSelect
            current={tableMode}
            options={TABLE_MODES}
            callback={setTableMode}
            className={"decks_table_mode"}
          />
          {deckTileColumn.render("Filter")}
          {deckTileColumn.filterValue && (
            <div
              style={{ marginRight: 0, minWidth: "24px" }}
              className={"button close"}
              onClick={(e): void => {
                e.stopPropagation();
                setFilter(deckTileColumn.id, undefined);
              }}
              title={"clear column filter"}
            />
          )}
          <PagingControls {...pagingProps} />
        </div>
      </div>
      <div
        className="decks_table_head line_dark"
        style={{
          gridTemplateColumns: `200px 150px 150px ${"1fr ".repeat(
            headerGroups[0].headers ? headerGroups[0].headers.length - 3 : 1
          )}`
        }}
        {...getTableProps()}
      >
        {headers
          .filter((header: any) => header.isVisible)
          .map((column: any, ii: number) => (
            <div
              {...column.getHeaderProps(column.getSortByToggleProps())}
              className={"hover_label"}
              style={{
                height: "64px",
                gridArea: `1 / ${ii + 1} / 1 / ${ii + 2}`
              }}
              key={column.id}
            >
              <div className={"decks_table_head_container"}>
                <div
                  className={
                    column.isSorted
                      ? column.isSortedDesc
                        ? " sort_desc"
                        : " sort_asc"
                      : ""
                  }
                  style={{ marginRight: "4px", width: "16px" }}
                />
                <div className={"flex_item"}>{column.render("Header")}</div>
                {column.canFilter && (
                  <div
                    style={{ marginRight: 0 }}
                    className={"button settings"}
                    onClick={(e): void => {
                      e.stopPropagation();
                      setFiltersVisible({
                        ...filtersVisible,
                        [column.id]: !filtersVisible[column.id]
                      });
                    }}
                    title={
                      (filtersVisible[column.id] ? "hide" : "show") +
                      " column filter"
                    }
                  />
                )}
                {column.filterValue && (
                  <div
                    style={{ marginRight: 0 }}
                    className={"button close"}
                    onClick={(e): void => {
                      e.stopPropagation();
                      setFilter(column.id, undefined);
                    }}
                    title={"clear column filter"}
                  />
                )}
              </div>
              {column.canFilter && filtersVisible[column.id] && (
                <div
                  onClick={(e): void => e.stopPropagation()}
                  style={{
                    display: "flex",
                    justifyContent: "center"
                  }}
                  title={"filter column"}
                >
                  {column.render("Filter")}
                </div>
              )}
            </div>
          ))}
      </div>
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

function TableViewRow({
  row,
  index,
  openDeckCallback
}: {
  row: any;
  index: number;
  openDeckCallback: (id: string) => void;
}): JSX.Element {
  const deckId = row.values.deckId;
  const mouseClick = React.useCallback(() => {
    openDeckCallback(deckId);
  }, [deckId]);
  return (
    <div
      className={
        "decks_table_body_row " + (index % 2 == 0 ? "line_light" : "line_dark")
      }
      style={{
        gridTemplateColumns: `200px 150px 150px ${"1fr ".repeat(
          row.cells.length - 3
        )}`
      }}
      onClick={mouseClick}
    >
      {row.cells.map((cell: any) => {
        return (
          <div
            className="inner_div"
            {...cell.getCellProps()}
            key={cell.column.id + "_" + row.index}
            title={`show ${row.values.name} details`}
          >
            {cell.render("Cell")}
          </div>
        );
      })}
    </div>
  );
}

function DeckTile({
  row,
  index,
  openDeckCallback
}: {
  row: any;
  index: number;
  openDeckCallback: (id: string) => void;
}): JSX.Element {
  const [hover, setHover] = React.useState(false);

  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);

  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);

  const deckId = row.values.deckId;
  const mouseClick = React.useCallback(() => {
    openDeckCallback(deckId);
  }, [deckId]);

  const requireLabelIds = [
    "duration",
    "avgDuration",
    "winrate100",
    "lastEditWinrate",
    "timePlayed",
    "timeUpdated",
    "timeTouched",
    "losses",
    "total",
    "wins"
  ];

  return (
    <div
      className={"decks_table_deck_tile"}
      title={`show ${row.values.name} details`}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      onClick={mouseClick}
    >
      <CSSTransition classNames="deckTileHover" in={!!hover} timeout={200}>
        <StyledArtTileCell url={getCardArtCrop(row.values["deckTileId"])} />
      </CSSTransition>
      {row.cells.map((cell: any) => {
        cell.hover = hover;
        return (
          <div
            className="inner_div"
            style={hover ? { backgroundColor: "rgba(0,0,0,0.4)" } : undefined}
            {...cell.getCellProps()}
            key={cell.column.id + "_" + row.index}
          >
            {requireLabelIds.includes(cell.column.id) && (
              <MetricText
                style={{
                  paddingRight: "8px",
                  fontSize: "small",
                  whiteSpace: "nowrap",
                  fontWeight: 300,
                  color: "var(--color-light-50)"
                }}
              >
                {cell.column.render("Header")}:
              </MetricText>
            )}
            {cell.render("Cell")}
          </div>
        );
      })}
      <div className="inner_div"> </div>
    </div>
  );
}
