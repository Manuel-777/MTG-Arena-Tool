const _ = require("lodash");
const db = require("./database.js");
const Colors = require("./colors.js");

class CardsList {
  /**
   * Creates a list of cards based on an array of objects with the form
   * {quantity, id}
   * If an array of IDs is given it sets each quantity to the number of adjacent
   * repetitions
   **/
  constructor(list = []) {
    if (!list || list.length === 0) {
      this._list = [];
    } else if (typeof list[0] === "object") {
      this._list = list.map(obj => {
        return {
          ...obj,
          quantity: obj.quantity || 1,
          id: obj.id || obj,
          measurable: true
        };
      });
    } else {
      this._list = [];
      let lastId = null;
      list.forEach(id => {
        if (id === lastId) {
          this._list[this._list.length - 1].quantity++;
        } else {
          lastId = id;
          this._list.push({ quantity: 1, id: id, measurable: true });
        }
      });
    }
  }

  get() {
    return this._list;
  }

  /**
   * Adds a card to the list
   **/
  add(grpId, quantity = 1, merge = false) {
    if (typeof quantity !== "number") {
      throw new Error("quantity must be a number");
    }
    if (merge) {
      this._list.forEach((card, index) => {
        if (card.id == grpId) {
          card.quantity += quantity;
          return card;
        }
      });
    }

    this._list.push({
      quantity: quantity,
      id: grpId,
      measurable: true
    });
    return this._list[this._list.length - 1];
  }

  /**
   * Removes a card from the list.
   **/
  remove(grpId, quantity = 1, byName = false) {
    if (typeof quantity !== "number") {
      throw new Error("quantity must be a number");
    }
    if (byName) {
      let removed = 0;
      let cardToFind = db.card(grpId);
      this._list.forEach(function(card) {
        let cardInList = db.card(card.id);
        if (cardToFind.name == cardInList.name) {
          let remove = Math.min(card.quantity, quantity);
          card.quantity -= remove;
          quantity -= remove;
        }
      });
    } else {
      let removed = 0;
      this._list.forEach(function(card) {
        if (grpId == card.id) {
          let remove = Math.min(card.quantity, quantity);
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
  count(prop = "quantity") {
    return _.sumBy(this._list, prop);
  }

  /**
   * Same as count(), but here we can apply a filter function to the list.
   **/
  countFilter(prop = "quantity", func) {
    return _(this._list)
      .filter(func)
      .sumBy(prop);
  }

  /**
   * Creates a n object containing how many of each type the list has
   **/
  countTypesAll() {
    let types = { art: 0, cre: 0, enc: 0, ins: 0, lan: 0, pla: 0, sor: 0 };

    this._list.forEach(function(card) {
      let c = db.card(card.id);
      if (c) {
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
  countType(type) {
    let types = this.countTypesAll();
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
  getColorsAmmounts() {
    let colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

    this._list.forEach(function(card) {
      if (card.quantity > 0) {
        db.card(card.id).cost.forEach(function(c) {
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
    });

    return colors;
  }

  /**
   * Creates an object containing the lands color distribution of the list.
   **/
  getLandsAmounts() {
    var colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

    this._list.forEach(function(card) {
      var quantity = card.quantity;
      card = db.card(card.id);
      if (quantity > 0) {
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
   * Inserts a new propierty to each card in the list.
   **/
  addProperty(_prop, _default = 0) {
    this._list.forEach(obj => {
      obj[_prop] = _default(obj);
    });
  }

  /**
   * Get all colors in the list as a Colors object.
   **/
  getColors() {
    let colors = new Colors();
    this._list.forEach(card => {
      let cardData = db.card(card.id);
      if (cardData) {
        let isLand = cardData.type.indexOf("Land") !== -1;
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
  removeDuplicates(replaceList = true) {
    var newList = [];

    this._list.forEach(function(card) {
      let cardObj = db.card(card.id);
      let found = newList.find(c => db.card(c.id).name === cardObj.name);
      if (found) {
        if (found.measurable) {
          found.quantity += card.quantity;
        }
      } else {
        newList.push(card);
      }
    });

    if (replaceList) {
      this._list = newList;
    }

    return newList;
  }
}

module.exports = CardsList;
