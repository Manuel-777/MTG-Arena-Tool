import _ from "lodash";
import React, { useState } from "react";
import styled from "styled-components";

import FilterPanel from "../../FilterPanel";
import {
  ArtTileHeader,
  ArtTileCell,
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
  ArchivedCell
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

const ReactTable = require("react-table"); // no @types package for current rc yet

const StyledDecksTable = styled.div`
  table {
    padding: 16px;
    tr {
      white-space: nowrap;
      height: 64px;
      background-color: rgba(0, 0, 0, 0);
      -webkit-transition: all 0.2s ease-in;
    }
    th,
    td {
      color: var(--color-light);
      text-align: right;
      white-space: nowrap;
      padding-right: 16px;
      :last-child {
        padding-right: 0;
      }
    }
    th:hover {
      background-color: rgba(0, 0, 0, 0.25);
      cursor: pointer;
    }
    th.alignLeft,
    td.alignLeft {
      text-align: left;
    }
  }
`;

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
        Header: ArtTileHeader,
        accessor: "deckTileId",
        disableFilters: false,
        filter: "uberSearch",
        Filter: TextBoxFilter,
        minWidth: 200,
        disableSortBy: true,
        Cell: CellWrapper(ArtTileCell)
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
      sortBy: [{ id: "timeTouched", desc: true }]
    });
    if (!state.hiddenColumns.includes("archived")) {
      state.hiddenColumns.push("archived");
    }
    return state;
  }, [cachedState]);

  const {
    flatColumns,
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    toggleSortBy,
    toggleHideColumn,
    setAllFilters,
    setFilter
  } = ReactTable.useTable(
    {
      columns,
      data: React.useMemo(() => data, [data]),
      useControlledState: (state: DecksTableState) => {
        return React.useMemo(() => {
          tableStateCallback(state);
          return state;
        }, [state, tableStateCallback]);
      },
      defaultColumn,
      filterTypes,
      initialState,
      autoResetFilters: false,
      autoResetSortBy: false
    },
    ReactTable.useFilters,
    ReactTable.useSortBy
  );

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
  for (const column of flatColumns) {
    if (column.canFilter) {
      initialFiltersVisible[column.id] = false;
    }
  }
  initialFiltersVisible["deckTileId"] = true; // uber search always visible
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

  const isLeftAlignCol = (id: string): boolean =>
    ["deckTileId", "name", "tags"].includes(id);

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

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          color: "var(--color-light)",
          padding: "16px",
          paddingBottom: 0,
          cursor: "pointer",
          alignItems: "center"
        }}
      >
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
            setFiltersVisible({ ...initialFiltersVisible, boosterCost: true });
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
        {togglesVisible &&
          toggleableColumns.map((column: any) => (
            <StyledCheckboxContainer key={column.id}>
              {column.render("Header")}
              <input type="checkbox" {...column.getToggleHiddenProps()} />
              <span className={"checkmark"} />
            </StyledCheckboxContainer>
          ))}
      </div>
      <StyledDecksTable>
        <table {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup: any, index: number) => (
              <tr {...headerGroup.getHeaderGroupProps()} key={index}>
                {headerGroup.headers.map((column: any) => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className={"hover_label"}
                    key={column.id}
                    style={
                      column.minWidth
                        ? { minWidth: column.minWidth + "px" }
                        : undefined
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: isLeftAlignCol(column.id)
                          ? "flex-start"
                          : "flex-end"
                      }}
                    >
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
                      <div className={"flex_item"}>
                        {column.render("Header")}
                      </div>
                      {column.canFilter && column.id !== "deckTileId" && (
                        <div className={"flex_item"}>
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
                        </div>
                      )}
                      {column.filterValue && column.id !== "deckTileId" && (
                        <div className={"flex_item"}>
                          <div
                            style={{ marginRight: 0 }}
                            className={"button close"}
                            onClick={(e): void => {
                              e.stopPropagation();
                              setFilter(column.id, undefined);
                            }}
                            title={"clear column filter"}
                          />
                        </div>
                      )}
                    </div>
                    {column.canFilter && filtersVisible[column.id] && (
                      <div
                        onClick={(e): void => e.stopPropagation()}
                        style={{
                          paddingTop: "4px",
                          display: "flex",
                          justifyContent: isLeftAlignCol(column.id)
                            ? "flex-start"
                            : "flex-end"
                        }}
                        title={"filter column"}
                      >
                        <div
                          className={"flex_item"}
                          style={{
                            width:
                              column.filterValue && column.id === "deckTileId"
                                ? "calc(100% - 34px)"
                                : "100%",
                            flexWrap: "wrap",
                            marginRight: "4px"
                          }}
                        >
                          {column.render("Filter")}
                        </div>
                        {column.filterValue && column.id === "deckTileId" && (
                          <div className={"flex_item"}>
                            <div
                              style={{ marginRight: 0 }}
                              className={"button close"}
                              onClick={(e): void => {
                                e.stopPropagation();
                                setFilter(column.id, undefined);
                              }}
                              title={"clear search"}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row: any) => {
              prepareRow(row);
              return (
                <RowContainer
                  openDeckCallback={openDeckCallback}
                  row={row}
                  key={row.index}
                />
              );
            })}
          </tbody>
        </table>
      </StyledDecksTable>
    </>
  );
}

const StyledTableRow = styled.tr`
  &:hover {
    background-color: rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }
`;

function RowContainer({
  row,
  openDeckCallback
}: {
  row: any;
  openDeckCallback: (id: string) => void;
}): JSX.Element {
  const [hover, setHover] = React.useState(false);

  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);

  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);

  const mouseClick = React.useCallback(() => {
    openDeckCallback(row.values.deckId);
  }, []);

  return (
    <StyledTableRow
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      onClick={mouseClick}
    >
      {row.cells.map((cell: any) => {
        cell.hover = hover;
        return (
          <td
            {...cell.getCellProps()}
            key={cell.column.id + "_" + row.index}
            title={`show ${row.values.name} details`}
          >
            {cell.render("Cell")}
          </td>
        );
      })}
    </StyledTableRow>
  );
}
