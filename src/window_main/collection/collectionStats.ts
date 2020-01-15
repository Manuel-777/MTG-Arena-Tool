import Colors from "../../shared/colors";
import { CARD_RARITIES } from "../../shared/constants";
import db from "../../shared/database";
import { createDiv } from "../../shared/dom-fns";
import pd from "../../shared/player-data";
import { getMissingCardCounts } from "../../shared/util";
import createSelect from "../createSelect";
import { formatNumber } from "../renderer-util";

const ALL_CARDS = "All cards";
const SINGLETONS = "Singletons (at least one)";
const FULL_SETS = "Full sets (all 4 copies)";
let countMode = ALL_CARDS;

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

  constructor(set: string) {
    this.set = set;
    this.cards = [];
    this.common = new CountStats();
    this.uncommon = new CountStats();
    this.rare = new CountStats();
    this.mythic = new CountStats();
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
  Object.keys(db.sets).forEach(
    setName => (stats[setName] = new SetStats(setName))
  );
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

  const completionLabel = document.createElement("label");
  completionLabel.innerHTML = "count:";
  mainstats.appendChild(completionLabel);

  // Counting Mode Selector
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
  const chanceBoosterHasMythic = 0.125; // assume 1/8 of packs have a mythic
  const chanceBoosterHasRare = 1 - chanceBoosterHasMythic;
  const wantedText =
    "<abbr title='missing copy of a card in a current deck'>wanted</abbr>";

  // chance that the next booster opened contains a rare missing from one of our decks
  const possibleRares = setStats["rare"].unique - setStats["rare"].complete;
  if (possibleRares && setStats["rare"].uniqueWanted) {
    const chanceBoosterRareWanted = (
      (chanceBoosterHasRare * setStats["rare"].uniqueWanted) /
      possibleRares
    ).toLocaleString([], {
      style: "percent",
      maximumSignificantDigits: 2
    });
    const rareWantedDiv = createDiv(["stats_set_completion"]);
    const rareWantedIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
    rareWantedIcon.style.height = "30px";
    const rareWantedSpan = document.createElement("span");
    rareWantedSpan.innerHTML = `<i>~${chanceBoosterRareWanted} chance next booster has ${wantedText} rare.</i>`;
    rareWantedSpan.style.fontSize = "13px";
    rareWantedIcon.appendChild(rareWantedSpan);
    rareWantedDiv.appendChild(rareWantedIcon);
    container.appendChild(rareWantedDiv);
  }

  // chance that the next booster opened contains a mythic missing from one of our decks
  const possibleMythics =
    setStats["mythic"].unique - setStats["mythic"].complete;
  if (possibleMythics && setStats["mythic"].uniqueWanted) {
    const chanceBoosterMythicWanted = (
      (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted) /
      possibleMythics
    ).toLocaleString([], {
      style: "percent",
      maximumSignificantDigits: 2
    });
    const mythicWantedDiv = createDiv(["stats_set_completion"]);
    const mythicWantedIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
    mythicWantedIcon.style.height = "30px";
    const mythicWantedSpan = document.createElement("span");
    mythicWantedSpan.innerHTML = `<i>~${chanceBoosterMythicWanted} chance next booster has ${wantedText} mythic.</i>`;
    mythicWantedSpan.style.fontSize = "13px";
    mythicWantedIcon.appendChild(mythicWantedSpan);
    mythicWantedDiv.appendChild(mythicWantedIcon);
    container.appendChild(mythicWantedDiv);
  }
}
