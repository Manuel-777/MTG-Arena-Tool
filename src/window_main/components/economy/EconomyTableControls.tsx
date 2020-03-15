import React from "react";
import { FilterValue } from "react-table";
import { ECONOMY_TABLE_MODES } from "../../../shared/constants";
import ReactSelect from "../../../shared/ReactSelect";
import {
  CheckboxContainer,
  MediumTextButton,
  SmallTextButton
} from "../misc/display";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { EconomyHeader } from "./EconomyHeader";
import { EconomyTableControlsProps } from "./types";

const defaultFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" }
];

export default function EconomyTableControls(
  props: EconomyTableControlsProps
): JSX.Element {
  const {
    globalFilter,
    isExpanded,
    pagingProps,
    preGlobalFilteredRows,
    setAllFilters,
    setExpanded,
    setFiltersVisible,
    setGlobalFilter,
    setTableMode,
    setTogglesVisible,
    tableMode,
    toggleableColumns,
    toggleHideColumn,
    toggleSortBy,
    togglesVisible
  } = props;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        color: "var(--color-light)",
        paddingBottom: "8px"
      }}
    >
      <div className="react_table_toggles">
        <EconomyHeader />
        <CheckboxContainer title={"In boosters only"}>
          <span>show transactions</span>
          <input
            type="checkbox"
            checked={isExpanded}
            onChange={(): void => {
              setExpanded(!isExpanded);
            }}
          />
          <span className={"checkmark"} />
        </CheckboxContainer>
        <SmallTextButton
          onClick={(): void => {
            setAllFilters(defaultFilters);
            setFiltersVisible({});
            for (const column of toggleableColumns) {
              toggleHideColumn(column.id, !column.defaultVisible);
            }
            toggleSortBy("timestamp", true, false);
          }}
          style={{ marginLeft: "12px" }}
        >
          Reset
        </SmallTextButton>
        <MediumTextButton
          onClick={(): void => setTogglesVisible(!togglesVisible)}
          style={{ margin: "0 0 5px 12px" }}
        >
          {togglesVisible ? "Hide" : "Show"} Column Toggles
        </MediumTextButton>
      </div>
      <ColumnToggles
        toggleableColumns={toggleableColumns}
        togglesVisible={togglesVisible}
      />
      <div className="react_table_search_cont">
        <ReactSelect
          current={tableMode}
          options={ECONOMY_TABLE_MODES}
          callback={setTableMode}
          className={"economy_table_mode"}
        />
        <GlobalFilter
          preGlobalFilteredRows={preGlobalFilteredRows}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          countLabel={"transactions"}
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
  );
}
