import _ from "lodash";
import db from "./database.js";
import Colors from "./colors";
import { CardObject, v2cardsList, isV2CardsList } from "./types/Deck";
import { DbCardData } from "./types/Metadata";

interface CardTypesCount {
  art: number;
  cre: number;
  enc: number;
  ins: number;
  lan: number;
  pla: number;
  sor: number;
}

interface ColorsCount {
  total: number;
  w: number;
  u: number;
  b: number;
  r: number;
  g: number;
  c: number;
}

class CardsList {
  /**
   * Creates a list of cards based on an array of objects with the form
   * {quantity, id}
   * If an array of IDs is given it sets each quantity to the number of adjacent
   * repetitions
   **/
  private list: v2cardsList;

  // This should take anyCardsList as an argument?
  constructor(newList: any[]) {
    this.list = [];
    if (isV2CardsList(newList)) {
      this.list = newList.map((obj: CardObject) => {
        return {
          quantity: 1, // TODO remove group lands hack
          id: obj, // TODO remove group lands hack
          ...obj,
          measurable: true
        };
      });
    } else {
      newList.forEach(id => {
        this.list.push({ quantity: 1, id: id, measurable: true, chance: 0 });
      });
      this.removeDuplicates(true);
    }
  }

  get(): v2cardsList {
    return this.list;
  }

  /**
   * Adds a card to the list
   **/
  add(grpId: number, quantity = 1, merge = false): CardObject {
    if (typeof quantity !== "number") {
      throw new Error("quantity must be a number");
    }
    if (merge) {
      this.list.forEach(card => {
        if (card.id == grpId) {
          card.quantity += quantity;
          return card;
        }
      });
    }

    this.list.push({
      quantity: quantity,
      id: grpId,
      measurable: true,
      chance: 0
    });
    return this.list[this.list.length - 1];
  }

  /**
   * Removes a card from the list.
   **/
  remove(grpId: number, quantity = 1, byName = false): void {
    if (byName) {
      const cardToFind = db.card(grpId);
      this.list.forEach(function(card) {
        const cardInList = db.card(card.id);
        if (cardToFind?.name === cardInList?.name) {
          const remove = Math.min(card.quantity, quantity);
          card.quantity -= remove;
          quantity -= remove;
        }
      });
    } else {
      this.list.forEach(function(card) {
        if (grpId == card.id) {
          const remove = Math.min(card.quantity, quantity);
          card.quantity -= remove;
          quantity -= remove;
        }
      });
    }
  }

  /**
   * Counts all cards in the list, if provided it only counts
   * for the given propierty.
   **/
  count(prop = "quantity"): number {
    return _.sumBy(this.list, prop);
  }

  /**
   * Same as count(), but here we can apply a filter function to the list.
   **/
  countFilter(prop = "quantity", func: any): number {
    return _(this.list)
      .filter(func)
      .sumBy(prop);
  }

  /**
   * Creates a n object containing how many of each type the list has
   **/
  countTypesAll(): CardTypesCount {
    const types = { art: 0, cre: 0, enc: 0, ins: 0, lan: 0, pla: 0, sor: 0 };

    this.list.forEach(function(card) {
      const c = db.card(card.id);
      if (c !== undefined) {
        if (c.type.includes("Land", 0))
          types.lan += card.measurable ? card.quantity : 1;
        else if (c.type.includes("Creature", 0))
          types.cre += card.measurable ? card.quantity : 1;
        else if (c.type.includes("Artifact", 0))
          types.art += card.measurable ? card.quantity : 1;
        else if (c.type.includes("Enchantment", 0))
          types.enc += card.measurable ? card.quantity : 1;
        else if (c.type.includes("Instant", 0))
          types.ins += card.measurable ? card.quantity : 1;
        else if (c.type.includes("Sorcery", 0))
          types.sor += card.measurable ? card.quantity : 1;
        else if (c.type.includes("Planeswalker", 0))
          types.pla += card.measurable ? card.quantity : 1;
      }
    });

    return types;
  }

