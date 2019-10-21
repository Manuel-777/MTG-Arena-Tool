import db from "./database.js";
import CardsList from "./cards-list.js";
import Colors from "./colors.js";
import {
  compare_cards,
  get_set_code,
  get_wc_missing,
  objectClone
} from "./util";
import { DEFAULT_TILE } from "./constants.js";

class Deck {
  constructor(mtgaDeck = {}, main = false, side = false) {
    if (!mtgaDeck.mainDeck) mtgaDeck.mainDeck = [];
    if (!mtgaDeck.sideboard) mtgaDeck.sideboard = [];
    if (main) mtgaDeck.mainDeck = main;
    if (side) mtgaDeck.sideboard = side;

    this.mainboard = new CardsList(mtgaDeck.mainDeck);
    this.sideboard = new CardsList(mtgaDeck.sideboard);
    this.commandZoneGRPId = mtgaDeck.commandZoneGRPId || 0;
    this.name = mtgaDeck.name || "";
    this.id = mtgaDeck.id || "";
    this.lastUpdated = mtgaDeck.lastUpdated || "";
    this.tile = mtgaDeck.deckTileId ? mtgaDeck.deckTileId : DEFAULT_TILE;
    this._colors = undefined;
    this.tags = mtgaDeck.tags || [mtgaDeck.format];
    this.custom = mtgaDeck.custom || false;

    //this.sortMainboard(compare_cards);
    //this.sortSideboard(compare_cards);

    return this;
  }

  /**
   * returns the colors of this deck, or creates a new colors object
   * if not defined yet.
   **/
  get colors() {
    return this._colors || this.getColors();
  }

  sortMainboard(func) {
    this.mainboard.get().sort(func);
  }

  sortSideboard(func) {
    this.sideboard.get().sort(func);
  }

  /**
   * returns a clone of this deck, not referenced to this instance.
   **/
  clone() {
    const main = objectClone(this.mainboard.get());
    const side = objectClone(this.sideboard.get());

    const obj = {
      name: this.name,
      id: this.id,
      lastUpdated: this.lastUpdated,
      deckTileId: this.tile,
      tags: this.tags,
      custom: this.custom,
      commandZoneGRPId: this.commandZoneGRPId
    };

    const ret = new Deck(objectClone(obj), main, side);

    return ret;
  }

  /**
   * returns a color object based on the colors of the cards within
   * the mainboard or, if specified, the sideboard.
   * By default it only return the mainboard.
   **/
  getColors(countMainboard = true, countSideboard = false) {
    this._colors = new Colors();

    if (countMainboard) {
      const mainboardColors = this.mainboard.getColors();
      this._colors.addFromColor(mainboardColors);
    }

    if (countSideboard) {
      const sideboardColors = this.sideboard.getColors();
      this._colors.addFromColor(sideboardColors);
    }

    return this._colors;
  }

  /**
   * Return how many of each wildcard we need to complete this deck.
   **/
  getMissingWildcards(countMainboard = true, countSideboard = true) {
    const missing = {
      rare: 0,
      common: 0,
      uncommon: 0,
      mythic: 0,
      token: 0,
      land: 0
    };

    if (countMainboard) {
      this.mainboard.get().forEach(card => {
        const grpid = card.id;
        const quantity = card.quantity;
        const rarity = db.card(grpid).rarity;

        const add = get_wc_missing(grpid, quantity);

        missing[rarity] += add;
      });
    }

    if (countSideboard) {
      this.sideboard.get().forEach(card => {
        const grpid = card.id;
        const quantity = card.quantity;
        const rarity = db.card(grpid).rarity;

        const add = get_wc_missing(grpid, quantity);

        missing[rarity] += add;
      });
    }

    return missing;
  }

  /**
   * Returns a txt format string of this deck.
   **/
  getExportTxt() {
    let str = "";
    const mainList = this.mainboard.removeDuplicates(false);
    mainList.forEach(function(card) {
      const grpid = card.id;
      const card_name = db.card(grpid).name;

      str += (card.measurable ? card.quantity : 1) + " " + card_name + "\r\n";
    });

    str += "\r\n";

    const sideList = this.sideboard.removeDuplicates(false);
    sideList.forEach(function(card) {
      const grpid = card.id;
      const card_name = db.card(grpid).name;

      str += (card.measurable ? card.quantity : 1) + " " + card_name + "\r\n";
    });

    return str;
  }

  getExportArena() {
    let str = "";
    const listMain = this.mainboard.removeDuplicates(false);
    listMain.forEach(function(card) {
      let grpid = card.id;
      let cardObj = db.card(grpid);

      if (cardObj.set == "Mythic Edition") {
        grpid = cardObj.reprints[0];
        cardObj = db.card(grpid);
      }

      const card_name = cardObj.name;
      const card_set = cardObj.set;
      const card_cn = cardObj.cid;
      const card_q = card.measurable ? card.quantity : 1;

      const set_code = db.sets[card_set].arenacode || get_set_code(card_set);
      str += `${card_q} ${card_name} (${set_code}) ${card_cn} \r\n`;
    });

    str += "\r\n";

    const listSide = this.sideboard.removeDuplicates(false);
    listSide.forEach(function(card) {
      let grpid = card.id;
      let cardObj = db.card(grpid);

      if (cardObj.set == "Mythic Edition") {
        grpid = cardObj.reprints[0];
        cardObj = db.card(grpid);
      }

      const card_name = cardObj.name;
      const card_set = cardObj.set;
      const card_cn = cardObj.cid;
      const card_q = card.measurable ? card.quantity : 1;

      const set_code = db.sets[card_set].arenacode || get_set_code(card_set);
      str += `${card_q} ${card_name} (${set_code}) ${card_cn} \r\n`;
    });

    return str;
  }

  getSave() {
    return objectClone(this.getSaveRaw());
  }

  getSaveRaw() {
    const ret = {};
    ret.mainDeck = this.mainboard.get();
    ret.sideboard = this.sideboard.get();
    ret.name = this.name;
    ret.id = this.id;
    ret.lastUpdated = this.lastUpdated;
    ret.deckTileId = this.tile;
    ret.colors = this.colors.get();
    ret.tags = this.tags;
    ret.custom = this.custom;
    ret.commandZoneGRPId = this.commandZoneGRPId;

    return ret;
  }

  getUniqueString(checkSide = true) {
    this.sortMainboard(compare_cards);
    this.sortSideboard(compare_cards);

    let str = "";
    this.mainboard.get().forEach(card => {
      str += card.id + "," + card.quantity + ",";
    });

    if (checkSide) {
      this.sideboard.get().forEach(card => {
        str += card.id + "," + card.quantity + ",";
      });
    }

    return str;
  }
}

export default Deck;
