import { Colors, Deck } from "mtgatool-shared";
import db from "../../../shared/database-wrapper";
import { decksList } from "../../../shared/store";
import store from "../../../shared/redux/stores/rendererStore";
import { getMissingCardCounts } from "../../rendererUtil";
import { customSets } from "./customSets";

export const ALL_CARDS = "All cards";
export const SINGLETONS = "Singletons (at least one)";
export const FULL_SETS = "Full sets (all 4 copies)";

// assume 1/8 of packs have a mythic
export const chanceBoosterHasMythic = 0.125;
export const chanceBoosterHasRare = 1 - chanceBoosterHasMythic;
// assume (1/24 mythic + 1/24 rare) WC instead of card
export const chanceNotWildCard = 11 / 12;

export function estimateBoosterRares(boosterCount: number): number {
  return boosterCount * chanceBoosterHasRare * chanceNotWildCard;
}

export function estimateBoosterMythics(boosterCount: number): number {
  return boosterCount * chanceBoosterHasMythic * chanceNotWildCard;
}

export class CountStats {
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
  public token: CountStats;
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
    this.token = new CountStats();
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
      this.mythic,
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

export function getCollectionStats(cardIds: number[]): CollectionStats {
  const playerEconomy = store.getState().playerdata.economy;
  const wantedCards: { [key: string]: number } = {};
  decksList()
    .filter(
      (deck) =>
        deck &&
        !deck.archived &&
        deck.description?.indexOf("Decks/Precon") == -1
    )
    .forEach((deck) => {
      const missing = getMissingCardCounts(new Deck(deck));
      Object.entries(missing).forEach(([grpid, count]) => {
        wantedCards[grpid] = Math.max(wantedCards[grpid] ?? 0, count);
      });
    });

  const stats: any = {
    complete: new SetStats("complete"),
  };

  const cards = store.getState().playerdata.cards;
  Object.keys(db.sets).forEach((setName) => {
    const setStats = new SetStats(setName);
    setStats.boosters = playerEconomy.boosters
      .filter(({ collationId }) => db.sets[setName]?.collation === collationId)
      .reduce(
        (
          accumulator: number,
          booster: { collationId: number; count: number }
        ) => accumulator + booster.count,
        0
      );
    setStats.boosterRares = estimateBoosterRares(setStats.boosters);
    setStats.boosterMythics = estimateBoosterMythics(setStats.boosters);
    stats[setName] = setStats;
  });

  // Hardcode cursom sets
  customSets.map((s) => {
    stats[s.name] = new SetStats(s.name);
  });

  cardIds.forEach((cardId) => {
    const card = db.card(cardId);
    if (!card) return;
    if (card.rarity === "land" || card.rarity === "token") return;
    if (!(card.set in stats)) return;

    let cardSet = card.set;
    customSets.map((s) => {
      if (s.cards.includes(card.id)) cardSet = s.name;
    });

    const obj: CardStats = {
      id: card.id,
      owned: 0,
      wanted: 0,
    };
    // add to totals
    if (stats[cardSet][card.rarity] == undefined) {
      //debugLog(card, cardSet, card.rarity);
      return;
    }
    stats[cardSet][card.rarity].total += 4;
    stats[cardSet][card.rarity].unique += 1;
    stats.complete[card.rarity].total += 4;
    stats.complete[card.rarity].unique += 1;
    // add cards we own
    if (cards.cards[card.id] !== undefined) {
      const owned = cards.cards[card.id];
      obj.owned = owned;
      stats[cardSet][card.rarity].owned += owned;
      stats[cardSet][card.rarity].uniqueOwned += 1;
      stats.complete[card.rarity].owned += owned;
      stats.complete[card.rarity].uniqueOwned += 1;
      // count complete sets we own
      if (owned == 4) {
        stats[cardSet][card.rarity].complete += 1;
        stats.complete[card.rarity].complete += 1;
      }
    }
    const col = new Colors();
    col.addFromCost(card.cost);
    const colorIndex = col.getBaseColor();
    // count cards we know we want across decks
    const wanted = wantedCards[card.id];
    if (wanted) {
      stats[cardSet][card.rarity].wanted += wanted;
      stats.complete[card.rarity].wanted += wanted;
      // count unique cards we know we want across decks
      stats[cardSet][card.rarity].uniqueWanted += Math.min(1, wanted);
      stats.complete[card.rarity].uniqueWanted += Math.min(1, wanted);
      obj.wanted = wanted;
    }
    if (!stats[cardSet].cards[colorIndex])
      stats[cardSet].cards[colorIndex] = {};
    if (!stats[cardSet].cards[colorIndex][card.rarity])
      stats[cardSet].cards[colorIndex][card.rarity] = [];
    stats[cardSet].cards[colorIndex][card.rarity].push(obj);
  });
  return stats;
}
