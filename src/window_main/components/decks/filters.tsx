import _ from "lodash";
import React from "react";
import styled from "styled-components";
import matchSorter from "match-sorter";

import { MANA } from "../../../shared/constants";
import ManaFilter, { ColorFilter } from "../../ManaFilter";

import Aggregator from "../../aggregator";
import { MetricText } from "./cells";

export const StyledInputContainer = styled.div.attrs(props => ({
  className: (props.className ?? "") + " input_container"
}))`
  display: inline-flex;
  margin: inherit;
  position: relative;
  width: 100%;
  height: 26px;
  padding-bottom: 4px;
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &.input_container input {
    margin: 0;
    width: calc(100% - 10px);
    padding: 2px 4px;
    position: absolute;
    left: 0;
    right: 0;
  }
  &:hover input {
    color: rgba(255, 255, 255, 1);
    background-color: var(--color-mid-50);
    border: 1px solid var(--color-light);
  }
`;

export const StyledCheckboxContainer = styled.label.attrs(props => ({
  className: (props.className ?? "") + " check_container hover_label"
}))`
  display: inline-flex;
`;

export function TextBoxFilter({
  column: { id, filterValue, preFilteredRows, setFilter }
}: {
  column: any;
}): JSX.Element {
  const count = preFilteredRows.length;
  const prompt =
    id === "deckTileId" ? `Search ${count} decks...` : `Filter ${id}...`;
  return (
    <StyledInputContainer title={prompt}>
      <input
        value={filterValue ?? ""}
        onChange={(e): void => setFilter(e.target.value ?? undefined)}
        placeholder={prompt}
      />
    </StyledInputContainer>
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
      <StyledInputContainer
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
      </StyledInputContainer>
      <MetricText>to</MetricText>
      <StyledInputContainer
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
      </StyledInputContainer>
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

export function uberSearchFilterFn(
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
    <StyledCheckboxContainer style={{ marginLeft: 0 }}>
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
    </StyledCheckboxContainer>
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
