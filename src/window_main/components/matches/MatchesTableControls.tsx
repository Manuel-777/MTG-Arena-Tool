import React from "react";
import { FilterValue } from "react-table";
import { MATCHES_TABLE_MODES } from "../../../shared/constants";
import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { getReadableEvent } from "../../../shared/util";
import DateFilter from "../../DateFilter";
import {
  CheckboxContainer,
  MediumTextButton,
  SmallTextButton
} from "../display";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import TableHeaders from "../tables/TableHeaders";
import { FiltersVisible } from "../tables/types";
import { MatchesTableControlsProps } from "./types";

const defaultFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" }
];

export default function MatchesTableControls({
  aggFilters,
  canNextPage,
  canPreviousPage,
  events,
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
  setAggFiltersCallback,
  setAllFilters,
  setFilter,
  setGlobalFilter,
  setPageSize,
  setTableMode,
  tableMode,
  toggleSortBy,
  visibleHeaders
}: MatchesTableControlsProps): JSX.Element {
  const [toggleableColumns, initialFiltersVisible] = React.useMemo(() => {
    const toggleableColumns = flatColumns.filter(column => column.mayToggle);
    const initialFiltersVisible: FiltersVisible = {};
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
  const headersProps = {
    filtersVisible,
    getTableProps,
    gridTemplateColumns,
    setFilter,
    setFiltersVisible,
    visibleHeaders
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
          <DateFilter
            prefixId={"decks_top"}
            current={aggFilters.date}
            callback={(date): void =>
              setAggFiltersCallback({ ...aggFilters, date })
            }
          />
          <WrappedReactSelect
            className={"decks_top_query_event"}
            options={events}
            current={aggFilters.eventId ?? ""}
            callback={(eventId): void =>
              setAggFiltersCallback({ ...aggFilters, eventId })
            }
            optionFormatter={getReadableEvent}
          />
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(defaultFilters);
              setFiltersVisible({});
              toggleSortBy("timestamp", true, false);
            }}
          >
            Reset
          </SmallTextButton>
          <MediumTextButton
            onClick={(): void => setTogglesVisible(!togglesVisible)}
            className="button_simple"
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
            key={tableMode}
            current={tableMode}
            options={MATCHES_TABLE_MODES}
            callback={setTableMode}
            className={"matches_table_mode"}
          />
          <GlobalFilter
            preGlobalFilteredRows={preGlobalFilteredRows}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            countLabel={"matches"}
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
