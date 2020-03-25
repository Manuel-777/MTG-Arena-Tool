import {
  anyCardsList,
  CardObject,
  InternalDeck,
  isV2CardsList,
  v2cardsList
} from "../types/Deck";
import { DbCardData } from "../types/Metadata";
import CardsList from "./cardsList";
import Colors from "./colors";
import { DEFAULT_TILE } from "./constants";
import db from "./database";
import {
  compare_cards,
  get_set_code,
  getWildcardsMissing,
  objectClone
} from "./util";

class Deck {
  private mainboard: CardsList;
  private sideboard: CardsList;
  private readonly arenaMain: Readonly<v2cardsList>;
  private readonly arenaSide: Readonly<v2cardsList>;
  private commandZoneGRPIds: number[];
  private name: string;
  public id: string;
  public lastUpdated: string;
  public tile: number;
  public _colors: Colors;
  public tags: string[];
  public custom: boolean;
  public archetype: string;
  public format: string;
  public description: string;

  constructor(
    mtgaDeck: Partial<InternalDeck> = {},
    main?: anyCardsList,
    side?: anyCardsList,
    arenaMain?: Readonly<anyCardsList>,
    arenaSide?: Readonly<anyCardsList>
  ) {
    // Putting these as default argument values works in tests, but throws an
    // undefined reference error in production.
    main = main ?? mtgaDeck.mainDeck ?? [];
    side = side ?? mtgaDeck.sideboard ?? [];
    arenaMain = arenaMain ?? mtgaDeck.arenaMain ?? main;
    arenaSide = arenaSide ?? mtgaDeck.arenaSide ?? side;
    this.mainboard = new CardsList(main);
    this.sideboard = new CardsList(side);
    this.arenaMain = Deck.toLoggedList(arenaMain);
    this.arenaSide = Deck.toLoggedList(arenaSide);
    this.commandZoneGRPIds = mtgaDeck.commandZoneGRPIds ?? [];
    this.name = mtgaDeck.name ?? "";
    this.id = mtgaDeck.id ?? "";
    this.lastUpdated = mtgaDeck.lastUpdated ?? "";
    this.tile = mtgaDeck.deckTileId ? mtgaDeck.deckTileId : DEFAULT_TILE;
    this._colors = this.getColors();
    this.tags = mtgaDeck.tags ?? [mtgaDeck.format as string];
    this.custom = mtgaDeck.custom ?? false;
    this.archetype = mtgaDeck.archetype ?? "";
    this.format = mtgaDeck.format ?? "";
    this.description = mtgaDeck.description ?? "";
    return this;
  }

  private static toLoggedList(
    list: Readonly<anyCardsList>
  ): Readonly<v2cardsList> {
    if (isV2CardsList(list)) {
      return Object.freeze(
        list.map(({ id, quantity }: CardObject) =>
          Object.freeze({
            id,
            quantity
          })
        )
      );
    } else {
      const loggedList = [];
      let lastObj: CardObject | undefined = undefined;
      for (const id of list) {
        if (lastObj === undefined || lastObj.id !== id) {
          Object.freeze(lastObj);
          lastObj = { id: id, quantity: 1 };
          loggedList.push(lastObj);
        } else {
          lastObj.quantity++;
        }
      }
      Object.freeze(lastObj);
      return Object.freeze(loggedList);
    }
  }

  /**
   * returns the colors of this deck, or creates a new colors object
   * if not defined yet.
   **/
  get colors(): Colors {
    return this._colors;
  }

  /**
   * Sort the mainboard of this deck.
   * @param func sort function.
   */
  sortMainboard(func: any): void {
    this.mainboard.get().sort(func);
  }

  /**
   * Sort the sideboard of this deck.
   * @param func sort function.
   */
  sortSideboard(func: any): void {
    this.sideboard.get().sort(func);
  }

  getMainboard(): CardsList {
    return this.mainboard;
  }

  getSideboard(): CardsList {
    return this.sideboard;
  }

  setMainboard(list: CardsList): void {
    this.mainboard = list;
  }

  setSideboard(list: CardsList): void {
    this.sideboard = list;
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }

  /**
   * Returns if this deck has a commander (0) or the number of commanders it has.
   */
  hasCommander(): number {
    return this.commandZoneGRPIds.length / 2;
  }

  /**
   * Get the commander GrpId
   * @param pos position (default is first)
   */
  getCommanderId(pos = 0): number {
    return this.commandZoneGRPIds[pos * 2];
  }

  /**
   * Return the raw commandZoneGRPIds array for later use.
   */
  getCommanders(): number[] {
    return this.commandZoneGRPIds;
  }

  /**
   * returns a clone of this deck, not referenced to this instance.
   **/
  clone(): Deck {
    const main = objectClone(this.mainboard.get());
    const side = objectClone(this.sideboard.get());

    const obj = {
      name: this.name,
      id: this.id,
      lastUpdated: this.lastUpdated,
      deckTileId: this.tile,
      tags: this.tags,
      custom: this.custom,
      commandZoneGRPIds: this.commandZoneGRPIds
    };

    return new Deck(
      objectClone(obj),
      main,
      side,
      this.arenaMain,
      this.arenaSide
    );
  }

