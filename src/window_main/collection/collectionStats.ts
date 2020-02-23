/* eslint-disable @typescript-eslint/no-use-before-define */
import { shell } from "electron";
import Colors from "../../shared/colors";
import { CARD_RARITIES, COLLECTION_SETS_MODE } from "../../shared/constants";
import db from "../../shared/database";
import { createDiv, createLabel, createInput } from "../../shared/dom-fns";
import pd from "../../shared/player-data";
import { getMissingCardCounts } from "../../shared/util";
import createSelect from "../createSelect";
import { formatNumber, getLocalState } from "../renderer-util";
import database from "../../shared/database";

const ALL_CARDS = "All cards";
const SINGLETONS = "Singletons (at least one)";
const FULL_SETS = "Full sets (all 4 copies)";
let countMode = ALL_CARDS;
let rareDraftFactor = 3;
let mythicDraftFactor = 0.14;
let boosterWinFactor = 1.2;

class CountStats {
  public owned: number;
  public total: number;
  public unique: number;
  public complete: number;
  public wanted: number;
  public uniqueWanted: number;
  public uniqueOwned: number;

  constructor(
    owned = 0,
    total = 0,
    unique = 0,
    complete = 0,
    wanted = 0,
    uniqueWanted = 0,
    uniqueOwned = 0
  ) {
    this.owned = owned;
    this.total = total;
    this.unique = unique;
    this.complete = complete; // all 4 copies of a card
    this.wanted = wanted;
    this.uniqueWanted = uniqueWanted;
    this.uniqueOwned = uniqueOwned;
  }

  get percentage(): number {
    if (this.total) {
      return (this.owned / this.total) * 100;
    } else {
      return 100;
    }
  }
}

export class SetStats {
  public set: string;
  public cards: { [key: string]: CardStats[] }[];
  public common: CountStats;
  public uncommon: CountStats;
  public rare: CountStats;
  public mythic: CountStats;
  public boosters: number;
  public boosterRares: number;
  public boosterMythics: number;

  constructor(set: string) {
    this.set = set;
    this.cards = [];
    this.common = new CountStats();
    this.uncommon = new CountStats();
    this.rare = new CountStats();
    this.mythic = new CountStats();
    this.boosters = 0;
    this.boosterRares = 0;
    this.boosterMythics = 0;
  }

  get all(): CountStats {
    return [
      new CountStats(),
      this.common,
      this.uncommon,
      this.rare,
      this.mythic
    ].reduce((acc, c) => {
      acc.owned += c.owned;
      acc.total += c.total;
      acc.unique += c.unique;
      acc.complete += c.complete;
      acc.wanted += c.wanted;
      acc.uniqueOwned += c.uniqueOwned;
      return acc;
    });
  }
}

export interface CardStats {
  id: number;
  owned: number;
  wanted: number;
}

export interface CollectionStats {
  [set: string]: SetStats;
}

const chanceBoosterHasMythic = 0.125; // assume 1/8 of packs have a mythic
const chanceBoosterHasRare = 1 - chanceBoosterHasMythic;
const chanceNotWildCard = 11 / 12; // assume (1/24 mythic + 1/24 rare) WC instead of card
export function estimateBoosterRares(boosterCount: number): number {
  return boosterCount * chanceBoosterHasRare * chanceNotWildCard;
}
export function estimateBoosterMythics(boosterCount: number): number {
  return boosterCount * chanceBoosterHasMythic * chanceNotWildCard;
}
const byId = (id: string): HTMLElement | null => document.getElementById(id);

