import db from "./database.js";
import CardsList from "./cardsList";
import Colors from "./colors.js";
import {
  compare_cards,
  get_set_code,
  get_wc_missing,

  objectClone
} from "./util";
import { DEFAULT_TILE } from "./constants";

import { anyCardsList } from "./types/Deck";
import { DbCardData } from "./types/Metadata.js";

interface internalDeck {
  mainDeck?: anyCardsList,
  sideboard?: anyCardsList,
  lastUpdated?: string,
  name?: string,
  deckTileId?: number,
  format?: string,
  custom?: boolean,
  tags?: string[],
  id?:string,
  commandZoneGRPIds?: number[],
  colors?: number[]
}

class Deck { 
  public mainboard: CardsList;
  public sideboard: CardsList;
  private commandZoneGRPIds: number[];
  public name: string;
  private id: string;
  private lastUpdated: string;
  private tile: number;
  private _colors: Colors;
  private tags: string[];
  private custom: boolean;

  constructor(mtgaDeck:internalDeck = {}, main:anyCardsList = [], side:anyCardsList = []) {
    if (!mtgaDeck.mainDeck) mtgaDeck.mainDeck = [];
    if (!mtgaDeck.sideboard) mtgaDeck.sideboard = [];
    if (main) mtgaDeck.mainDeck = main;
    if (side) mtgaDeck.sideboard = side;

    this.mainboard = new CardsList(mtgaDeck.mainDeck);
    this.sideboard = new CardsList(mtgaDeck.sideboard);
    this.commandZoneGRPIds = mtgaDeck.commandZoneGRPIds || [];
    this.name = mtgaDeck.name || "";
    this.id = mtgaDeck.id || "";
    this.lastUpdated = mtgaDeck.lastUpdated || "";
    this.tile = mtgaDeck.deckTileId ? mtgaDeck.deckTileId : DEFAULT_TILE;
    this._colors = new Colors();
    this.tags = mtgaDeck.tags || [mtgaDeck.format as string];
    this.custom = mtgaDeck.custom || false;

    //this.sortMainboard(compare_cards);
    //this.sortSideboard(compare_cards);

    return this;
  }

  /**
   * returns the colors of this deck, or creates a new colors object
   * if not defined yet.
   **/
  get colors():Colors {
    return this._colors || this.getColors();
  }

  sortMainboard(func:any):void {
    this.mainboard.get().sort(func);
  }

  sortSideboard(func:any):void {
    this.sideboard.get().sort(func);
  }

  /**
   * returns a clone of this deck, not referenced to this instance.
   **/
  clone():Deck {
    let main = objectClone(this.mainboard.get());
    let side = objectClone(this.sideboard.get());

    let obj = {
      name: this.name,
      id: this.id,
      lastUpdated: this.lastUpdated,
      deckTileId: this.tile,
      tags: this.tags,
      custom: this.custom,
      commandZoneGRPIds: this.commandZoneGRPIds
    };

    let ret = new Deck(objectClone(obj), main, side);

    return ret;
  }

  /**
   * returns a color object based on the colors of the cards within
   * the mainboard or, if specified, the sideboard.
   * By default it only return the mainboard.
   **/
  getColors(countMainboard = true, countSideboard = false):Colors {
    this._colors = new Colors();

    if (countMainboard) {
      let mainboardColors = this.mainboard.getColors();
      this._colors.addFromColor(mainboardColors);
    }

    if (countSideboard) {
      let sideboardColors = this.sideboard.getColors();
      this._colors.addFromColor(sideboardColors);
    }

    return this._colors;
  }

  /**
   * Return how many of each wildcard we need to complete this deck.
   **/
  getMissingWildcards(countMainboard = true, countSideboard = true) {
    let missing = {
      rare: 0,
      common: 0,
      uncommon: 0,
      mythic: 0,
      token: 0,
      land: 0
    };

    if (countMainboard) {
      this.mainboard.get().forEach(cardObj => {
        let grpid = cardObj.id;
        let quantity = cardObj.quantity;
        let rarity = (db.card(grpid) as DbCardData).rarity;
        let add = get_wc_missing(grpid, quantity);

        missing[rarity] += add;
      });
    }

    if (countSideboard) {
      this.sideboard.get().forEach(cardObj => {
        let grpid = cardObj.id;
        let quantity = cardObj.quantity;
        let rarity = (db.card(grpid) as DbCardData).rarity;
        let add = get_wc_missing(grpid, quantity);

        missing[rarity] += add;
      });
    }

    return missing;
  }

  /**
   * Returns a txt format string of this deck.
   **/
  getExportTxt():string {
    let str = "";
    let mainList = this.mainboard.removeDuplicates(false);
    mainList.forEach(function(card) {
      let grpid = card.id;
      let card_name = (db.card(grpid) as DbCardData).name;

      str += (card.measurable ? card.quantity : 1) + " " + card_name + "\r\n";
    });

    str += "\r\n";

    let sideList = this.sideboard.removeDuplicates(false);
    sideList.forEach(function(card) {
      let grpid = card.id;
      let card_name = (db.card(grpid) as DbCardData).name;

      str += (card.measurable ? card.quantity : 1) + " " + card_name + "\r\n";
    });

    return str;
  }

  getExportArena():string {
    let str = "";
    let listMain = this.mainboard.removeDuplicates(false);
    listMain.forEach(function(card) {
      let grpid = card.id;
      let cardObj = db.card(grpid) as DbCardData;

      if (cardObj.set == "Mythic Edition") {
        grpid = (cardObj.reprints as number[])[0];
        cardObj = db.card(grpid) as DbCardData;
      }

      let card_name = cardObj.name;
      let card_set = cardObj.set;
      let card_cn = cardObj.cid;
      let card_q = card.measurable ? card.quantity : 1;

      let set_code = db.sets[card_set].arenacode || get_set_code(card_set);
      str += `${card_q} ${card_name} (${set_code}) ${card_cn} \r\n`;
    });

    str += "\r\n";

    let listSide = this.sideboard.removeDuplicates(false);
    listSide.forEach(function(card) {
      let grpid = card.id;
      let cardObj = db.card(grpid) as DbCardData;

      if (cardObj.set == "Mythic Edition") {
        grpid = (cardObj.reprints as number[])[0];
        cardObj = db.card(grpid) as DbCardData;
      }

      let card_name = cardObj.name;
      let card_set = cardObj.set;
      let card_cn = cardObj.cid;
      let card_q = card.measurable ? card.quantity : 1;

      let set_code = db.sets[card_set].arenacode || get_set_code(card_set);
      str += `${card_q} ${card_name} (${set_code}) ${card_cn} \r\n`;
    });

    return str;
  }

  getSave() {
    return objectClone(this.getSaveRaw());
  }

  getSaveRaw():internalDeck {
    return {
      mainDeck: this.mainboard.get(),
      sideboard: this.sideboard.get(),
      name: this.name,
      id: this.id,
      lastUpdated: this.lastUpdated,
      deckTileId: this.tile,
      colors: this.colors.get(),
      tags: this.tags || [],
      custom: this.custom,
      commandZoneGRPIds: this.commandZoneGRPIds
    };
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
