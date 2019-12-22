import anime from "animejs";

import { CARD_RARITIES, EASING_DEFAULT } from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import Colors from "../shared/colors";
import { queryElements as $$, createDiv } from "../shared/dom-fns";
import { addCardHover } from "../shared/cardHover";
import { getMissingCardCounts } from "../shared/util";
import {
  MULTI,
  COLORLESS,
  WHITE,
  BLUE,
  BLACK,
  GREEN,
  RED
} from "../shared/constants.js";

import createSelect from "./createSelect";
import { changeBackground } from "./renderer-util";

const ALL_CARDS = "All cards";
const SINGLETONS = "Singletons (at least one)";
const FULL_SETS = "Full sets (all 4 copies)";
const BOOSTER_CARDS = "Only in Boosters";

let countMode = ALL_CARDS;
let displayMode = BOOSTER_CARDS;
let defaultSetName = "Complete collection";

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

interface CardStats {
  id: number;
  owned: number;
  wanted: number;
}

function getCollectionStats(): { [key: string]: SetStats } {
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
  db.cardList.forEach(card => {
    if (!card.collectible || card.rarity === "land") return;
    if (!(card.set in stats)) return;
    if (!card.booster && displayMode === BOOSTER_CARDS) return;
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

function openSetStatsDetails(setStats: SetStats, setName: string): void {
  defaultSetName = setName;
  const substats = $$(".sub_stats")[0];
  substats.innerHTML = "";

  const label = document.createElement("label");
  label.innerHTML = setName + " completion";
  substats.appendChild(label);

  // Draw completion table for this set
  if (setName != "Complete collection") {
    const table = createDiv(["completion_table"]);
    for (let color = 0; color < 7; color++) {
      let tile = "";
      switch (color + 1) {
        case WHITE:
          tile = "mana_white";
          break;
        case BLUE:
          tile = "mana_blue";
          break;
        case BLACK:
          tile = "mana_black";
          break;
        case RED:
          tile = "mana_red";
          break;
        case GREEN:
          tile = "mana_green";
          break;
        case COLORLESS:
          tile = "mana_colorless";
          break;
        case MULTI:
          tile = "mana_multi";
          break;
      }

      const cell = createDiv(["completion_table_color_title", tile]);
      cell.style.gridArea = `1 / ${color * 5 + 1} / auto / ${color * 5 + 6}`;
      table.appendChild(cell);

      CARD_RARITIES.filter(rarity => rarity !== "land").forEach(rarityCode => {
        const rarityIndex = CARD_RARITIES.indexOf(rarityCode);
        const rarity = rarityCode.toLowerCase();
        const cell = createDiv(["completion_table_rarity_title", rarity]);
        cell.title = rarity;
        cell.style.gridArea = `2 / ${color * 5 +
          1 +
          rarityIndex} / auto / ${color * 5 + 1 + rarityIndex}`;
        table.appendChild(cell);

        // A little hacky to use "c + 1"..
        if (setStats.cards[color + 1]) {
          const cardsArray = setStats.cards[color + 1][rarity];
          if (cardsArray) {
            cardsArray.forEach((card, index) => {
              const dbCard = db.card(card.id);

              if (dbCard && (dbCard.booster || displayMode === ALL_CARDS)) {
                const classes = ["completion_table_card", "n" + card.owned];
                if (card.wanted > 0) classes.push("wanted");
                const cell = createDiv(classes, String(card.owned));
                cell.style.gridArea = `${index + 3} / ${color * 5 +
                  1 +
                  rarityIndex} / auto / ${color * 5 + 1 + rarityIndex}`;
                table.appendChild(cell);

                addCardHover(cell, dbCard);
              }
            });
          }
        }
      });
    }
    substats.appendChild(table);
  }

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
      compDiv.style.opacity = "1";
      substats.appendChild(compDiv);
    }
    wanted[rarity] = countStats.wanted;
    missing[rarity] = countStats.total - countStats.owned;
  });

  // If the set has a collationId, it means boosters for it exists
  if (db.sets[setName]?.collation) {
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
      ).toLocaleString([], { style: "percent", maximumSignificantDigits: 2 });
      const rareWantedDiv = createDiv(["stats_set_completion"]);
      const rareWantedIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
      rareWantedIcon.style.height = "30px";
      const rareWantedSpan = document.createElement("span");
      rareWantedSpan.innerHTML = `<i>~${chanceBoosterRareWanted} chance next booster has ${wantedText} rare.</i>`;
      rareWantedSpan.style.fontSize = "13px";
      rareWantedIcon.appendChild(rareWantedSpan);
      rareWantedDiv.appendChild(rareWantedIcon);
      substats.appendChild(rareWantedDiv);
    }

    // chance that the next booster opened contains a mythic missing from one of our decks
    const possibleMythics =
      setStats["mythic"].unique - setStats["mythic"].complete;
    if (possibleMythics && setStats["mythic"].uniqueWanted) {
      const chanceBoosterMythicWanted = (
        (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted) /
        possibleMythics
      ).toLocaleString([], { style: "percent", maximumSignificantDigits: 2 });
      const mythicWantedDiv = createDiv(["stats_set_completion"]);
      const mythicWantedIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
      mythicWantedIcon.style.height = "30px";
      const mythicWantedSpan = document.createElement("span");
      mythicWantedSpan.innerHTML = `<i>~${chanceBoosterMythicWanted} chance next booster has ${wantedText} mythic.</i>`;
      mythicWantedSpan.style.fontSize = "13px";
      mythicWantedIcon.appendChild(mythicWantedSpan);
      mythicWantedDiv.appendChild(mythicWantedIcon);
      substats.appendChild(mythicWantedDiv);
    }
  }
}