export function getCollectionStats(
  cardIds: (string | number)[]
): CollectionStats {
  const wantedCards: { [key: string]: number } = {};
  pd.deckList
    .filter(deck => deck && !deck.archived)
    .forEach(deck => {
      const missing = getMissingCardCounts(deck);
      Object.entries(missing).forEach(([grpid, count]) => {
        wantedCards[grpid] = Math.max(wantedCards[grpid] ?? 0, count);
      });
    });

  const stats: { [key: string]: SetStats } = {
    complete: new SetStats("complete")
  };
  Object.keys(db.sets).forEach(setName => {
    const setStats = new SetStats(setName);
    setStats.boosters = pd.economy.boosters
      .filter(
        ({ collationId }: { collationId: number }) =>
          database.sets[setName]?.collation === collationId
      )
      .reduce(
        (accumulator: number, booster: { count: number }) =>
          accumulator + booster.count,
        0
      );
    setStats.boosterRares = estimateBoosterRares(setStats.boosters);
    setStats.boosterMythics = estimateBoosterMythics(setStats.boosters);
    stats[setName] = setStats;
  });
  cardIds.forEach(cardId => {
    const card = db.card(cardId);
    if (!card) return;
    if (!card.collectible || card.rarity === "land") return;
    if (!(card.set in stats)) return;

    const obj: CardStats = {
      id: card.id,
      owned: 0,
      wanted: 0
    };
    // add to totals
    stats[card.set][card.rarity].total += 4;
    stats[card.set][card.rarity].unique += 1;
    stats.complete[card.rarity].total += 4;
    stats.complete[card.rarity].unique += 1;
    // add cards we own
    if (pd.cards.cards[card.id] !== undefined) {
      const owned = pd.cards.cards[card.id];
      obj.owned = owned;
      stats[card.set][card.rarity].owned += owned;
      stats[card.set][card.rarity].uniqueOwned += 1;
      stats.complete[card.rarity].owned += owned;
      stats.complete[card.rarity].uniqueOwned += 1;
      // count complete sets we own
      if (owned == 4) {
        stats[card.set][card.rarity].complete += 1;
        stats.complete[card.rarity].complete += 1;
      }
    }
    const col = new Colors();
    col.addFromCost(card.cost);
    const colorIndex = col.getBaseColor();
    // count cards we know we want across decks
    const wanted = wantedCards[card.id];
    if (wanted) {
      stats[card.set][card.rarity].wanted += wanted;
      stats.complete[card.rarity].wanted += wanted;
      // count unique cards we know we want across decks
      stats[card.set][card.rarity].uniqueWanted += Math.min(1, wanted);
      stats.complete[card.rarity].uniqueWanted += Math.min(1, wanted);
      obj.wanted = wanted;
    }
    if (!stats[card.set].cards[colorIndex])
      stats[card.set].cards[colorIndex] = {};
    if (!stats[card.set].cards[colorIndex][card.rarity])
      stats[card.set].cards[colorIndex][card.rarity] = [];
    stats[card.set].cards[colorIndex][card.rarity].push(obj);
  });
  return stats;
}

function renderCompletionDiv(
  countStats: CountStats,
  image: string,
  title: string
): HTMLElement {
  let numerator, denominator;
  switch (countMode) {
    case SINGLETONS:
      numerator = countStats.uniqueOwned;
      denominator = countStats.unique;
      break;
    case FULL_SETS:
      numerator = countStats.complete;
      denominator = countStats.unique;
      break;
    default:
    case ALL_CARDS:
      numerator = countStats.owned;
      denominator = countStats.total;
      break;
  }
  const completionRatio = numerator / denominator;

  const completionDiv = createDiv(["stats_set_completion"]);

  const setIcon = createDiv(["stats_set_icon"]);
  setIcon.style.backgroundImage = image;
  const setIconSpan = document.createElement("span");
  setIconSpan.innerHTML = title;
  setIcon.appendChild(setIconSpan);
  completionDiv.appendChild(setIcon);

  const wrapperDiv = createDiv([]);
  const detailsDiv = createDiv(["stats_set_details"]);

  const percentSpan = document.createElement("span");
  percentSpan.innerHTML = completionRatio.toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2
  });
  detailsDiv.appendChild(percentSpan);

  const countSpan = document.createElement("span");
  countSpan.innerHTML = numerator + " / " + denominator;
  detailsDiv.appendChild(countSpan);

  const wantedSpan = document.createElement("span");
  wantedSpan.innerHTML =
    countStats.wanted +
    " <abbr title='missing copies of cards in current decks'>wanted cards</abbr>";
  detailsDiv.appendChild(wantedSpan);

  wrapperDiv.appendChild(detailsDiv);
  completionDiv.appendChild(wrapperDiv);

  const setBar = createDiv(["stats_set_bar"]);
  setBar.style.width = Math.round(completionRatio * 100) + "%";

  completionDiv.appendChild(setBar);
  return completionDiv;
}

function blurIfEnterKey(element: HTMLInputElement) {
  return (e: KeyboardEvent): void => {
    if (e.keyCode === 13) {
      element.blur();
    }
  };
}

