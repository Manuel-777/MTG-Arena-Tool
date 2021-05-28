import _, { isEqual } from "lodash";
import { Row } from "react-table";
import { StringFilter } from "../tables/filters";
import { TableData } from "../tables/types";
import {
  RARITY_TOKEN,
  RARITY_LAND,
  RARITY_COMMON,
  RARITY_UNCOMMON,
  RARITY_RARE,
  RARITY_MYTHIC,
  ColorBitsFilter,
  RarityBitsFilter,
  ArrayFilter,
  MinMaxFilter,
  InBoolFilter,
} from "./types";
import { usedFormats } from "../../rendererUtil";
import {
  historicAnthology,
  historicAnthology2,
  historicAnthology3,
  historicAnthology4,
  historicAnthology5,
} from "./customSets";

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
    if (F == "ha4" && historicAnthology4.includes(row.original.id)) res = true;
    if (F == "ha5" && historicAnthology5.includes(row.original.id)) res = true;

    res =
      res ||
      row.original.setCode.indexOf(F) !== -1 ||
      row.original.set.toLowerCase().indexOf(F) !== -1;
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
    if (filterValue.mode == "<") ret = R < F;
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

export function arrayFilterFn<D extends TableData>(
  rows: Row<D>[],
  _columnIds: string[],
  filterValue: ArrayFilter
): Row<D>[] {
  const { arr, mode, not } = filterValue;
  const F = arr?.map((s) => s.toLowerCase()) || [];
  return rows.filter((row) => {
    const S: string[] = [row.original.setCode];
    if (historicAnthology.includes(row.original.id)) S.push("ha1");
    if (historicAnthology2.includes(row.original.id)) S.push("ha2");
    if (historicAnthology3.includes(row.original.id)) S.push("ha3");
    if (historicAnthology4.includes(row.original.id)) S.push("ha4");

    let ret: number | boolean = true;
    if (mode == "=") ret = isEqual(S, F);
    if (mode == ":") ret = _.intersection(S, F).length !== 0;
    if (mode == "!=") ret = !isEqual(S, F);
    /*
    // Not sure how to implement these
    if (mode == "<=") ret = R <= F;
    if (mode == "<") ret = R <= F;
    if (mode == ">=") ret = R >= F;
    if (mode == ">") ret = R > F;
    */
    return not ? !ret : ret;
  });
}

export function minMaxFilterFn<D extends TableData>(
  rows: Row<D>[],
  column: string[],
  filterValue: MinMaxFilter
): Row<D>[] {
  const F = filterValue.value;
  return rows.filter((row) => {
    const R = row.original[column[0]];
    let ret: number | boolean = true;
    if (filterValue.mode == "=") ret = R === F;
    if (filterValue.mode == ":") ret = R & F;
    if (filterValue.mode == "!=") ret = R !== F;
    if (filterValue.mode == "<=") ret = R <= F;
    if (filterValue.mode == "<") ret = R < F;
    if (filterValue.mode == ">=") ret = R >= F;
    if (filterValue.mode == ">") ret = R > F;
    return filterValue.not ? !ret : ret;
  });
}

export function inBoolFilterFn<D extends TableData>(
  rows: Row<D>[],
  _column: string[],
  filterValue: InBoolFilter
): Row<D>[] {
  const F = filterValue.value;
  return rows.filter((row) => {
    const R = row.original[filterValue.type];
    let ret: number | boolean = true;
    if (filterValue.mode == "=") ret = R === F;
    if (filterValue.mode == ":") ret = R === F;
    return filterValue.not ? !ret : ret;
  });
}
