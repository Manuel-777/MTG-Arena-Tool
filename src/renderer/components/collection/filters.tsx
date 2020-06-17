import _ from "lodash";
import { Row } from "react-table";
import db from "../../../shared/database";
import { BinaryFilterValue, StringFilter } from "../tables/filters";
import { MultiSelectFilterProps, TableData } from "../tables/types";
import {
  CardsData,
  RARITY_TOKEN,
  RARITY_LAND,
  RARITY_COMMON,
  RARITY_UNCOMMON,
  RARITY_RARE,
  RARITY_MYTHIC,
  ColorBitsFilter,
  RarityBitsFilter,
} from "./types";
import { usedFormats } from "../../rendererUtil";
import {
  historicAnthology,
  historicAnthology2,
  historicAnthology3,
} from "./customSets";

export function inBoostersFilterFn(
  rows: Row<CardsData>[],
  _id: string,
  filterValue: BinaryFilterValue
): Row<CardsData>[] {
  return rows.filter((row) =>
    Object.entries(filterValue).some(
      ([code, value]) => value && String(row.original.booster) === code
    )
  );
}

export type SetFilterValue = { [set: string]: boolean };

const defaultSetFilter: SetFilterValue = { other: true };
db.standardSetCodes.forEach((code: string) => (defaultSetFilter[code] = true));

export type SetFilterProps = MultiSelectFilterProps<SetFilterValue>;

export function setFilterFn<D extends TableData>(
  rows: Row<D>[],
  _id: string,
  filterValue: StringFilter
): Row<D>[] {
  return rows.filter((row) => {
    const F = filterValue.string;
    let res = false;
    if (F == "ha1" && historicAnthology.includes(row.original.id)) res = true;
    if (F == "ha2" && historicAnthology2.includes(row.original.id)) res = true;
    if (F == "ha3" && historicAnthology3.includes(row.original.id)) res = true;

    res =
      res ||
      row.original.setCode.indexOf(F) !== -1 ||
      row.original.set.indexOf(F) !== -1;
    return filterValue.not ? !res : res;
  });
}

export function colorsBitsFilterFn<D extends TableData>(
  rows: Row<D>[],
  _columnIds: string[],
  filterValue: ColorBitsFilter
): Row<D>[] {
  const F = filterValue.color;
  return rows.filter((row) => {
    const C = row.original.colors;
    let ret: number | boolean = true;
    if (filterValue.mode == "strict") ret = F == C;
    if (filterValue.mode == "and") ret = F & C;
    if (filterValue.mode == "or") ret = F | C;
    if (filterValue.mode == "not") ret = ~F;
    if (filterValue.mode == "strictNot") ret = F !== C;
    if (filterValue.mode == "subset") ret = (F | C) == F;
    if (filterValue.mode == "strictSubset") ret = (F | C) == F && C !== F;
    if (filterValue.mode == "superset") ret = (F & C) == F;
    if (filterValue.mode == "strictSuperset") ret = (F & C) == F && C !== F;
    return filterValue.not ? !ret : ret;
  });
}

export function getRarityFilterVal(rarity: string): number {
  let ret = 0;
  switch (rarity) {
    case "token":
      ret = RARITY_TOKEN;
      break;
    case "land":
      ret = RARITY_LAND;
      break;
    case "common":
      ret = RARITY_COMMON;
      break;
    case "uncommon":
      ret = RARITY_UNCOMMON;
      break;
    case "rare":
      ret = RARITY_RARE;
      break;
    case "mythic":
      ret = RARITY_MYTHIC;
      break;
    default:
      ret = 0;
      break;
  }
  return ret;
}

export function rarityFilterFn<D extends TableData>(
  rows: Row<D>[],
  _columnIds: string[],
  filterValue: RarityBitsFilter
): Row<D>[] {
  const F = filterValue.rarity;
  return rows.filter((row) => {
    const R = row.original.rarityVal;
    let ret: number | boolean = true;
    if (filterValue.mode == "=") ret = R === F;
    if (filterValue.mode == ":") ret = R & F;
    if (filterValue.mode == "!=") ret = R !== F;
    if (filterValue.mode == "<=") ret = R <= F;
    if (filterValue.mode == "<") ret = R <= F;
    if (filterValue.mode == ">=") ret = R >= F;
    if (filterValue.mode == ">") ret = R > F;
    return filterValue.not ? !ret : ret;
  });
}

export function formatFilterFn<D extends TableData>(
  rows: Row<D>[],
  _columnIds: string[],
  filterValue: StringFilter
): Row<D>[] {
  const F: string = Object.keys(usedFormats)
    .filter((f) => f.toLowerCase() == filterValue.string.toLowerCase())
    ?.map((f) => usedFormats[f])[0];

  return rows.filter((row) => {
    const ret = row.original.format.includes(F);
    return filterValue.not ? !ret : ret;
  });
}

export function inArrayFilterFn<D extends TableData>(
  rows: Row<D>[],
  columnIds: string[],
  filterValue: StringFilter
): Row<D>[] {
  const [id] = columnIds;
  const F: string = Object.keys(usedFormats)
    .filter((f) => f.toLowerCase() == filterValue.string.toLowerCase())
    ?.map((f) => usedFormats[f])[0];

  return rows.filter((row) => {
    const ret = row.original[id].includes(F);
    return filterValue.not ? !ret : ret;
  });
}
