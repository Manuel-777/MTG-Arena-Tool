import _ from "lodash";
import matchSorter from "match-sorter";
import React from "react";
import { ColumnInstance, Row } from "react-table";
import { CARD_RARITIES, MANA } from "../../../shared/constants";
import db from "../../../shared/database";
import { BinarySymbol, RaritySymbol, SetSymbol, TypeSymbol } from "../display";
import { useMultiSelectFilter } from "../tables/hooks";
import { MultiSelectFilterProps } from "../tables/types";
import { CardsData } from "./types";

export type InBoostersFilterKeys = "true" | "false";

export type InBoostersFilterValue = { [key in InBoostersFilterKeys]: boolean };

const defaultInBoosters: InBoostersFilterValue = {
  true: true,
  false: true
};

export type InBoostersFilterProps = MultiSelectFilterProps<
  InBoostersFilterValue
>;

export function InBoostersFilter(props: InBoostersFilterProps): JSX.Element {
  const [filterValue, onClickMultiFilter] = useMultiSelectFilter(props);
  return (
    <div
      className={"matches_table_query_inboosters"}
      style={{
        display: "flex",
        height: "32px"
      }}
    >
      <BinarySymbol
        isOn={true}
        onClick={onClickMultiFilter("true")}
        className={filterValue["true"] ? "" : " rarity_filter_on"}
        title={"available in boosters"}
      />
      <BinarySymbol
        isOn={false}
        onClick={onClickMultiFilter("false")}
        className={filterValue["false"] ? "" : " rarity_filter_on"}
        title={"not available in boosters"}
      />
    </div>
  );
}

export function InBoostersColumnFilter({
  column: { filterValue = { ...defaultInBoosters }, id, setFilter }
}: {
  column: ColumnInstance<CardsData>;
}): JSX.Element {
  return (
    <InBoostersFilter
      filterKey={id}
      filters={{ [id]: filterValue }}
      onFilterChanged={(filterValue): void => {
        if (_.isMatch(filterValue, defaultInBoosters)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(filterValue);
        }
      }}
    />
  );
}

export function inBoostersFilterFn(
  rows: Row<CardsData>[],
  id: string,
  filterValue: InBoostersFilterValue
): Row<CardsData>[] {
  return rows.filter(row =>
    Object.entries(filterValue).some(
      ([code, value]) => value && String(row.values.booster) === code
    )
  );
}

export type RarityFilterKeys =
  | "common"
  | "uncommon"
  | "rare"
  | "mythic"
  | "land";

export type RarityFilterValue = { [key in RarityFilterKeys]: boolean };

const defaultRarity: RarityFilterValue = {
  common: true,
  uncommon: true,
  rare: true,
  mythic: true,
  land: true
};

export type RarityFilterProps = MultiSelectFilterProps<RarityFilterValue>;

export function RarityFilter(props: RarityFilterProps): JSX.Element {
  const filterLabels: { [key in RarityFilterKeys]: string } = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    mythic: "Mythic",
    land: "Land"
  };
  const [filterValue, onClickMultiFilter] = useMultiSelectFilter(props);
  return (
    <div
      className={"collection_table_query_rarity"}
      style={{
        display: "flex",
        height: "32px"
      }}
    >
      {CARD_RARITIES.map((code: RarityFilterKeys) => {
        return code === "land" ? (
          <div className="type_icon_cont" key={code}>
            <TypeSymbol
              type={"Land"}
              onClick={onClickMultiFilter(code)}
              className={
                "rarity_filter " +
                (filterValue[code] ? "" : " rarity_filter_on")
              }
              title={filterLabels[code]}
            />
          </div>
        ) : (
          <RaritySymbol
            rarity={code}
            key={code}
            onClick={onClickMultiFilter(code)}
            className={filterValue[code] ? "" : " rarity_filter_on"}
            title={filterLabels[code]}
          />
        );
      })}
    </div>
  );
}

export function RarityColumnFilter({
  column: { filterValue = { ...defaultRarity }, setFilter }
}: {
  column: ColumnInstance<CardsData>;
}): JSX.Element {
  return (
    <RarityFilter
      filterKey={"rarity"}
      filters={{ rarity: filterValue }}
      onFilterChanged={(filterValue): void => {
        if (_.isMatch(filterValue, defaultRarity)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(filterValue);
        }
      }}
    />
  );
}

export function rarityFilterFn(
  rows: Row<CardsData>[],
  id: string,
  filterValue: RarityFilterValue
): Row<CardsData>[] {
  return rows.filter(row =>
    Object.entries(filterValue).some(
      ([code, value]) => value && row.values.rarity === code
    )
  );
}

const setCodes = db.standardSetCodes.filter(code => code !== "Arena");