  /**
   * Counts how many cards of a given type the list has.
   **/
  countType(type: string): number {
    const types = this.countTypesAll();
    if (type.includes("Land", 0)) return types.lan;
    else if (type.includes("Creature", 0)) return types.cre;
    else if (type.includes("Artifact", 0)) return types.art;
    else if (type.includes("Enchantment", 0)) return types.enc;
    else if (type.includes("Instant", 0)) return types.ins;
    else if (type.includes("Sorcery", 0)) return types.sor;
    else if (type.includes("Planeswalker", 0)) return types.pla;

    return 0;
  }

  /**
   * Creates an object containing the colors distribution of the list.
   **/
  getColorsAmounts(): ColorsCount {
    const colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

    this.list.forEach(function(card) {
      if (card.quantity > 0) {
        const dbCard = db.card(card.id);
        if (dbCard !== undefined) {
          dbCard.cost.forEach(function(c) {
            if (c.indexOf("w") !== -1) {
              colors.w += card.quantity;
              colors.total += card.quantity;
            }
            if (c.indexOf("u") !== -1) {
              colors.u += card.quantity;
              colors.total += card.quantity;
            }
            if (c.indexOf("b") !== -1) {
              colors.b += card.quantity;
              colors.total += card.quantity;
            }
            if (c.indexOf("r") !== -1) {
              colors.r += card.quantity;
              colors.total += card.quantity;
            }
            if (c.indexOf("g") !== -1) {
              colors.g += card.quantity;
              colors.total += card.quantity;
            }
            if (c.indexOf("c") !== -1) {
              colors.c += card.quantity;
              colors.total += card.quantity;
            }
          });
        }
      }
    });

    return colors;
  }

  /**
   * Creates an object containing the lands color distribution of the list.
   **/
  getLandsAmounts(): ColorsCount {
    const colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

    this.list.forEach(function(cardEntry) {
      const quantity = cardEntry.quantity;
      const card = db.card(cardEntry.id);
      if (card !== undefined && quantity > 0) {
        if (
          card.type.indexOf("Land") != -1 ||
          card.type.indexOf("land") != -1
        ) {
          if (card.frame.length < 5) {
            card.frame.forEach(function(c) {
              if (c == 1) {
                colors.w += quantity;
                colors.total += quantity;
              }
              if (c == 2) {
                colors.u += quantity;
                colors.total += quantity;
              }
              if (c == 3) {
                colors.b += quantity;
                colors.total += quantity;
              }
              if (c == 4) {
                colors.r += quantity;
                colors.total += quantity;
              }
              if (c == 5) {
                colors.g += quantity;
                colors.total += quantity;
              }
              if (c == 6) {
                colors.c += quantity;
                colors.total += quantity;
              }
            });
          }
        }
      }
    });

    return colors;
  }

  /**
   * Inserts a chance property to each card in the list.
   **/
  addChance(fn: (item: CardObject) => number): void {
    this.list.forEach(card => {
      card.chance = fn(card);
    });
  }

  /**
   * Get all colors in the list as a Colors object.
   **/
  getColors(): Colors {
    const colors = new Colors();
    this.list.forEach(card => {
      const cardData = db.card(card.id);
      if (cardData !== undefined) {
        const isLand = cardData.type.indexOf("Land") !== -1;
        if (isLand && cardData.frame.length < 3) {
          colors.addFromArray(cardData.frame);
        }
        colors.addFromCost(cardData.cost);
      }
    });

    return colors;
  }

  /**
   * Removes all duplicate cards and merges them.
   * If ReplaceList is set, replaces the _list with the new one.
   * Returns the new list (not a cardsList object)
   **/
  removeDuplicates(replaceList = true): v2cardsList {
    const newList: v2cardsList = [];

    this.list.forEach(function(card) {
      const cardObj = db.card(card.id);
      const found = newList.find((c: CardObject) => {
        const dbCard = db.card(c.id);
        return dbCard?.name === cardObj?.name;
      });
      if (found) {
        if (found.measurable) {
          found.quantity += card.quantity;
        }
      } else {
        newList.push(card);
      }
    });

    if (replaceList) {
      this.list = newList;
    }

    return newList;
  }
}

export default CardsList;
