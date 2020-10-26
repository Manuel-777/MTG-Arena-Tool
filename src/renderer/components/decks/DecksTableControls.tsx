import React from "react";
import { FilterValue } from "react-table";
import ReactSelect from "../../../shared/ReactSelect";
import DateFilter from "../../DateFilter";
import { MediumTextButton } from "../misc/MediumTextButton";
import { SmallTextButton } from "../misc/SmallTextButton";
import ColumnToggles from "../tables/ColumnToggles";
import { GlobalFilter } from "../tables/filters";
import PagingControls from "../tables/PagingControls";
import { DecksTableControlsProps } from "./types";

import sharedCss from "../../../shared/shared.css";
import indexCss from "../../index.css";
import tableCss from "../tables/tables.css";
import deckTableCss from "./deckTable.css";
import { LabelText } from "../misc/LabelText";
import { constants, getEventPrettyName } from "mtgatool-shared";
const { DECKS_TABLE_MODES } = constants;

const defaultFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" },
];
const bestFilters = (): { id: string; value: FilterValue }[] => [
  { id: "archivedCol", value: "hideArchived" },
  { id: "wins", value: [5, undefined] },
  { id: "winrate100", value: [50, undefined] },
];
const craftColumns = new Set([
  "colorSortVal",
  "boosterCost",
  "rare",
  "mythic",
  "uncommon",
  "common",
]);

export default function DecksTableControls(
  props: DecksTableControlsProps
): JSX.Element {
  const {
    aggFilters,
    events,
    globalFilter,
    initialFiltersVisible,
    pagingProps,
    preGlobalFilteredRows,
    setAggFiltersCallback,
    setAllFilters,
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
        color: "var(--color-text)",
        paddingBottom: "4px",
      }}
    >
      <div className={tableCss.reactTableCommands}>
        <div className={indexCss.flexItem}>
          <DateFilter
            prefixId={deckTableCss.decksTop}
            current={aggFilters.date}
            callback={(date): void =>
              setAggFiltersCallback({ ...aggFilters, date })
            }
          />
          <ReactSelect
            options={events}
            current={aggFilters.eventId ?? ""}
            callback={(eventId): void =>
              setAggFiltersCallback({ ...aggFilters, eventId })
            }
            optionFormatter={getEventPrettyName}
          />
        </div>
        <div className={indexCss.flexItem}>
          <LabelText>Presets:</LabelText>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(defaultFilters);
              setFiltersVisible(initialFiltersVisible);
              toggleSortBy("timeTouched", true, false);
              for (const column of toggleableColumns) {
                toggleHideColumn(column.id, !column.defaultVisible);
              }
              toggleHideColumn("total", false);
              toggleHideColumn("lastEditWinrate", false);
            }}
          >
            Recent
          </SmallTextButton>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(bestFilters);
              setFiltersVisible({
                ...initialFiltersVisible,
                wins: true,
                winrate100: true,
              });
              toggleSortBy("winrate100", true, false);
              toggleSortBy("wins", true, true);
              for (const column of toggleableColumns) {
                toggleHideColumn(column.id, !column.defaultVisible);
              }
              toggleHideColumn("wins", false);
              toggleHideColumn("losses", false);
              toggleHideColumn("winrate100", false);
              toggleHideColumn("archivedCol", true);
            }}
          >
            Best
          </SmallTextButton>
          <SmallTextButton
            onClick={(): void => {
              setAllFilters(defaultFilters);
              setFiltersVisible(initialFiltersVisible);
              toggleSortBy("boosterCost", true, false);
              toggleSortBy("mythic", true, true);
              toggleSortBy("rare", true, true);
              for (const column of toggleableColumns) {
                const isVisible = craftColumns.has(column.id);
                toggleHideColumn(column.id, !isVisible);
              }
            }}
          >
            Wanted
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
      </div>
      <ColumnToggles
        toggleableColumns={toggleableColumns}
        togglesVisible={togglesVisible}
      />
      <div className={tableCss.reactTableCommands}>
        <ReactSelect
          current={tableMode}
          options={DECKS_TABLE_MODES}
          callback={setTableMode}
          className={"decks_table_mode"}
        />
        <GlobalFilter
          preGlobalFilteredRows={preGlobalFilteredRows}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          countLabel={"decks"}
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
