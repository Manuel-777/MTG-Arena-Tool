import _ from "lodash";
import matchSorter from "match-sorter";
import React from "react";
import { ColumnInstance, FilterValue, Row } from "react-table";
import { MANA, RANKS } from "../../../shared/constants";
import { OnPlaySymbol, RankSymbol } from "../display";
import { MatchTableData } from "./types";

export type OnPlayFilterKeys = "true" | "false";

export type OnPlayFilterValue = { [key in OnPlayFilterKeys]: boolean };

const defaultOnPlay: OnPlayFilterValue = {
  true: true,
  false: true
};

export interface OnPlayFilterProps {
  filterKey: string;
  filters: { [key: string]: OnPlayFilterValue };
  onFilterChanged: (filter: OnPlayFilterValue) => void;
}

export function OnPlayFilter(props: OnPlayFilterProps): JSX.Element {
  const { filterKey, filters } = props;
  const filterValue = filters[filterKey];
  const onClickOnPlayFilter = React.useCallback(
    (code: OnPlayFilterKeys) => (
      event: React.MouseEvent<HTMLDivElement>
    ): void => {
      filterValue[code] = event.currentTarget.classList.contains(
        "rarity_filter_on"
      );
      event.currentTarget.classList.toggle("rarity_filter_on");
      props.onFilterChanged(filterValue);
    },
    [filterValue, props]
  );
  return (
    <div
      className={"matches_table_query_onplay"}
      style={{
        display: "flex",
        height: "32px"
      }}
    >
      <OnPlaySymbol
        isOnPlay={true}
        onClick={onClickOnPlayFilter("true")}
        className={filterValue["true"] ? "" : " rarity_filter_on"}
        title={"On the play"}
      />
      <OnPlaySymbol
        isOnPlay={false}
        onClick={onClickOnPlayFilter("false")}
        className={filterValue["false"] ? "" : " rarity_filter_on"}
        title={"On the draw"}
      />
    </div>
  );
}

export function OnPlayColumnFilter({
  column: { filterValue = { ...defaultOnPlay }, id, setFilter }
}: {
  column: ColumnInstance<MatchTableData>;
}): JSX.Element {
  return (
    <OnPlayFilter
      filterKey={id}
      filters={{ [id]: filterValue }}
      onFilterChanged={(filterValue): void => {
        if (_.isMatch(filterValue, defaultOnPlay)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(filterValue);
        }
      }}
    />
  );
}

export function onPlayFilterFn(
  rows: Row<MatchTableData>[],
  id: string,
  filterValue: OnPlayFilterValue
): Row<MatchTableData>[] {
  return rows.filter(row =>
    Object.entries(filterValue).some(
      ([code, value]) => value && String(row.values.isOnPlay) === code
    )
  );
}

export type RankFilterKeys =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Mythic";

export type RankFilterValue = { [key in RankFilterKeys]: boolean };

const defaultRank: RankFilterValue = {
  Bronze: true,
  Silver: true,
  Gold: true,
  Platinum: true,
  Diamond: true,
  Mythic: true
};

export interface RankFilterProps {
  filterKey: string;
  filters: { [key: string]: RankFilterValue };
  onFilterChanged: (filter: RankFilterValue) => void;
}

export function RankFilter(props: RankFilterProps): JSX.Element {
  const { filterKey, filters } = props;
  const filterValue = filters[filterKey];

  const onClickRankFilter = React.useCallback(
    (code: RankFilterKeys) => (
      event: React.MouseEvent<HTMLDivElement>
    ): void => {
      filterValue[code] = event.currentTarget.classList.contains(
        "rarity_filter_on"
      );
      event.currentTarget.classList.toggle("rarity_filter_on");
      props.onFilterChanged(filterValue);
    },
    [filterValue, props]
  );
  return (
    <div
      className={"collection_table_query_rank"}
      style={{
        display: "flex",
        height: "32px"
      }}
    >
      {RANKS.map((code: RankFilterKeys) => {
        return (
          <RankSymbol
            rank={code}
            key={code}
            onClick={onClickRankFilter(code)}
            className={filterValue[code] ? "" : " rarity_filter_on"}
            title={code}
          />
        );
      })}
    </div>
  );
}

export function RankColumnFilter({
  column: { id, filterValue = { ...defaultRank }, setFilter }
}: {
  column: ColumnInstance<MatchTableData>;
}): JSX.Element {
  return (
    <RankFilter
      filterKey={id}
      filters={{ [id]: filterValue }}
      onFilterChanged={(filterValue): void => {
        if (_.isMatch(filterValue, defaultRank)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(filterValue);
        }
      }}
    />
  );
}

export function rankFilterFn(
  rows: Row<MatchTableData>[],
  columnIds: string[],
  filterValue: RankFilterValue
): Row<MatchTableData>[] {
  return rows.filter(row =>
    Object.entries(filterValue).some(
      ([code, value]) => value && row.values[columnIds[0]] === code
    )
  );
}

const colorSearchKeyFactory = (
  colorKey: string
): ((row: Row<MatchTableData>) => string) => {
  return (row: Row<MatchTableData>): string => {
    const colors = row.values[colorKey];
    return colors.map((color: number): string => MANA[color]).join(" ");
  };
};

export function matchSearchFilterFn(
  rows: Row<MatchTableData>[],
  columnIds: string[],
  filterValue: FilterValue
): Row<MatchTableData>[] {
  const tokens = String(filterValue)
    .split(" ")
    .filter(token =>
      token.includes(":") ? token.split(":")[1].length > 2 : token.length > 2
    );
  if (tokens.length === 0) {
    return rows;
  }
  const matches = tokens.map(token => {
    return matchSorter(rows, token, {
      keys: [
        "values.deckName",
        "values.oppArchetype",
        "values.oppName",
        "values.deckTags",
        "values.tags",
        colorSearchKeyFactory("colors"),
        colorSearchKeyFactory("oppColors")
      ]
    });
  });
  return _.intersection(...matches);
}
