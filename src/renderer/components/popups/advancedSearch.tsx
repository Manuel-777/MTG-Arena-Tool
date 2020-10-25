import React, { useState, useCallback, useEffect } from "react";
import Button from "../misc/Button";

import mainCss from "../../index.css";
import popupCss from "./popups.css";
import css from "./advancedSearch.css";
import ManaFilterExt from "../misc/ManaFilterExt";
import ReactSelect from "../../../shared/ReactSelect";
import getFiltersFromQuery from "../collection/collectionQuery";
import { constants, Colors } from "mtgatool-shared";
import {
  ColorBitsFilter,
  ArrayFilter,
  RarityBitsFilter,
  RARITY_COMMON,
  RARITY_TOKEN,
  RARITY_LAND,
  RARITY_UNCOMMON,
  RARITY_RARE,
  RARITY_MYTHIC,
  MinMaxFilter,
  InBoolFilter,
} from "../collection/types";
import SetsFilter from "../misc/SetsFilter";
import { StringFilter } from "../tables/filters";
import { InputContainer } from "../misc/InputContainer";
import Flex from "../misc/Flex";

const { WHITE, BLUE, BLACK, RED, GREEN, COLORLESS } = constants;

const colorsToKey: Record<number, string> = {
  [WHITE]: "w",
  [BLUE]: "u",
  [BLACK]: "b",
  [RED]: "r",
  [GREEN]: "g",
  [COLORLESS]: "c",
};

const colorFilterOptions: Record<string, string> = {
  "Exactly these colors": "=",
  "Any of these colors": ":",
  "Strict superset of these colors": ">",
  "These colors and more": ">=",
  "Strict subset of these colors": "<",
  "At most these colors": "<=",
  "Not these colors": "!=",
};

const formatFilterOptions = [
  "Not set",
  "Standard",
  "Historic",
  "Singleton",
  "Brawl",
];

const raritySeparatorOptions: Record<string, string> = {
  "Equal to": ":",
  Not: "!=",
  Above: ">",
  "Equal or above": ">=",
  "Lower than": "<",
  "Lower or equal to": "<=",
};

const rarityFilterOptions = [
  "Any",
  "Token",
  "Land",
  "Common",
  "Uncommon",
  "Rare",
  "Mythic",
];

const inBoostersMode = ["All Cards", "In boosters", "Not in boosters"];

interface EditKeyProps {
  defaultQuery: string;
  closeCallback?: (query: string) => void;
}