export function createInventoryStats(
  container: HTMLElement,
  setStats: SetStats,
  updateCallback: () => void
): void {
  const top = createDiv(["decklist_top"]);
  top.style.margin = "12px";
  top.style.padding = "0";
  top.style.color = "var(--color-light)";
  top.style.display = "flex";
  top.style.alignItems = "center";
  top.appendChild(createDiv(["economy_wc", "wc_common"]));
  top.appendChild(createDiv([], formatNumber(pd.economy.wcCommon)));
  top.appendChild(createDiv(["economy_wc", "wc_uncommon"]));
  top.appendChild(createDiv([], formatNumber(pd.economy.wcUncommon)));
  top.appendChild(createDiv(["economy_wc", "wc_rare"]));
  top.appendChild(createDiv([], formatNumber(pd.economy.wcRare)));
  top.appendChild(createDiv(["economy_wc", "wc_mythic"]));
  top.appendChild(createDiv([], formatNumber(pd.economy.wcMythic)));

  const flex = createDiv(["flex_item"]);
  const mainstats = createDiv(["main_stats"]);

  // Counting Mode Selector
  const completionLabel = document.createElement("label");
  completionLabel.innerHTML = "count:";
  mainstats.appendChild(completionLabel);
  const countModeDiv = createDiv(["stats_count_div"]);
  const countModeSelect = createSelect(
    countModeDiv,
    [ALL_CARDS, SINGLETONS, FULL_SETS],
    countMode,
    selectedMode => {
      countMode = selectedMode;
      updateCallback();
    },
    "stats_count_select"
  );
  countModeSelect.style.margin = "12px auto auto 4px";
  countModeSelect.style.textAlign = "left";
  countModeSelect.style.width = "180px";
  countModeSelect.style.display = "inline-flex";
  mainstats.appendChild(countModeSelect);

  // Complete collection sats
  const rs = renderSetStats(setStats, "", "Total Completion", true);
  mainstats.appendChild(rs);

  const wanted: { [key: string]: number } = {};
  const missing: { [key: string]: number } = {};
  CARD_RARITIES.filter(rarity => rarity !== "land").forEach(rarityCode => {
    const rarity = rarityCode.toLowerCase();
    const countStats = (setStats as any)[rarity];
    if (countStats.total > 0) {
      const capitalizedRarity = rarity[0].toUpperCase() + rarity.slice(1) + "s";
      const globalStyle = getComputedStyle(document.body);
      const compDiv = renderCompletionDiv(
        countStats,
        globalStyle.getPropertyValue(`--wc_${rarity}_png`),
        capitalizedRarity
      );
      compDiv.classList.add("stats_sidebar");
      mainstats.appendChild(compDiv);
    }
    wanted[rarity] = countStats.wanted;
    missing[rarity] = countStats.total - countStats.owned;
  });

  const { collectionTableMode, isBoosterMathValid } = getLocalState();
  if (isBoosterMathValid && collectionTableMode === COLLECTION_SETS_MODE) {
    const constantsLabel = createDiv(["deck_name"], "Draft Estimator*:");
    constantsLabel.style.width = "100%";
    mainstats.appendChild(constantsLabel);

    // Rares-per-draft Factor
    const rareLabel = createLabel(["but_container_label"], "rares/draft:");
    const rareInputCont = createDiv(["input_container"]);
    const rareInput = createInput([], "", {
      type: "text",
      id: "collection_rares_per_draft",
      autocomplete: "off",
      placeholder: "3",
      value: rareDraftFactor
    });
    rareInput.addEventListener("keyup", blurIfEnterKey(rareInput));
    rareInput.addEventListener("focusout", () => {
      const inputEl = byId("collection_rares_per_draft");
      if (inputEl) {
        const inputValue = (inputEl as HTMLInputElement).value;
        rareDraftFactor = parseFloat(inputValue);
        updateCallback();
      }
    });
    rareInputCont.appendChild(rareInput);
    rareLabel.appendChild(rareInputCont);
    mainstats.appendChild(rareLabel);

    // Mythics-per-draft Factor
    const mythicLabel = createLabel(["but_container_label"], "mythics/draft:");
    const mythicInputCont = createDiv(["input_container"]);
    const mythicInput = createInput([], "", {
      type: "text",
      id: "collection_mythics_per_draft",
      autocomplete: "off",
      placeholder: "3",
      value: mythicDraftFactor
    });
    mythicInput.addEventListener("keyup", blurIfEnterKey(mythicInput));
    mythicInput.addEventListener("focusout", () => {
      const inputEl = byId("collection_mythics_per_draft");
      if (inputEl) {
        const inputValue = (inputEl as HTMLInputElement).value;
        mythicDraftFactor = parseFloat(inputValue);
        updateCallback();
      }
    });
    mythicInputCont.appendChild(mythicInput);
    mythicLabel.appendChild(mythicInputCont);
    mainstats.appendChild(mythicLabel);

    // Boosters-per-draft Factor
    const boosterLabel = createLabel(
      ["but_container_label"],
      "boosters/draft:"
    );
    const boosterInputCont = createDiv(["input_container"]);
    const boosterInput = createInput([], "", {
      type: "text",
      id: "collection_boosters_per_draft",
      autocomplete: "off",
      placeholder: "3",
      value: boosterWinFactor
    });
    boosterInput.addEventListener("keyup", blurIfEnterKey(boosterInput));
    boosterInput.addEventListener("focusout", () => {
      const inputEl = byId("collection_boosters_per_draft");
      if (inputEl) {
        const inputValue = (inputEl as HTMLInputElement).value;
        boosterWinFactor = parseFloat(inputValue);
        updateCallback();
      }
    });
    boosterInputCont.appendChild(boosterInput);
    boosterLabel.appendChild(boosterInputCont);
    mainstats.appendChild(boosterLabel);

    const creditLink = createDiv(
      ["settings_note"],
      "<i><a>*[original by caliban on mtggoldfish]</a></i>"
    );
    creditLink.style.opacity = "0.6";
    creditLink.addEventListener("click", () =>
      shell.openExternal(
        "https://www.mtggoldfish.com/articles/collecting-mtg-arena-part-1-of-2"
      )
    );
    mainstats.appendChild(creditLink);
  }

  flex.appendChild(mainstats);
  container.appendChild(top);
  container.appendChild(flex);
}