  /**
   * Returns a Color class based on the colors of the cards within
   * the mainboard or, if specified, the sideboard.
   * By default it only counts the mainboard.
   * @param countMainboard weter or not to count the mainboard cards.
   * @param countSideboard weter or not to count the sideboard cards.
   */
  getColors(countMainboard = true, countSideboard = false): Colors {
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
   * By default it only counts the mainboard cards.
   * @param countMainboard weter or not to count the mainboard cards.
   * @param countSideboard weter or not to count the sideboard cards.
   */
  getMissingWildcards(countMainboard = true, countSideboard = true) {
    const missing: Record<string, number> = {
      rare: 0,
      common: 0,
      uncommon: 0,
      mythic: 0,
      token: 0,
      land: 0
    };

    if (countMainboard) {
      this.mainboard.get().forEach(cardObj => {
        const grpid = cardObj.id;
        const card = db.card(grpid);
        if (card !== undefined) {
          const rarity = card.rarity;
          const add = getWildcardsMissing(this, grpid, false);
          missing[rarity] += add;
        }
      });
    }

    if (countSideboard) {
      this.sideboard.get().forEach(cardObj => {
        const grpid = cardObj.id;
        const card = db.card(grpid);
        if (card !== undefined) {
          const rarity = card.rarity;
          const add = getWildcardsMissing(this, grpid, false);
          missing[rarity] += add;
        }
      });
    }

    return missing;
  }

  /**
   * Returns a txt format string of this deck.
   **/
  getExportTxt(): string {
    let str = "";
    const mainList = this.mainboard.removeDuplicates(false);
    mainList.forEach(function(card) {
      const grpid = card.id;
      const cardName = (db.card(grpid) as DbCardData).name;

      str += (card.measurable ? card.quantity : 1) + " " + cardName + "\r\n";
    });

    str += "\r\n";

    const sideList = this.sideboard.removeDuplicates(false);
    sideList.forEach(function(card) {
      const grpid = card.id;
      const cardName = (db.card(grpid) as DbCardData).name;

      str += (card.measurable ? card.quantity : 1) + " " + cardName + "\r\n";
    });

    return str;
  }

  /**
   * Returns a string to import in MTG Arena
   */
  getExportArena(): string {
    let str = "";
    const listMain = this.mainboard.removeDuplicates(false);
    listMain.forEach(function(card) {
      let grpid = card.id;
      let cardObj = db.card(grpid) as DbCardData;

      if (cardObj.set == "Mythic Edition") {
        grpid = (cardObj.reprints as number[])[0];
        cardObj = db.card(grpid) as DbCardData;
      }

      const cardName = cardObj.name;
      const cardSet = cardObj.set;
      const cardCn = cardObj.cid;
      const cardQ = card.measurable ? card.quantity : 1;

      const setCode = db.sets[cardSet].arenacode ?? get_set_code(cardSet);
      str += `${cardQ} ${cardName} (${setCode}) ${cardCn}\r\n`;
    });

    str += "\r\n";

    const listSide = this.sideboard.removeDuplicates(false);
    listSide.forEach(function(card) {
      let grpid = card.id;
      let cardObj = db.card(grpid) as DbCardData;

      if (cardObj.set == "Mythic Edition") {
        grpid = (cardObj.reprints as number[])[0];
        cardObj = db.card(grpid) as DbCardData;
      }

      const cardName = cardObj.name;
      const cardSet = cardObj.set;
      const cardCn = cardObj.cid;
      const cardQ = card.measurable ? card.quantity : 1;

      const setCode = db.sets[cardSet].arenacode || get_set_code(cardSet);
      str += `${cardQ} ${cardName} (${setCode}) ${cardCn} \r\n`;
    });

    return str;
  }

  /**
   * Returns a copy of this deck as an object.
   */
  getSave(includeAsLogged = false): InternalDeck {
    return objectClone(this.getSaveRaw(includeAsLogged));
  }

  /**
   * Returns a copy of this deck as an object, but maintains variables references.
   */
  getSaveRaw(includeAsLogged = false): InternalDeck {
    return {
      mainDeck: this.mainboard.get(),
      sideboard: this.sideboard.get(),
      ...(includeAsLogged && {
        arenaMain: this.arenaMain,
        arenaSide: this.arenaSide
      }),
      name: this.name,
      id: this.id,
      lastUpdated: this.lastUpdated,
      deckTileId: this.tile,
      colors: this.colors.get(),
      tags: this.tags || [],
      custom: this.custom,
      commandZoneGRPIds: this.commandZoneGRPIds,
      format: this.format,
      type: "InternalDeck",
      description: this.description
    };
  }

  /**
   * Returns a unique string for this deck. (not hashed)
   * @param checkSide whether or not to use the sideboard (default: true)
   */
  getUniqueString(checkSide = true): string {
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
