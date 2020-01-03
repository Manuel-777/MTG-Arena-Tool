/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import styled from "styled-components";

import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { TABLE_MODES } from "../../../shared/constants";

import FilterPanel from "../../FilterPanel";
import { MetricText } from "./cells";
import { StyledCheckboxContainer, GlobalFilter } from "./filters";
import PagingControls from "../PagingControls";
import { DecksTableControlsProps } from "./types";

const PresetButton = styled(MetricText).attrs(props => ({
  className: (props.className ?? "") + " button_simple"
}))`
  margin: 0 4px 5px 4px;
  width: 90px;
`;

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

export default function DecksTableControls({
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
}: DecksTableControlsProps): JSX.Element {
  const [toggleableColumns, initialFiltersVisible] = React.useMemo(() => {
    const toggleableColumns = flatColumns.filter(
      (column: any) => column.mayToggle
    );
    const initialFiltersVisible: { [key: string]: boolean } = {};
    for (const column of flatColumns) {
      if (column.canFilter) {
        initialFiltersVisible[column.id] = !!column.filterValue;
      }
    }
    return [toggleableColumns, initialFiltersVisible];
  }, [flatColumns]);
  const [filtersVisible, setFiltersVisible] = React.useState(
    initialFiltersVisible
  );
  const [togglesVisible, setTogglesVisible] = React.useState(false);
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
    <>
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
              for (const column of toggleableColumns) {
                const isVisible = [
                  "name",
                  "format",
                  "colorSortVal",
                  "timeTouched",
                  "lastEditWinrate"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
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
              for (const column of toggleableColumns) {
                const isVisible = [
                  "name",
                  "format",
                  "colorSortVal",
                  "losses",
                  "winrate100",
                  "wins"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
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
              for (const column of toggleableColumns) {
                const isVisible = [
                  "name",
                  "format",
                  "colorSortVal",
                  "boosterCost",
                  "timeUpdated"
                ].includes(column.id);
                toggleHideColumn(column.id, !isVisible);
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
          <GlobalFilter
            preGlobalFilteredRows={preGlobalFilteredRows}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            promptNoun={"decks"}
          />
          {globalFilter && (
            <div
              style={{ marginRight: 0, minWidth: "24px" }}
              className={"button close"}
              onClick={(e): void => {
                e.stopPropagation();
                setGlobalFilter(undefined);
              }}
              title={"clear column filter"}
            />
          )}
          <PagingControls {...pagingProps} />
        </div>
      </div>
      <div
        className="decks_table_head line_dark"
        style={{ gridTemplateColumns }}
        {...getTableProps()}
      >
        {visibleHeaders.map((column: any, ii: number) => (
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
    </>
  );
}
