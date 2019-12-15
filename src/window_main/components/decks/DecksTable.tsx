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
    tr:hover {
      background-color: rgba(0, 0, 0, 0.25);
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
      {
        Header: ArchiveHeader,
        accessor: "archived",
        filter: "showArchived",
        Filter: ArchiveColumnFilter,
        disableFilters: false,
        Cell: CellWrapper(ArchivedCell)
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
  const initialState: DecksTableState = React.useMemo(
    () =>
      _.defaultsDeep(cachedState, {
        hiddenColumns: [
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
        filters: { archived: "hideArchived" },
        sortBy: [{ id: "timeTouched", desc: true }]
      }),
    [cachedState]
  );

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
          const aggFilter = filters.showArchived;
          const tableFilter = state.filters.archived === "showArchived";
          if (aggFilter !== tableFilter) {
            filterMatchesCallback({ ...filters, showArchived: tableFilter });
          }
          return state;
        }, [state, tableStateCallback, filters, filterMatchesCallback]);
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
    "wins"
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
            setAllFilters({ archived: "hideArchived" });
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
            setAllFilters({
              archived: "hideArchived",
              wins: [5, undefined],
              winrate100: [50, undefined]
            });
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
            setAllFilters({
              archived: "hideArchived",
              boosterCost: [1, undefined]
            });
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
              {column.id === "colorSortVal"
                ? "Colors"
                : column.render("Header")}
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
                        className={"flex_item"}
                        style={{ marginRight: "4px" }}
                      >
                        {column.isSorted
                          ? column.isSortedDesc
                            ? "🔽"
                            : "🔼"
                          : ""}
                      </div>
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
                            onClick={(): void =>
                              setFilter(column.id, undefined)
                            }
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
                          width: "100%",
                          display: "flex",
                          justifyContent: isLeftAlignCol(column.id)
                            ? "flex-start"
                            : "flex-end"
                        }}
                        title={"filter column"}
                      >
                        <div className={"flex_item"}>
                          {column.render("Filter")}
                        </div>
                        {column.filterValue && column.id === "deckTileId" && (
                          <div className={"flex_item"}>
                            <div
                              style={{ marginRight: 0 }}
                              className={"button close"}
                              onClick={(): void =>
                                setFilter(column.id, undefined)
                              }
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
                <tr {...row.getRowProps()} key={row.index}>
                  {row.cells.map((cell: any) => {
                    return (
                      <td
                        {...cell.getCellProps()}
                        key={cell.column.id + "_" + row.index}
                      >
                        {cell.render("Cell")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </StyledDecksTable>
    </>
  );
}
