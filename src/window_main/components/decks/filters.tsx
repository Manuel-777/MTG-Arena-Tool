/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from "lodash";
import React from "react";
import matchSorter from "match-sorter";

import { MANA } from "../../../shared/constants";
import ManaFilter, { ColorFilter } from "../../ManaFilter";
import Aggregator from "../../aggregator";
import { MetricText, InputContainer, CheckboxContainer } from "../display";

export function TextBoxFilter({
  column: { id, filterValue, preFilteredRows, setFilter }
}: {
  column: any;
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

export function NumberRangeColumnFilter({
  column: { filterValue = [], preFilteredRows, setFilter, id }
}: {
  column: any;
}): JSX.Element {
  const [min, max] = React.useMemo(() => {
    let min = preFilteredRows.length ? preFilteredRows[0].values[id] : 0;
    let max = min;
    preFilteredRows.forEach((row: any) => {
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

export function fuzzyTextFilterFn(
  rows: any[],
  id: string,
  filterValue: string
): any[] {
  return matchSorter(rows, filterValue, { keys: ["values." + id] });
}

export function deckSearchFilterFn(
  rows: any[],
  id: string,
  filterValue: string
): any[] {
  const tokens = filterValue.split(" ");
  const matches = tokens.map((token: string): any[] =>
    matchSorter(rows, token, {
      keys: [
        "values.deckId",
        "values.name",
        "values.format",
        "values.tags",
        (row: any): string => {
          const { colors } = row.values;
          return colors.map((color: number): string => MANA[color]).join(" ");
        }
      ]
    })
  );
  return _.intersection(...matches);
}

export function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
  promptNoun
}: any): JSX.Element {
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

export function ColorColumnFilter({
  column: { filterValue = { ...defaultColors }, setFilter }
}: {
  column: any;
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

export function colorsFilterFn(
  rows: any[],
  id: string,
  filterValue: ColorFilter
): any[] {
  return rows.filter(row =>
    Aggregator.filterDeckByColors(row.values, filterValue)
  );
}

export function ArchiveColumnFilter({
  column: { filterValue, setFilter }
}: {
  column: any;
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

export function archivedFilterFn(
  rows: any[],
  id: string,
  filterValue: string
): any[] {
  if (filterValue === "hideArchived") {
    return rows.filter(row => !row.values.archived);
  }
  return rows;
}
