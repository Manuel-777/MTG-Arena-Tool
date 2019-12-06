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
  fuzzyTextArrayFilterFn,
  archivedFilterFn,
  colorsFilterFn,
  MetricText
} from "./DecksTableComponents";

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

export interface DecksTableProps {
  data: any;
  filters: any;
  filterMatchesCallback: any;
  openDeckCallback: any;
  archiveDeckCallback: any;
  tagDeckCallback: any;
  editTagCallback: any;
  deleteTagCallback: any;
}

export default function DecksTable({
  data,
  filters,
  filterMatchesCallback,
  ...cellCallbacks
}: DecksTableProps): JSX.Element {
  const CellWrapper = (
    component: (props: any) => JSX.Element
  ): ((props: any) => JSX.Element) => {
    return (props: any): JSX.Element =>
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
        filter: "fuzzyTextArray",
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
      { accessor: "duration" }, // TODO
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
      // Add a new fuzzyTextFilterFn filter type.
      fuzzyText: fuzzyTextFilterFn,
      fuzzyTextArray: fuzzyTextArrayFilterFn,
      showArchived: archivedFilterFn,
      colors: colorsFilterFn
    }),
    []
  );

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
      defaultColumn,
      filterTypes,
      initialState: {
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
          "interval",
          "winrateLow",
          "winrateHigh"
        ],
        filters: { archived: "false" },
        sortBy: [{ id: "lastTouched", desc: true }]
      }
    },
    ReactTable.useFilters,
    ReactTable.useSortBy
  );

  const toggleableIds = [
    "name",
    "format",
    "colorSortVal",
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
            <MetricText key={column.id} style={{ paddingLeft: "16px" }}>
              <label style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                <input type="checkbox" {...column.getToggleHiddenProps()} />{" "}
                {column.render("Header")}
              </label>
            </MetricText>
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
                      ["name", "tags"].includes(column.id) ? "alignLeft" : ""
                    }
                    key={column.id}
                  >
                    <div>
                      {column.render("Header")}
                      {column.canFilter && (
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
                        title={"filter column"}
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