function renderSetStats(
  setStats: SetStats,
  setIconCode: string,
  setName: string
): HTMLElement {
  const iconSvg = db.sets[setIconCode]?.svg ?? db.defaultSet?.svg;
  const setIcon = iconSvg
    ? `url(data:image/svg+xml;base64,${iconSvg})`
    : "url(../images/notfound.png)";
  const setDiv = renderCompletionDiv(setStats.all, setIcon, setName);

  setDiv.addEventListener("mouseover", () => {
    const span = setDiv
      .getElementsByClassName("stats_set_icon")[0]
      .getElementsByTagName("span")[0];
    span.style.marginLeft = "48px";
    setDiv.style.opacity = "1";
  });
  setDiv.addEventListener("mouseout", () => {
    const span = setDiv
      .getElementsByClassName("stats_set_icon")[0]
      .getElementsByTagName("span")[0];
    span.style.marginLeft = "36px";
    setDiv.style.opacity = "0.7";
  });

  setDiv.addEventListener("click", () => {
    openSetStatsDetails(setStats, setName);
  });

  if (defaultSetName == setName) {
    setTimeout(() => {
      openSetStatsDetails(setStats, setName);
    }, 500);
  }

  return setDiv;
}

export function openSetStats(): void {
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
  const mainDiv = document.getElementById("ux_1");
  if (mainDiv) {
    mainDiv.innerHTML = "";
    mainDiv.classList.remove("flex_item");
  }
  const stats = getCollectionStats();
  // console.log(stats);

  const top = createDiv(["decklist_top"]);
  top.appendChild(createDiv(["button", "back"]));
  top.appendChild(createDiv(["deck_name"], "Collection Statistics"));
  top.appendChild(createDiv(["deck_top_colors"]));

  //changeBackground("", 67574);

  const flex = createDiv(["flex_item"]);
  const mainstats = createDiv(["main_stats"]);

  const onlyBoostersLabel = document.createElement("label");
  onlyBoostersLabel.innerHTML = "Show cards";
  mainstats.appendChild(onlyBoostersLabel);

  // Counting Mode Selector
  const displayModeDiv = createDiv(["stats_count_div"]);
  const displayModeSelect = createSelect(
    displayModeDiv,
    [BOOSTER_CARDS, ALL_CARDS],
    displayMode,
    selectedMode => {
      displayMode = selectedMode;
      openSetStats();
    },
    "stats_mode_select"
  );
  displayModeSelect.style.margin = "12px auto";
  displayModeSelect.style.textAlign = "left";
  mainstats.appendChild(displayModeSelect);

  const completionLabel = document.createElement("label");
  completionLabel.innerHTML = "Sets Completion";
  mainstats.appendChild(completionLabel);

  // Counting Mode Selector
  const countModeDiv = createDiv(["stats_count_div"]);
  const countModeSelect = createSelect(
    countModeDiv,
    [ALL_CARDS, SINGLETONS, FULL_SETS],
    countMode,
    selectedMode => {
      countMode = selectedMode;
      openSetStats();
    },
    "stats_count_select"
  );
  countModeSelect.style.margin = "12px auto auto auto";
  countModeSelect.style.textAlign = "left";
  mainstats.appendChild(countModeSelect);

  // Complete collection sats
  const rs = renderSetStats(stats.complete, "", "Complete collection");
  mainstats.appendChild(rs);

  const sets =
    displayMode === BOOSTER_CARDS
      ? db.sortedSetCodes.filter(set => db.sets[set].collation > 0)
      : db.sortedSetCodes;
  // each set stats
  sets.forEach(set => {
    const rs = renderSetStats(stats[set], set, set);
    mainstats.appendChild(rs);
  });

  const substats = createDiv(["main_stats", "sub_stats"]);

  flex.appendChild(mainstats);
  flex.appendChild(substats);

  if (mainDiv) {
    mainDiv.appendChild(top);
    mainDiv.appendChild(flex);
  }

  $$(".back")[0].addEventListener("click", () => {
    changeBackground("default");
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  });
}
