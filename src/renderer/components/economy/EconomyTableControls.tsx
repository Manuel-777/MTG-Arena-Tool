import React from "react";
import { FilterValue } from "react-table";
import ReactSelect from "../../../shared/ReactSelect";
import { CheckboxContainer } from "../misc/CheckboxContainer";
import { MediumTextButton } from "../misc/MediumTextButton";
import { SmallTextButton } from "../misc/SmallTextButton";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { EconomyHeader } from "./EconomyHeader";
import { EconomyTableControlsProps } from "./types";
import tablesCss from "../tables/tables.css";
import indexCss from "../../index.css";
import sharedCss from "../../../shared/shared.css";
import { constants } from "mtgatool-shared";
const { ECONOMY_TABLE_MODES } = constants;

const defaultFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" },
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
    togglesVisible,
  } = props;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        color: "var(--color-light)",
        paddingBottom: "8px",
      }}
    >
      <div className={tablesCss.reactTableCommands}>
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
          <span className={indexCss.checkmark} />
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
            className={indexCss.buttonSimple}
            style={{textAlign: "right"}}
        >
          <p style={{marginRight: "12px"}}>
            {togglesVisible ? "Hide Column Toggles" : "Show Column Toggles"}
          </p>
        </MediumTextButton>
      </div>
      <ColumnToggles
        toggleableColumns={toggleableColumns}
        togglesVisible={togglesVisible}
      />
      <div className={tablesCss.reactTableCommands}>
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
            className={sharedCss.button + " " + sharedCss.close}
            onClick={(e): void => {
              e.stopPropagation();
              setGlobalFilter(undefined);
            }}
            title={"clear column filter"}
          />
        )}
        <PagingControls align={"flex-end"} {...pagingProps} />
      </div>
    </div>
  );
}
