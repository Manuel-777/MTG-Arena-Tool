import _ from "lodash";
import React, { useState } from "react";
import styled from "styled-components";

import FilterPanel from "../../FilterPanel";
import {
  ArtTileHeader,
  ArtTileCell,
  TextBoxFilter,
  NameCell,
  ColorColumnFilter,
  ColorsCell,
  DurationCell,
  FormatCell,
  TagsCell,
  DatetimeCell,
  MetricCell,
  NumberRangeColumnFilter,
  WinRateCell,
  LastEditWinRateCell,
  MissingCardsCell,
  ArchiveHeader,
  ArchiveColumnFilter,
  ArchivedCell,
  fuzzyTextFilterFn,
  archivedFilterFn,
  colorsFilterFn,
  MetricText,
  CellProps,
  uberSearchFilterFn,
  StyledCheckboxContainer,
  ColorsHeader
} from "./DecksTableComponents";
import { SerializedDeck } from "../../../shared/types/Deck";

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

export interface DeckStats {
  wins: number;
  losses: number;
  total: number;
  duration: number;
  winrate: number;
  interval: number;
  winrateLow: number;
  winrateHigh: number;
}

export interface MissingWildcards {
  rare: number;
  common: number;
  uncommon: number;
  mythic: number;
}

export interface DecksData extends SerializedDeck, DeckStats, MissingWildcards {
  avgDuration: number;
  boosterCost: number;
  colorSortVal: string;
  lastPlayed: Date;
  lastTouched: Date;
  lastEditWins: number;
  lastEditLosses: number;
  lastEditTotal: number;
  lastEditWinrate: number;
}

export interface DecksTableProps {
  data: DecksData[];
  filters: any;
  filterMatchesCallback: (filters: any) => void;
  openDeckCallback: (id: string) => void;
  archiveDeckCallback: (id: string) => void;
  tagDeckCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
  tableStateCallback: (state: any) => void;
  cachedState: any;
}

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
        Header: ColorsHeader,
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
        id: "lastUpdated",
        accessor: (row: any): Date => new Date(row.lastUpdated),
        Cell: DatetimeCell,
        sortType: "datetime",
        sortDescFirst: true
      },
      {
        Header: "Last Played",
        accessor: "lastPlayed",
        Cell: DatetimeCell,
        sortType: "datetime",
        sortDescFirst: true
      },
      {
        Header: "Last Touched",
        accessor: "lastTouched",
        Cell: DatetimeCell,
        sortType: "datetime",
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
        accessor: "winrate",
        Cell: WinRateCell,
        disableFilters: false,
        Filter: NumberRangeColumnFilter,
        filter: "between"
      },
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
        Cell: MissingCardsCell
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
  const initialState = _.defaultsDeep(cachedState, {
    hiddenColumns: [
      "deckId",
      "custom",
      "boosterCost",
      "colors",
      "lastEditLosses",
      "lastEditTotal",
      "lastEditWinrate",
      "lastEditWins",
      "lastPlayed",
      "lastUpdated",
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
      "winrateLow",
      "winrateHigh"
    ],
    autoResetFilters: false, // will not "work" until entire page is React-controlled
    filters: { archived: "hideArchived" },
    autoResetSortBy: false, // will not "work" until entire page is React-controlled
    sortBy: [{ id: "lastTouched", desc: true }]
  });

  const {
    flatColumns,
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = ReactTable.useTable(
    {
      columns,
      data: React.useMemo(() => data, [data]),
      useControlledState: (state: any) => {
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
      initialState
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
    "lastPlayed",
    "lastUpdated",
    "lastTouched",
    "losses",
    "tags",
    "total",
    "winrate",
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
        <MetricText
          onClick={(): void => setTogglesVisible(!togglesVisible)}
          className="button_simple"
          style={{ margin: "0 0 5px 0" }}
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
                    className={
                      ["deckTileId", "name", "tags"].includes(column.id)
                        ? "alignLeft"
                        : ""
                    }
                    key={column.id}
                  >
                    <div>
                      {column.render("Header")}
                      {column.canFilter && column.id !== "deckTileId" && (
                        <span
                          onClick={(e): void => {
                            e.stopPropagation();
                            setFiltersVisible({
                              ...filtersVisible,
                              [column.id]: !filtersVisible[column.id]
                            });
                          }}
                          style={{ opacity: column.filterValue ? 1 : 0.4 }}
                          title={"show column filter"}
                        >
                          {" 🔩"}
                        </span>
                      )}
                      <span>
                        {column.isSorted
                          ? column.isSortedDesc
                            ? " 🔽"
                            : " 🔼"
                          : ""}
                      </span>
                    </div>
                    {filtersVisible[column.id] && (
                      <div
                        onClick={(e): void => e.stopPropagation()}
                        style={{ paddingTop: "4px", width: "100%" }}
                      >
                        {column.canFilter ? column.render("Filter") : null}
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
