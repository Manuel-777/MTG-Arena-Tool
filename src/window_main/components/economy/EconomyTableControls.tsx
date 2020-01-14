import React from "react";
import { ECONOMY_TABLE_MODES } from "../../../shared/constants";
import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { CheckboxContainer, MediumTextButton } from "../display";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { EconomyHeader } from "./EconomyHeader";
import { EconomyTableControlsProps } from "./types";
import { useBaseTableControls } from "../tables/hooks";

export default function EconomyTableControls(
  props: EconomyTableControlsProps
): JSX.Element {
  const {
    globalFilter,
    isExpanded,
    preGlobalFilteredRows,
    setExpanded,
    setGlobalFilter,
    setTableMode,
    tableMode
  } = props;
  const {
    headersProps,
    pagingProps,
    setTogglesVisible,
    toggleableColumns,
    togglesVisible
  } = useBaseTableControls(props);
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
          <EconomyHeader />
          <CheckboxContainer title={"In boosters only"}>
            <span>expand transactions</span>
            <input
              type="checkbox"
              checked={isExpanded}
              onChange={(): void => {
                setExpanded(!isExpanded);
              }}
            />
            <span className={"checkmark"} />
          </CheckboxContainer>
          <MediumTextButton
            onClick={(): void => setTogglesVisible(!togglesVisible)}
            style={{ margin: "0 0 5px 12px" }}
          >
            {togglesVisible ? "Hide" : "Show"} Column Toggles
          </MediumTextButton>
        </div>
        <div className="decks_table_toggles">
          {togglesVisible &&
            toggleableColumns.map(column => (
              <CheckboxContainer key={column.id}>
                {column.render("Header")}
                <input type="checkbox" {...column.getToggleHiddenProps({})} />
                <span className={"checkmark"} />
              </CheckboxContainer>
            ))}
        </div>
        <div className="decks_table_search_cont">
          <WrappedReactSelect
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
      <TableHeaders {...headersProps} />
    </>
  );
}
