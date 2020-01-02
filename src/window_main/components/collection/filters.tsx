/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from "lodash";
import React from "react";
import matchSorter from "match-sorter";

import { CARD_RARITIES, MANA } from "../../../shared/constants";
import db from "../../../shared/database";
import { SetSymbol, TypeSymbol, RaritySymbol } from "../display";

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

export interface RarityFilterProps {
  filterKey: string;
  filters: { [key: string]: RarityFilterValue };
  onFilterChanged: (filter: RarityFilterValue) => void;
}

export function RarityFilter(props: RarityFilterProps): JSX.Element {
  const { filterKey, filters } = props;
  const filterValue = filters[filterKey];

  const filterLabels: { [key in RarityFilterKeys]: string } = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    mythic: "Mythic",
    land: "Land"
  };

  const onClickRarityFilter = React.useCallback(
    (code: RarityFilterKeys) => (
      event: React.MouseEvent<HTMLDivElement>
    ): void => {
      filterValue[code] = event.currentTarget.classList.contains(
        "rarity_filter_on"
      );
      event.currentTarget.classList.toggle("rarity_filter_on");
      props.onFilterChanged(filterValue);
    },
    [props.onFilterChanged]
  );
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
              onClick={onClickRarityFilter(code)}
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
            onClick={onClickRarityFilter(code)}
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
  column: any;
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
  rows: any[],
  id: string,
  filterValue: RarityFilterValue
): any[] {
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

export interface SetFilterProps {
  filterKey: string;
  filters: { [key: string]: SetFilterValue };
  onFilterChanged: (filter: SetFilterValue) => void;
}

export function SetFilter(props: SetFilterProps): JSX.Element {
  const { filterKey, filters } = props;
  const filterValue = filters[filterKey];

  const onClickSetFilter = React.useCallback(
    (code: string) => (event: React.MouseEvent<HTMLDivElement>): void => {
      filterValue[code] = event.currentTarget.classList.contains(
        "set_filter_on"
      );
      event.currentTarget.classList.toggle("set_filter_on");
      props.onFilterChanged(filterValue);
    },
    [props.onFilterChanged]
  );
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
            onClick={onClickSetFilter(code)}
            className={filterValue?.[code] ? "" : "set_filter_on"}
            title={code}
          />
        );
      })}
      <SetSymbol
        set={"other"}
        onClick={onClickSetFilter("other")}
        className={filterValue?.other ? "" : "set_filter_on"}
        title={"all other sets"}
      />
    </div>
  );
}

export function SetColumnFilter({
  column: { filterValue = { ...defaultSetFilter }, setFilter }
}: {
  column: any;
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
  rows: any[],
  id: string,
  filterValue: SetFilterValue
): any[] {
  return rows.filter(
    row =>
      Object.entries(filterValue).some(
        ([code, value]) => value && row.values.set === code
      ) ||
      (filterValue.other && !setCodes.includes(row.values.set))
  );
}

export function cardSearchFilterFn(
  rows: any[],
  id: string,
  filterValue: string
): any[] {
  const tokens = filterValue.split(" ");
  const matches = tokens.map((token: string): any[] =>
    matchSorter(rows, token, {
      keys: [
        "values.id",
        "values.name",
        "values.type",
        "values.set",
        "values.rarity",
        "values.artist",
        (row: any): string => {
          const { colors } = row.values;
          return colors.map((color: number): string => MANA[color]).join(" ");
        }
      ]
    })
  );
  return _.intersection(...matches);
}