export type SetFilterValue = { [set: string]: boolean };

const defaultSetFilter: SetFilterValue = { other: true };
setCodes.forEach((code: string) => (defaultSetFilter[code] = true));

export type SetFilterProps = MultiSelectFilterProps<SetFilterValue>;

export function SetFilter(props: SetFilterProps): JSX.Element {
  const [filterValue, onClickMultiFilter] = useMultiSelectFilter(props);
  return (
    <div
      className={"collection_table_query_rarity"}
      style={{
        display: "flex",
        height: "32px"
      }}
    >
      {setCodes.map(code => {
        return (
          <SetSymbol
            key={code}
            set={code}
            onClick={onClickMultiFilter(code)}
            className={filterValue?.[code] ? "" : "rarity_filter_on"}
            title={code}
          />
        );
      })}
      <SetSymbol
        set={"other"}
        onClick={onClickMultiFilter("other")}
        className={filterValue?.other ? "" : "rarity_filter_on"}
        title={"all other sets"}
      />
    </div>
  );
}

export function SetColumnFilter({
  column: { filterValue = { ...defaultSetFilter }, setFilter }
}: {
  column: ColumnInstance<CardsData>;
}): JSX.Element {
  return (
    <SetFilter
      filterKey={"set"}
      filters={{ set: filterValue }}
      onFilterChanged={(filterValue): void => {
        if (_.isMatch(filterValue, defaultSetFilter)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(filterValue);
        }
      }}
    />
  );
}

export function setFilterFn(
  rows: Row<CardsData>[],
  id: string,
  filterValue: SetFilterValue
): Row<CardsData>[] {
  return rows.filter(
    row =>
      Object.entries(filterValue).some(
        ([code, value]) => value && row.values.set === code
      ) ||
      (filterValue.other && !setCodes.includes(row.values.set))
  );
}

type SearchKeyFn = (row: Row<CardsData>) => string;
const colorSearchKey: SearchKeyFn = row => {
  const { colors } = row.values;
  return colors.map((color: number): string => MANA[color]).join(" ");
};

// inspired by https://scryfall.com/docs/syntax
type SearchKeyValue = string | SearchKeyFn;
const searchKeyMap: { [key: string]: SearchKeyValue } = {
  id: "values.id",
  n: "values.name",
  name: "values.name",
  t: "values.type",
  type: "values.type",
  s: "values.set",
  set: "values.set",
  r: "values.rarity",
  rarity: "values.rarity",
  a: "values.artist",
  art: "values.artist",
  artist: "values.artist",
  c: colorSearchKey,
  color: colorSearchKey
};

const allSearchKeys = [...new Set(Object.values(searchKeyMap))];

type ParsedToken = [string, string, string];

function parseFilterValue(filterValue: string): ParsedToken[] {
  const exp = /(?<normal>(?<tok>[^\s"]+)(?<sep>\b[>=|<=|:|=|<|<]{1,2})(?<val>[^\s"]+))|(?<quoted>(?<qtok>[^\s"]+)(?<qsep>\b[>=|<=|:|=|<|<]{1,2})(?<qval>"[^"]*"))/;
  const filterPattern = new RegExp(exp, "g");
  let match;
  const results: ParsedToken[] = [];
  while ((match = filterPattern.exec(filterValue))) {
    // console.log("filterPattern match: ", match.groups);
    let token, separator, value;
    if (match.groups?.normal) {
      token = match.groups.tok;
      separator = match.groups.sep;
      value = match.groups.val; // should remove quotes too
    } else if (match.groups?.quoted) {
      token = match.groups.qtok;
      separator = match.groups.qsep;
      value = match.groups.qval; // should remove quotes too
    }
    if (token && separator && value) {
      results.push([token, separator, value]);
    }
  }
  return results;
}

export function cardSearchFilterFn(
  rows: Row<CardsData>[],
  columnIds: string[],
  filterValue: string
): Row<CardsData>[] {
  const tokens = filterValue.split(" ").filter(token => token.length > 2);
  if (tokens.length === 0) {
    return rows;
  }
  const matches = tokens.map(token => {
    let keys = allSearchKeys;
    let finalToken = token;
    let threshold;
    if (token.includes(":") || token.includes("=")) {
      const results = parseFilterValue(token);
      if (results.length) {
        const [[tokenKey, separator, tokenVal]] = results;
        if (tokenKey in searchKeyMap) {
          keys = [searchKeyMap[tokenKey]];
          finalToken = tokenVal;
          if (separator === "=") {
            threshold = matchSorter.rankings.EQUAL;
          }
        }
      }
    }
    return matchSorter(rows, finalToken, { keys, threshold });
  });
  return _.intersection(...matches);
}