export default function AdvancedSearch(props: EditKeyProps): JSX.Element {
  const { closeCallback, defaultQuery } = props;
  const defaultFilters = getFiltersFromQuery(defaultQuery);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(0);

  // Default filters
  let defaultCol: number[] = [WHITE, BLUE, BLACK, RED, GREEN];
  let defaultSets: string[] = [];
  let defaultColorFilter = "Any of these colors";
  let defaultFormat = "Not set";
  let defaultRarity = "Any";
  let defaultRaritySeparator = ":";
  let defaultCmcMin = null;
  let defaultCmcMax = null;
  let defaultOwnedMin = null;
  let defaultOwnedMax = null;
  let defaultBoosters = null;
  // Loop trough the setted filters to adjust defaults
  // console.log(defaultFilters);
  defaultFilters.map((f: any) => {
    // Guess color filter
    if (f.id == "colors") {
      const filter: ColorBitsFilter = f.value;
      const col = new Colors();
      col.addFromBits(filter.color);
      let df = ":";
      if (filter.mode == "not") df = "!=";
      if (filter.mode == "strict") df = "=";
      if (filter.mode == "strictNot") df = "!=";
      if (filter.mode == "strictSubset") df = "<";
      if (filter.mode == "strictSuperset") df = ">";
      if (filter.mode == "subset") df = "<=";
      if (filter.mode == "superset") df = ">=";
      defaultColorFilter = Object.keys(colorFilterOptions).filter(
        (k) => colorFilterOptions[k] == df
      )[0];
      defaultCol = col.get();
    }
    if (f.id == "set") {
      const filter: ArrayFilter = f.value;
      defaultSets = filter.arr;
    }
    if (f.id == "format") {
      const filter: StringFilter = f.value;
      defaultFormat = filter.string;
    }
    if (f.id == "rarity") {
      const filter: RarityBitsFilter = f.value;
      if (filter.rarity == RARITY_TOKEN) defaultRarity = "Token";
      if (filter.rarity == RARITY_LAND) defaultRarity = "Land";
      if (filter.rarity == RARITY_COMMON) defaultRarity = "Common";
      if (filter.rarity == RARITY_UNCOMMON) defaultRarity = "Uncommon";
      if (filter.rarity == RARITY_RARE) defaultRarity = "Rare";
      if (filter.rarity == RARITY_MYTHIC) defaultRarity = "Mythic";
      if (filter.mode == "=") defaultRaritySeparator = "Equal to";
      if (filter.mode == "!=") defaultRaritySeparator = "Not";
      if (filter.mode == ":") defaultRaritySeparator = "Equal to";
      if (filter.mode == ">") defaultRaritySeparator = "Above";
      if (filter.mode == ">=") defaultRaritySeparator = "Equal or above";
      if (filter.mode == "<") defaultRaritySeparator = "Lower than";
      if (filter.mode == "<=") defaultRaritySeparator = "Lower or equal to";
    }
    if (f.id == "cmc") {
      const filter: MinMaxFilter = f.value;
      if (filter.mode == ":" || filter.mode == "=") {
        defaultCmcMax = filter.value;
        defaultCmcMin = filter.value;
      }
      if (filter.mode == "<") defaultCmcMax = filter.value;
      if (filter.mode == "<=") defaultCmcMax = filter.value;
      if (filter.mode == ">") defaultCmcMin = filter.value;
      if (filter.mode == ">=") defaultCmcMin = filter.value;
    }
    if (f.id == "owned") {
      const filter: MinMaxFilter = f.value;
      if (filter.mode == ":" || filter.mode == "=") {
        defaultOwnedMax = filter.value;
        defaultCmcMin = filter.value;
      }
      if (filter.mode == "<") defaultOwnedMax = filter.value;
      if (filter.mode == "<=") defaultOwnedMax = filter.value;
      if (filter.mode == ">") defaultOwnedMin = filter.value;
      if (filter.mode == ">=") defaultOwnedMin = filter.value;
    }
    if (f.id == "boosters") {
      const filter: InBoolFilter = f.value;
      defaultBoosters = !filter.not;
    }
  });

  // Set filters state
  const [filterColors, setFilterColors] = useState<number[]>(defaultCol);
  const [filterSets, setFilterSets] = useState<string[]>(defaultSets);
  const [colorFilterOption, setColorFilterOption] = useState(
    defaultColorFilter
  );
  const [formatFilterOption, setFormatFilterOption] = useState<string>(
    defaultFormat
  );
  const [rarityFilterOption, setRarityFilterOption] = useState<string>(
    defaultRarity
  );
  const [raritySeparatorOption, setRaritySeparatorOption] = useState<string>(
    defaultRaritySeparator
  );

  const [cmcMinFilter, setCmcMinFilter] = useState<number | null>(
    defaultCmcMin
  );
  const [cmcMaxFilter, setCmcMaxFilter] = useState<number | null>(
    defaultCmcMax
  );
  const [ownedMinFilter, setOwnedMinFilter] = useState<number | null>(
    defaultOwnedMin
  );
  const [ownedMaxFilter, setOwnedMaxFilter] = useState<number | null>(
    defaultOwnedMax
  );
  const [inBoostersFilter, setInBoostersFilter] = useState<boolean | null>(
    defaultBoosters
  );

  const handleClose = useCallback(
    (q: string) => {
      if (!open) return;
      setOpen(0);
      setTimeout(() => {
        if (closeCallback) {
          closeCallback(q);
        }
      }, 300);
    },
    [closeCallback, open]
  );

  const closeOnEscape = useCallback(
    (e: KeyboardEvent): void => {
      if (!open) return;
      if (e.key === "Escape") {
        handleClose("");
      }
    },
    [handleClose, open]
  );

  useEffect(() => {
    window.addEventListener("keydown", closeOnEscape);
    return (): void => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeOnEscape]);

  const handleSearch = useCallback(() => {
    handleClose(query);
  }, [handleClose, query]);

  useEffect(() => {
    // React doesnt give css time to know there was a change
    // in the properties, adding a timeout solves that.
    setTimeout(() => {
      setOpen(1);
    }, 1);
  }, []);

  // Get new query string based on filters data
  useEffect(() => {
    const filters: string[] = [];

    const colors =
      "c" +
      (colorFilterOptions[colorFilterOption] || "=") +
      filterColors.map((c) => colorsToKey[c] || "").join("");

    const sets = "s:" + filterSets.join(",");

    const formats = "f:" + formatFilterOption.toLocaleLowerCase();

    const rarity =
      "r" +
      (raritySeparatorOptions[raritySeparatorOption] || ":") +
      rarityFilterOption.toLocaleLowerCase();

    let cmc = "";
    if (cmcMinFilter == null && cmcMaxFilter !== null)
      cmc = "cmc<=" + cmcMaxFilter;
    if (cmcMinFilter !== null && cmcMaxFilter == null)
      cmc = "cmc>=" + cmcMinFilter;
    if (cmcMinFilter !== null && cmcMinFilter == cmcMaxFilter)
      cmc = "cmc:" + cmcMinFilter;
    if (
      cmcMinFilter !== null &&
      cmcMaxFilter !== null &&
      cmcMinFilter !== cmcMaxFilter
    ) {
      filters.push("cmc>=" + cmcMinFilter);
      cmc = "cmc<=" + cmcMaxFilter;
    }
    // ditto cmc
    let owned = "";
    if (ownedMinFilter == null && ownedMaxFilter !== null)
      owned = "owned<=" + ownedMaxFilter;
    if (ownedMinFilter !== null && ownedMaxFilter == null)
      owned = "owned>=" + ownedMinFilter;
    if (ownedMinFilter !== null && ownedMinFilter == ownedMaxFilter)
      owned = "owned:" + ownedMinFilter;
    if (
      ownedMinFilter !== null &&
      ownedMaxFilter !== null &&
      ownedMinFilter !== ownedMaxFilter
    ) {
      filters.push("owned>=" + ownedMinFilter);
      owned = "owned<=" + ownedMaxFilter;
    }

    if (inBoostersFilter !== null) {
      filters.push((inBoostersFilter ? "" : "-") + "in:boosters");
    }

    filterColors.length !== 5 && filters.push(colors);
    filterSets.length > 0 && filters.push(sets);
    formatFilterOption !== "Not set" && filters.push(formats);
    rarityFilterOption !== "Any" && filters.push(rarity);
    (cmcMinFilter !== null || cmcMaxFilter !== null) && filters.push(cmc);
    (ownedMinFilter !== null || ownedMaxFilter !== null) && filters.push(owned);
    setQuery(filters.join(" "));
  }, [
    inBoostersFilter,
    cmcMinFilter,
    cmcMaxFilter,
    ownedMinFilter,
    ownedMaxFilter,
    rarityFilterOption,
    raritySeparatorOption,
    formatFilterOption,
    filterSets,
    filterColors,
    colorFilterOption,
  ]);

  return (
    <div
      className={popupCss.popupBackground}
      style={{
        opacity: open * 2,
        backgroundColor: `rgba(0, 0, 0, ${0.5 * open})`,
      }}
      onClick={(): void => {
        handleClose("");
      }}
    >
      <div
        className={popupCss.popupDiv}
        style={{
          position: "relative",
          overflowY: `auto`,
          maxHeight: `calc(100vh - 80px)`,
          height: `min(${open * 450}px, calc(100vh - 64px))`,
          maxWidth: `${open * 800}px`,
          color: "var(--color-back)",
        }}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "32px",
            zIndex: 1,
            cursor: "pointer",
          }}
          title="Cancel"
          onClick={(): void => {
            handleClose("");
          }}
        >
          X
        </div>
        <div className={mainCss.messageSub}>Advanced Search</div>
        <div
          style={{
            height: "24px",
            lineHeight: "24px",
            marginBottom: "26px",
            color: "var(--color-text-dark)",
            fontSize: "18px",
          }}
          className={mainCss.messageSub}
        >
          {query == ""
            ? "Use the filters to generate a query, then search to begin!"
            : query}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ManaFilterExt filter={filterColors} callback={setFilterColors} />
          <ReactSelect
            options={Object.keys(colorFilterOptions)}
            current={colorFilterOption}
            callback={(opt: string): void => {
              setColorFilterOption(opt);
            }}
          />
        </div>
        <SetsFilter filtered={filterSets} callback={setFilterSets} />
        <div className={css.searchLine}>
          <div style={{ lineHeight: "32px" }}>Format: </div>
          <ReactSelect
            options={formatFilterOptions}
            current={formatFilterOption}
            callback={(opt: string): void => {
              setFormatFilterOption(opt);
            }}
          />
        </div>
        <div className={css.searchLine}>
          <div style={{ lineHeight: "32px" }}>Rarity: </div>
          <ReactSelect
            options={Object.keys(raritySeparatorOptions)}
            current={raritySeparatorOption}
            callback={(opt: string): void => {
              setRaritySeparatorOption(opt);
            }}
          />
          <ReactSelect
            options={rarityFilterOptions}
            current={rarityFilterOption}
            callback={(opt: string): void => {
              setRarityFilterOption(opt);
            }}
          />
        </div>
        <div className={css.searchLine}>
          <div style={{ lineHeight: "32px" }}>In Boosters: </div>
          <ReactSelect
            options={inBoostersMode}
            current={
              inBoostersFilter !== null
                ? inBoostersFilter
                  ? inBoostersMode[1]
                  : inBoostersMode[2]
                : inBoostersMode[0]
            }
            callback={(mode: string): void => {
              if (mode == inBoostersMode[1]) {
                setInBoostersFilter(true);
              } else if (mode == inBoostersMode[2]) {
                setInBoostersFilter(false);
              } else {
                setInBoostersFilter(null);
              }
            }}
          />
        </div>
        <div className={css.searchLine}>
          <div style={{ lineHeight: "32px" }}>CMC: </div>
          <Flex style={{ maxWidth: "248px" }}>
            <InputContainer title="Min CMC">
              <input
                value={cmcMinFilter ?? ""}
                onChange={(e): void =>
                  setCmcMinFilter(
                    e.target.value !== "" ? parseInt(e.target.value) : null
                  )
                }
                placeholder={"min"}
              />
            </InputContainer>
            <InputContainer title="Max CMC">
              <input
                value={cmcMaxFilter ?? ""}
                onChange={(e): void =>
                  setCmcMaxFilter(
                    e.target.value !== "" ? parseInt(e.target.value) : null
                  )
                }
                placeholder={"max"}
              />
            </InputContainer>
          </Flex>
        </div>
        <div className={css.searchLine}>
          <div style={{ lineHeight: "32px" }}>Owned: </div>
          <Flex style={{ maxWidth: "248px" }}>
            <InputContainer title="Min">
              <input
                value={ownedMinFilter ?? ""}
                onChange={(e): void =>
                  setOwnedMinFilter(
                    e.target.value !== "" ? parseInt(e.target.value) : null
                  )
                }
                placeholder={"min"}
              />
            </InputContainer>
            <InputContainer title="Max">
              <input
                value={ownedMaxFilter ?? ""}
                onChange={(e): void =>
                  setOwnedMaxFilter(
                    e.target.value !== "" ? parseInt(e.target.value) : null
                  )
                }
                placeholder={"max"}
              />
            </InputContainer>
          </Flex>
        </div>
        <Button
          style={{ margin: "16px auto" }}
          text="Search"
          onClick={handleSearch}
        />
      </div>
    </div>
  );
}
