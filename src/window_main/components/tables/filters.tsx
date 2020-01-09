import _ from "lodash";
import matchSorter from "match-sorter";
import React from "react";
import { ColumnInstance, FilterValue, Row } from "react-table";
import Aggregator from "../../aggregator";
import ManaFilter, { ColorFilter } from "../../ManaFilter";
import { CheckboxContainer, InputContainer, MetricText } from "../display";
import { TableData } from "./types";

export function TextBoxFilter<D extends TableData>({
  column: { id, filterValue, preFilteredRows, setFilter }
}: {
  column: ColumnInstance<D>;
}): JSX.Element {
  const count = preFilteredRows.length;
  const prompt =
    id === "deckTileId" ? `Search ${count} decks...` : `Filter ${id}...`;
  return (
    <InputContainer title={prompt}>
      <input
        value={filterValue ?? ""}
        onChange={(e): void => setFilter(e.target.value ?? undefined)}
        placeholder={prompt}
      />
    </InputContainer>
  );
}

export function NumberRangeColumnFilter<D extends TableData>({
  column: { filterValue = [], preFilteredRows, setFilter, id }
}: {
  column: ColumnInstance<D>;
}): JSX.Element {
  const [min, max] = React.useMemo(() => {
    let min = preFilteredRows.length ? preFilteredRows[0].values[id] : 0;
    let max = min;
    preFilteredRows.forEach(row => {
      min = Math.min(row.values[id], min);
      max = Math.max(row.values[id], max);
    });
    return [min, max];
  }, [id, preFilteredRows]);
  return (
    <>
      <InputContainer
        style={{
          width: "36px",
          marginRight: "4px"
        }}
      >
        <input
          value={filterValue[0] ?? ""}
          type="number"
          onChange={(e): void => {
            const val = e.target.value;
            setFilter((old: number[] = []) => [
              val ? parseInt(val, 10) : undefined,
              old[1]
            ]);
          }}
          placeholder={"min"}
          title={`inclusive lower bound (min ${min})`}
        />
      </InputContainer>
      <MetricText>to</MetricText>
      <InputContainer
        style={{
          width: "36px",
          marginLeft: "4px"
        }}
      >
        <input
          value={filterValue[1] ?? ""}
          type="number"
          onChange={(e): void => {
            const val = e.target.value;
            setFilter((old: number[] = []) => [
              old[0],
              val ? parseInt(val, 10) : undefined
            ]);
          }}
          placeholder={"max"}
          title={`inclusive upper bound (max ${max})`}
        />
      </InputContainer>
    </>
  );
}

export function fuzzyTextFilterFn<D extends TableData>(
  rows: Row<D>[],
  id: string,
  filterValue: string
): Row<D>[] {
  return matchSorter(rows, filterValue, { keys: ["values." + id] });
}

export function GlobalFilter<D extends TableData>({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
  promptNoun
}: {
  preGlobalFilteredRows: Row<D>[];
  globalFilter: FilterValue;
  setGlobalFilter: (filterValue: FilterValue) => void;
  promptNoun: string;
}): JSX.Element {
  const count = preGlobalFilteredRows.length;
  const prompt = `Search ${count} ${promptNoun}...`;
  return (
    <InputContainer title={prompt}>
      <input
        value={globalFilter ?? ""}
        onChange={(e): void => setGlobalFilter(e.target.value ?? undefined)}
        placeholder={prompt}
      />
    </InputContainer>
  );
}

const defaultColors = Aggregator.getDefaultColorFilter();

export function ColorColumnFilter<D extends TableData>({
  column: { filterValue = { ...defaultColors }, setFilter }
}: {
  column: ColumnInstance<D>;
}): JSX.Element {
  return (
    <ManaFilter
      prefixId={"decks_table"}
      filterKey={"colors"}
      filters={{ colors: filterValue }}
      symbolSize={16}
      onFilterChanged={(colors): void => {
        if (_.isMatch(colors, defaultColors)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(colors);
        }
      }}
    />
  );
}

export function colorsFilterFn<D extends TableData>(
  rows: Row<D>[],
  id: string,
  filterValue: ColorFilter
): Row<D>[] {
  return rows.filter(row =>
    Aggregator.filterDeckByColors(row.original, filterValue)
  );
}

export function ArchiveColumnFilter<D extends TableData>({
  column: { filterValue, setFilter }
}: {
  column: ColumnInstance<D>;
}): JSX.Element {
  return (
    <CheckboxContainer style={{ margin: "4px" }}>
      archived
      <input
        type="checkbox"
        checked={filterValue !== "hideArchived"}
        onChange={(e): void => {
          const val = e.target.checked;
          setFilter(val ? undefined : "hideArchived");
        }}
      />
      <span className={"checkmark"} />
    </CheckboxContainer>
  );
}

export function archivedFilterFn<D extends TableData>(
  rows: Row<D>[],
  id: string,
  filterValue: string
): Row<D>[] {
  if (filterValue === "hideArchived") {
    return rows.filter(row => !row.values.archived);
  }
  return rows;
}
