import _ from "lodash";
import matchSorter from "match-sorter";
import React from "react";
import { ColumnInstance, FilterValue, Row, TableState } from "react-table";
import { COLORS_ALL, COLORS_BRIEF } from "../../../shared/constants";
import { InternalDeck } from "../../../types/Deck";
import { BinarySymbol } from "../misc/BinarySymbol";
import { CheckboxContainer } from "../misc/CheckboxContainer";
import { InputContainer } from "../misc/InputContainer";
import ManaFilter, { ColorFilter, ManaFilterKeys } from "../misc/ManaFilter";
import { MetricText } from "../misc/MetricText";
import { useMultiSelectFilter } from "./useMultiSelectFilter";
import { MultiSelectFilterProps, TableData } from "./types";

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
  countLabel
}: {
  preGlobalFilteredRows: Row<D>[];
  globalFilter: FilterValue;
  setGlobalFilter: (filterValue: FilterValue) => void;
  countLabel: string;
}): JSX.Element {
  const count = preGlobalFilteredRows.length;
  const prompt = `Search ${count} ${countLabel}...`;
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

export type BinaryFilterKeys = "true" | "false";

export type BinaryFilterValue = { [key in BinaryFilterKeys]: boolean };

const defaultBinary: BinaryFilterValue = {
  true: true,
  false: true
};

export interface BinaryFilterProps
  extends MultiSelectFilterProps<BinaryFilterValue> {
  trueLabel: string;
  falseLabel: string;
  trueSymbol?: string;
  falseSymbol?: string;
}

export function BinaryFilter(props: BinaryFilterProps): JSX.Element {
  const [filterValue, onClickMultiFilter] = useMultiSelectFilter(props);
  const { trueLabel, falseLabel, trueSymbol, falseSymbol } = props;
  const symbolStyle = {
    height: "20px",
    width: "20px",
    margin: "auto 2px",
    verticalAlign: "middle"
  };
  return (
    <div
      className={"matches_table_query_binary"}
      style={{
        display: "flex",
        height: "32px"
      }}
    >
      {trueSymbol ? (
        <div
          className={
            "ontheplaytext" + (filterValue["true"] ? "" : " rarity_filter_on")
          }
          style={symbolStyle}
          onClick={onClickMultiFilter("true")}
          title={trueLabel}
        >
          {trueSymbol[0].toUpperCase()}
        </div>
      ) : (
        <BinarySymbol
          isOn={true}
          onClick={onClickMultiFilter("true")}
          className={filterValue["true"] ? "" : " rarity_filter_on"}
          title={trueLabel}
        />
      )}
      {falseSymbol ? (
        <div
          className={
            "onthedrawtext" + (filterValue["false"] ? "" : " rarity_filter_on")
          }
          style={symbolStyle}
          onClick={onClickMultiFilter("false")}
          title={falseLabel}
        >
          {falseSymbol[0].toUpperCase()}
        </div>
      ) : (
        <BinarySymbol
          isOn={false}
          onClick={onClickMultiFilter("false")}
          className={filterValue["false"] ? "" : " rarity_filter_on"}
          title={falseLabel}
        />
      )}
    </div>
  );
}

export function BinaryColumnFilter<D extends TableData>({
  column: { filterValue = { ...defaultBinary }, id, setFilter },
  ...filterProps
}: {
  column: ColumnInstance<D>;
  trueSymbol?: string;
  falseSymbol?: string;
  trueLabel: string;
  falseLabel: string;
}): JSX.Element {
  return (
    <BinaryFilter
      filterKey={id}
      filters={{ [id]: filterValue }}
      onFilterChanged={(filterValue): void => {
        if (_.isMatch(filterValue, defaultBinary)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(filterValue);
        }
      }}
      {...filterProps}
    />
  );
}

export function getDefaultColorFilter(): ColorFilter {
  const colorFilters: any = {};
  COLORS_BRIEF.forEach(code => (colorFilters[code] = false));
  return { ...colorFilters, multi: true };
}

export function filterDeckByColors(
  deck: Partial<InternalDeck> | null,
  _colors: ColorFilter
): boolean {
  if (!deck) return true;
  // Normalize deck colors into matching data format
  const deckColorCodes = getDefaultColorFilter();
  deck.colors?.forEach(
    i => (deckColorCodes[COLORS_ALL[i - 1] as ManaFilterKeys] = true)
  );
  return Object.entries(_colors).every(([color, value]) => {
    const key = color as ManaFilterKeys;
    if (key === "multi") return true;
    if (!_colors.multi || value) {
      return deckColorCodes[key] === value;
    }
    return true;
  });
}

const defaultColors = getDefaultColorFilter();

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
  columnIds: string[],
  filterValue: ColorFilter
): Row<D>[] {
  const [id] = columnIds;
  const key = id.replace("SortVal", "s");
  return rows.filter(row =>
    filterDeckByColors({ colors: row.original[key] }, filterValue)
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

export function isHidingArchived<D extends TableData>(
  state?: Partial<TableState<D>>
): boolean {
  return (
    state?.filters?.some(
      filter => filter.id === "archivedCol" && filter.value === "hideArchived"
    ) ?? false
  );
}