export function renderSetStats(
  setStats: SetStats,
  setIconCode: string,
  setName: string,
  isSidebar?: boolean
): HTMLElement {
  const iconSvg = db.sets[setIconCode]?.svg ?? db.defaultSet?.svg;
  const setIcon = iconSvg
    ? `url(data:image/svg+xml;base64,${iconSvg})`
    : "url(../images/notfound.png)";
  const setDiv = renderCompletionDiv(setStats.all, setIcon, setName);
  if (isSidebar) {
    setDiv.classList.add("stats_sidebar");
  }
  return setDiv;
}

export function createWantedStats(
  container: HTMLElement,
  setStats: SetStats
): void {
  const unownedUniqueRares =
    setStats["rare"].unique - setStats["rare"].complete;
  const unownedUniqueMythics =
    setStats["mythic"].unique - setStats["mythic"].complete;
  const { isBoosterMathValid } = getLocalState();

  if (unownedUniqueRares || unownedUniqueMythics) {
    // estimate stockpiled unowned rares and mythics
    if (setStats.boosters) {
      const boostersDiv = createDiv(["stats_set_completion"]);
      const boostersIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
      boostersIcon.style.height = "30px";
      const boostersSpan = document.createElement("span");
      boostersSpan.innerHTML = `<i>${
        setStats.boosters
      } current boosters: ~${setStats.boosterRares.toFixed(
        2
      )} new rares, ~${setStats.boosterMythics.toFixed(2)} new mythics</i>`;
      boostersSpan.style.fontSize = "13px";
      boostersIcon.appendChild(boostersSpan);
      boostersDiv.appendChild(boostersIcon);
      container.appendChild(boostersDiv);
    }

    // estimate unowned rares and mythics in next draft pool (P1P1, P2P1, P3P1)
    if (isBoosterMathValid) {
      const newRares = (
        (chanceBoosterHasRare * unownedUniqueRares * 3) /
        setStats["rare"].unique
      ).toFixed(2);
      const newMythics = (
        (chanceBoosterHasMythic * unownedUniqueMythics * 3) /
        setStats["mythic"].unique
      ).toFixed(2);
      const draftNewDiv = createDiv(["stats_set_completion"]);
      const draftNewIcon = createDiv(["stats_set_icon", "economy_ticket"]);
      draftNewIcon.style.height = "30px";
      const draftNewSpan = document.createElement("span");
      draftNewSpan.innerHTML = `<i>next draft pool: ~${newRares} new rares, ~${newMythics} new mythics</i>`;
      draftNewSpan.style.fontSize = "13px";
      draftNewIcon.appendChild(draftNewSpan);
      draftNewDiv.appendChild(draftNewIcon);
      container.appendChild(draftNewDiv);
    }
  }

  if (!isBoosterMathValid) {
    const helpDiv = createDiv(["stats_set_completion"]);
    const helpIcon = createDiv(["stats_set_icon", "notification"]);
    helpIcon.style.height = "30px";
    helpIcon.style.display = "initial";
    helpIcon.style.alignSelf = "initial";
    const helpSpan = document.createElement("span");
    helpSpan.innerHTML = `<i>use "Boosters" preset to show additional stats</i>`;
    helpSpan.style.fontSize = "13px";
    helpIcon.appendChild(helpSpan);
    helpDiv.appendChild(helpIcon);
    container.appendChild(helpDiv);
  } else if (setStats["rare"].uniqueWanted || setStats["mythic"].uniqueWanted) {
    const wantedText =
      "<abbr title='missing copy of a card in a current deck'>wanted</abbr>";

    // chance that the next booster opened contains a wanted card
    const chanceRareWanted = (
      (chanceBoosterHasRare * setStats["rare"].uniqueWanted) /
      unownedUniqueRares
    ).toLocaleString([], {
      style: "percent",
      maximumSignificantDigits: 2
    });
    const chanceMythicWanted = (
      (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted) /
      unownedUniqueMythics
    ).toLocaleString([], {
      style: "percent",
      maximumSignificantDigits: 2
    });
    const wantedDiv = createDiv(["stats_set_completion"]);
    const wantedIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
    wantedIcon.style.height = "30px";
    const wantedSpan = document.createElement("span");
    wantedSpan.innerHTML = `<i>next booster: ~${chanceRareWanted} ${wantedText} rare, ~${chanceMythicWanted} ${wantedText} mythic</i>`;
    wantedSpan.style.fontSize = "13px";
    wantedIcon.appendChild(wantedSpan);
    wantedDiv.appendChild(wantedIcon);
    container.appendChild(wantedDiv);

    // chance that the next draft pool (P1P1, P2P1, P3P1) contains a wanted card
    const chanceBoosterRareWanted = (
      (chanceBoosterHasRare * setStats["rare"].uniqueWanted * 3) /
      setStats["rare"].unique
    ).toLocaleString([], {
      style: "percent",
      maximumSignificantDigits: 2
    });
    const chanceBoosterMythicWanted = (
      (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted * 3) /
      setStats["mythic"].unique
    ).toLocaleString([], {
      style: "percent",
      maximumSignificantDigits: 2
    });
    const draftWantedDiv = createDiv(["stats_set_completion"]);
    const draftWantedIcon = createDiv(["stats_set_icon", "economy_ticket"]);
    draftWantedIcon.style.height = "30px";
    const draftWantedSpan = document.createElement("span");
    draftWantedSpan.innerHTML = `<i>next draft pool: ~${chanceBoosterRareWanted} ${wantedText} rare, ~${chanceBoosterMythicWanted} ${wantedText} mythic</i>`;
    draftWantedSpan.style.fontSize = "13px";
    draftWantedIcon.appendChild(draftWantedSpan);
    draftWantedDiv.appendChild(draftWantedIcon);
    container.appendChild(draftWantedDiv);
  }

  // estimate remaining drafts to collect entire set
  // https://www.mtggoldfish.com/articles/collecting-mtg-arena-part-1-of-2
  // D = (T - P*7/8*11/12 - R)/(N+W*7/8*11/12)
  if (isBoosterMathValid && (unownedUniqueRares || unownedUniqueMythics)) {
    const remainingRares =
      setStats["rare"].total - setStats["rare"].owned - setStats.boosterRares;
    const rareEstimate = Math.ceil(
      remainingRares /
        (rareDraftFactor + estimateBoosterRares(boosterWinFactor))
    );
    const remainingMythics =
      setStats["mythic"].total -
      setStats["mythic"].owned -
      setStats.boosterMythics;
    const mythicEstimate = Math.ceil(
      remainingMythics /
        (mythicDraftFactor + estimateBoosterMythics(boosterWinFactor))
    );
    const draftCompleteDiv = createDiv(["stats_set_completion"]);
    const draftCompleteIcon = createDiv(["stats_set_icon", "icon_2"]);
    draftCompleteIcon.style.height = "30px";
    const draftCompleteSpan = document.createElement("span");
    draftCompleteSpan.innerHTML = `<i>drafts to complete set*: ~${rareEstimate} for rares, ~${mythicEstimate} for mythics</i>`;
    draftCompleteSpan.style.fontSize = "13px";
    draftCompleteIcon.appendChild(draftCompleteSpan);
    draftCompleteDiv.appendChild(draftCompleteIcon);
    container.appendChild(draftCompleteDiv);
  }
}
