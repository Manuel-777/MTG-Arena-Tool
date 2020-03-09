/* eslint-disable @typescript-eslint/camelcase */
import formatDistanceStrict from "date-fns/formatDistanceStrict";
import { shell } from "electron";
import { MatchPlayer } from "../types/currentMatch";
import { CardObject, InternalDeck, v2cardsList } from "../types/Deck";
import { InternalPlayer } from "../types/match";
import { DbCardData } from "../types/Metadata";
import { InternalRankData } from "../types/rank";
import {
  CardCounts,
  MissingWildcards
} from "../window_main/components/decks/types";
import {
  BLACK,
  BLUE,
  CARD_RARITIES,
  FACE_DFC_FRONT,
  FORMATS,
  GREEN,
  RED,
  WHITE
} from "./constants";
import db from "./database";
import Deck from "./deck";
import pd from "./PlayerData";

const NO_IMG_URL = "../images/notfound.png";

export function getCardImage(
  card?: DbCardData | number,
  quality: string = pd.settings.cards_quality
): string {
  if (card === undefined) {
    return NO_IMG_URL;
  }
  const cardObj =
    typeof card == "string"
      ? db.card(parseInt(card))
      : typeof card == "number"
      ? db.card(card)
      : card;
  try {
    const url = cardObj?.images[quality];
    if (url === undefined || url === "") throw "Undefined url";
    return "https://img.scryfall.com/cards" + cardObj?.images[quality];
  } catch (e) {
    // eslint-disable-next-line no-console
    // console.error(e);
    console.log("Cant find card image: ", cardObj, typeof cardObj);
    return NO_IMG_URL;
  }
}

export function getCardArtCrop(card?: DbCardData | number): string {
  return getCardImage(card, "art_crop");
}

export function openScryfallCard(card?: DbCardData | number): void {
  const cardObj = typeof card == "number" ? db.card(card) : card;
  if (cardObj) {
    const { cid, set } = cardObj;
    shell.openExternal(
      "https://scryfall.com/card/" + db.sets[set].scryfall + "/" + cid
    );
  } else {
    // eslint-disable-next-line no-console
    console.log("Cant open scryfall card: ", cardObj);
  }
}

export function getRankColorClass(rank: string): string {
  switch (rank) {
    case "A+":
    case "A":
      return "blue";
    case "A-":
    case "B+":
    case "B":
      return "green";
    case "B-":
    case "C+":
    case "C":
    default:
      return "white";
    case "C-":
    case "D+":
    case "D":
      return "orange";
    case "D-":
    case "F":
      return "red";
  }
}

export function get_rank_index(_rank: string, _tier: number): number {
  let ii = 0;
  if (_rank == "Unranked") ii = 0;
  if (_rank == "Bronze") ii = 1 + (_tier - 1); //1 2 3 4
  if (_rank == "Silver") ii = 5 + (_tier - 1); //5 6 7 8
  if (_rank == "Gold") ii = 9 + (_tier - 1); //9 0 1 2
  if (_rank == "Platinum") ii = 13 + (_tier - 1); //3 4 5 6
  if (_rank == "Diamond") ii = 17 + (_tier - 1); //7 8 9 0
  if (_rank == "Mythic") ii = 21 + (_tier - 1); //1 2 3 4
  return ii;
}

export function get_rank_index_16(_rank: string): number {
  let ii = 0;
  if (_rank == "Unranked") ii = 0;
  if (_rank == "Bronze") ii = 1;
  if (_rank == "Silver") ii = 2;
  if (_rank == "Gold") ii = 3;
  if (_rank == "Platinum") ii = 4;
  if (_rank == "Diamond") ii = 5;
  if (_rank == "Mythic") ii = 6;
  return ii;
}

export function getRecentDeckName(deckId: string): string {
  return pd.deck(deckId)?.name ?? deckId;
}

export function getReadableEvent(arg: string): string {
  if (db.events[arg] != undefined) {
    return db.events[arg];
  }

  return arg;
}

export function getReadableFormat(format: string): string {
  if (format in FORMATS) {
    return FORMATS[format];
  }
  return format || "Unknown";
}

// REVIEW
// All instances using this should use Deck and CardsList classes instead
export function removeDuplicates(decklist: v2cardsList): v2cardsList {
  const newList: v2cardsList = [];
  try {
    decklist.forEach(function(card: CardObject) {
      const cname = db.card(card.id)?.name;
      let added = false;
      newList.forEach(function(c) {
        const cn = db.card(c.id)?.name;
        if (cn == cname) {
          if (c.quantity !== 9999) {
            c.quantity += card.quantity;
          }
          if (c.chance != undefined) {
            c.chance += card.chance || 0;
          }
          added = true;
        }
      });

      if (!added) {
        newList.push(card);
      }
    });
    return newList;
  } catch (e) {
    return [];
  }
}

export function get_card_type_sort(a?: string): number {
  if (a == undefined) return 0;
  if (a.includes("Creature", 0)) return 1;
  if (a.includes("Planeswalker", 0)) return 2;
  if (a.includes("Instant", 0)) return 3;
  if (a.includes("Sorcery", 0)) return 4;
  if (a.includes("Artifact", 0)) return 5;
  if (a.includes("Enchantment", 0)) return 6;
  if (a.includes("Land", 0)) return 7;
  if (a.includes("Special", 0)) return 8;
  return 0;
}

export function compare_cards(a: CardObject, b: CardObject): number {
  // Yeah this is lazy.. I know
  const aObj = db.card(a.id);
  const bObj = db.card(b.id);

  if (!aObj) return 1;
  if (!bObj) return -1;

  const _as = get_card_type_sort(aObj.type);
  const _bs = get_card_type_sort(bObj.type);

  // Order by type?
  if (_as < _bs) {
    return -1;
  }
  if (_as > _bs) {
    return 1;
  }

  // by cmc
  if (aObj.cmc < bObj.cmc) {
    return -1;
  }
  if (aObj.cmc > bObj.cmc) {
    return 1;
  }

  // then by name
  if (aObj.name < bObj.name) {
    return -1;
  }
  if (aObj.name > bObj.name) {
    return 1;
  }

  return 0;
}

export function get_set_code(set: string): string {
  if (set == undefined) return "";
  let s = db.sets[set].code;
  if (s == undefined) s = set;
  return s;
}

export function getRaritySortValue(rarity: string): number {
  rarity = rarity.toLowerCase();
  switch (rarity) {
    case "land":
      return 5;
    case "common":
      return 4;
    case "uncommon":
      return 3;
    case "rare":
      return 2;
    case "mythic":
      return 1;
    default:
      return 0;
  }
}

export function collectionSortRarity(a: number, b: number): number {
  const aObj = db.card(a);
  const bObj = db.card(b);

  if (!aObj) return 1;
  if (!bObj) return -1;

  if (getRaritySortValue(aObj.rarity) < getRaritySortValue(bObj.rarity))
    return -1;
  if (getRaritySortValue(aObj.rarity) > getRaritySortValue(bObj.rarity))
    return 1;

  if (aObj.set < bObj.set) return -1;
  if (aObj.set > bObj.set) return 1;

  if (parseInt(aObj.cid) < parseInt(bObj.cid)) return -1;
  if (parseInt(aObj.cid) > parseInt(bObj.cid)) return 1;
  return 0;
}

export function get_deck_colors(deck: InternalDeck): number[] {
  let colorIndices: number[] = [];
  try {
    deck.mainDeck.forEach(card => {
      if (card.quantity < 1) {
        return;
      }

      const cardData = db.card(card.id);

      if (!cardData) {
        return;
      }

      const isLand = cardData.type.indexOf("Land") !== -1;
      const frame = cardData.frame;
      if (isLand && frame.length < 3) {
        colorIndices = colorIndices.concat(frame);
      }

      cardData.cost.forEach(cost => {
        if (cost === "w") {
          colorIndices.push(WHITE);
        } else if (cost === "u") {
          colorIndices.push(BLUE);
        } else if (cost === "b") {
          colorIndices.push(BLACK);
        } else if (cost === "r") {
          colorIndices.push(RED);
        } else if (cost === "g") {
          colorIndices.push(GREEN);
        }
      });
    });

    colorIndices = Array.from(new Set(colorIndices));
    colorIndices.sort((a, b) => {
      return a - b;
    });
  } catch (e) {
    // FIXME: Errors shouldn't be caught silently. If this is an
    //        expected error then there should be a test to catch only that error.
    console.error(e);
    colorIndices = [];
  }

  deck.colors = colorIndices;
  return colorIndices;
}

export function get_wc_missing(
  deck: Deck,
  grpid: number,
  isSideboard?: boolean
): number {
  let mainQuantity = 0;
  const mainMatches = deck
    .getMainboard()
    .get()
    .filter(card => card.id == grpid);
  if (mainMatches.length) {
    mainQuantity = mainMatches[0].quantity;
  }

  let sideboardQuantity = 0;
  const sideboardMatches = deck
    .getSideboard()
    .get()
    .filter(card => card.id == grpid);
  if (sideboardMatches.length) {
    sideboardQuantity = sideboardMatches[0].quantity;
  }

  let needed = mainQuantity;
  if (isSideboard) {
    needed = sideboardQuantity;
  }
  // cap at 4 copies to handle petitioners, rat colony, etc
  needed = Math.min(4, needed);

  const card = db.card(grpid);
  let arr = [];
  if (!card?.reprints) arr = [grpid];
  else arr.push(grpid);

  let have = 0;
  arr.forEach(id => {
    const n = pd.cards.cards[id];
    if (n !== undefined) {
      have += n;
    }
  });

  let copiesLeft = have;
  if (isSideboard) {
    copiesLeft = Math.max(0, copiesLeft - mainQuantity);

    const infiniteCards = [67306, 69172]; // petitioners, rat colony, etc
    if (have >= 4 && infiniteCards.indexOf(grpid) >= 0) {
      copiesLeft = 4;
    }
  }

  return Math.max(0, needed - copiesLeft);
}

export function getCardsMissingCount(deck: Deck, grpid: number): number {
  const mainMissing = get_wc_missing(deck, grpid, false);
  const sideboardMissing = get_wc_missing(deck, grpid, true);
  return mainMissing + sideboardMissing;
}

export function get_deck_missing(deck: Deck): MissingWildcards {
  const missing = { rare: 0, common: 0, uncommon: 0, mythic: 0 };
  const alreadySeenIds = new Set(); // prevents double counting cards across main/sideboard
  const entireDeck = [
    ...deck.getMainboard().get(),
    ...deck.getSideboard().get()
  ];

  entireDeck.forEach(card => {
    const grpid = card.id;
    // process each card at most once
    if (alreadySeenIds.has(grpid)) {
      return;
    }
    const rarity = db.card(grpid)?.rarity;
    if (rarity && rarity !== "land") {
      missing[rarity] += getCardsMissingCount(deck, grpid);
      alreadySeenIds.add(grpid); // remember this card
    }
  });

  return missing;
}

export function getMissingCardCounts(deck: Deck): CardCounts {
  const missingCards: CardCounts = {};
  const allCardIds = new Set(
    [...deck.getMainboard().get(), ...deck.getSideboard().get()].map(
      card => card.id
    )
  );
  allCardIds.forEach(grpid => {
    const missing = getCardsMissingCount(deck, grpid);
    if (missing > 0) {
      missingCards[grpid] = missing;
    }
  });
  return missingCards;
}

export function getBoosterCountEstimate(
  neededWildcards: MissingWildcards
): number {
  let boosterCost = 0;
  const boosterEstimates = {
    common: 3.36,
    uncommon: 2.6,
    rare: 5.72,
    mythic: 13.24
  };

  const ownedWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };

  CARD_RARITIES.map(rarity => {
    if (rarity !== "land") {
      const needed = neededWildcards[rarity] || 0;
      const owned = ownedWildcards[rarity] || 0;
      const missing = Math.max(0, needed - owned);
      boosterCost = Math.max(boosterCost, boosterEstimates[rarity] * missing);
    }
  });

  return Math.round(boosterCost);
}

export function get_deck_export(deck: InternalDeck): string {
  let str = "";
  deck.mainDeck = removeDuplicates(deck.mainDeck);
  deck.mainDeck.forEach(function(card) {
    let grpid = card.id;
    let cardObj = db.card(grpid);

    if (cardObj?.set == "Mythic Edition") {
      // This is awful..
      grpid =
        cardObj.reprints && cardObj.reprints !== true ? cardObj.reprints[0] : 0;
      cardObj = db.card(grpid);
    }

    if (cardObj == undefined) return;
    if (cardObj.dfc == FACE_DFC_FRONT) return;

    const card_name = cardObj.name;
    let card_set = cardObj.set;
    const card_cn = cardObj.cid;
    let card_q = card.quantity;
    if (card_q == 9999) card_q = 1;

    try {
      card_set = db.sets[card_set].arenacode;
      str +=
        card_q + " " + card_name + " (" + card_set + ") " + card_cn + "\r\n";
    } catch (e) {
      str +=
        card_q +
        " " +
        card_name +
        " (" +
        get_set_code(card_set) +
        ") " +
        card_cn +
        "\r\n";
    }
  });

  str += "\r\n";

  deck.sideboard = removeDuplicates(deck.sideboard);
  deck.sideboard.forEach(function(card) {
    let grpid = card.id;
    let cardObj = db.card(grpid);

    if (cardObj?.set == "Mythic Edition") {
      grpid =
        cardObj.reprints && cardObj.reprints !== true ? cardObj.reprints[0] : 0;
      cardObj = db.card(grpid);
    }

    if (cardObj == undefined) return;
    if (cardObj.dfc == FACE_DFC_FRONT) return;

    const card_name = cardObj.name;
    let card_set = cardObj.set;
    const card_cn = cardObj.cid;
    let card_q = card.quantity;
    if (card_q == 9999) card_q = 1;

    try {
      card_set = db.sets[card_set].arenacode;
      str +=
        card_q + " " + card_name + " (" + card_set + ") " + card_cn + "\r\n";
    } catch (e) {
      str +=
        card_q +
        " " +
        card_name +
        " (" +
        get_set_code(card_set) +
        ") " +
        card_cn +
        "\r\n";
    }
  });

  return str;
}

export function get_deck_export_txt(deck: InternalDeck): string {
  let str = "";
  deck.mainDeck = removeDuplicates(deck.mainDeck);
  deck.mainDeck.forEach(function(card) {
    const grpid = card.id;
    const card_name = db.card(grpid)?.name;
    //var card_set = db.card(grpid).set;
    //var card_cn = db.card(grpid).cid;

    str +=
      (card.quantity == 9999 ? 1 : card.quantity) + " " + card_name + "\r\n";
  });

  str += "\r\n";

  deck.sideboard = removeDuplicates(deck.sideboard);
  deck.sideboard.forEach(function(card) {
    const grpid = card.id;
    const card_name = db.card(grpid)?.name;
    //var card_set = db.card(grpid).set;
    //var card_cn = db.card(grpid).cid;

    str +=
      (card.quantity == 9999 ? 1 : card.quantity) + " " + card_name + "\r\n";
  });

  return str;
}

export function timeSince(
  _date: number,
  options?: {
    addSuffix?: boolean;
    unit?: "second" | "minute" | "hour" | "day" | "month" | "year";
    roundingMethod?: "floor" | "ceil" | "round";
    locale?: Locale;
  }
): string {
  // https://date-fns.org/v2.8.1/docs/formatDistanceStrict
  return formatDistanceStrict(_date, new Date(), options);
}

export function replaceAll(str: string, find: string, replace: string): string {
  return str.replace(new RegExp(find, "g"), replace);
}

export function urlDecode(url: string): string {
  return decodeURIComponent(url.replace(/\+/g, " "));
}

export function makeId(length: number): string {
  let ret = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++)
    ret += possible.charAt(Math.floor(Math.random() * possible.length));

  return ret;
}

export function timestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function getTwoDigitString(val: number): string {
  return (val < 10 ? "0" : "") + val;
}

export function toMMSS(sec_num: number): string {
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor((sec_num - hours * 3600) / 60);
  const seconds = sec_num - hours * 3600 - minutes * 60;
  const minutesStr = getTwoDigitString(minutes);
  const secondsStr = getTwoDigitString(seconds);
  if (hours > 0) {
    return hours + ":" + minutesStr + ":" + secondsStr;
  } else {
    return minutes + ":" + secondsStr;
  }
}

export function toDDHHMMSS(sec_num: number): string {
  const dd = Math.floor(sec_num / 86400);
  const hh = Math.floor((sec_num - dd * 86400) / 3600);
  const mm = Math.floor((sec_num - dd * 86400 - hh * 3600) / 60);
  const ss = sec_num - dd * 86400 - hh * 3600 - mm * 60;

  const days = dd + (dd > 1 ? " days" : " day");
  const hours = hh + (hh > 1 ? " hours" : " hour");
  const minutes = mm + (mm > 1 ? " minutes" : " minute");
  const seconds = ss + (ss > 1 ? " seconds" : " second");

  return `${dd > 0 ? days + ", " : ""}
${hh > 0 ? hours + ", " : ""}
${minutes}, 
${seconds}`;
}

export function toHHMMSS(sec_num: number): string {
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor((sec_num - hours * 3600) / 60);
  const seconds = sec_num - hours * 3600 - minutes * 60;
  const hoursStr = getTwoDigitString(hours);
  const minutesStr = getTwoDigitString(minutes);
  const secondsStr = getTwoDigitString(seconds);
  return hoursStr + ":" + minutesStr + ":" + secondsStr;
}

export function toHHMM(sec_num: number): string {
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor((sec_num - hours * 3600) / 60);
  const hoursStr = getTwoDigitString(hours);
  const minutesStr = getTwoDigitString(minutes);
  return hoursStr + ":" + minutesStr;
}

export function add(a: number, b: number): number {
  return a + b;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function objectClone(originalObject: unknown): any {
  return JSON.parse(JSON.stringify(originalObject));
}

// pass in playerData.constructed / limited / historic objects
export function formatRank(
  rank: InternalRankData | MatchPlayer | InternalPlayer
): string {
  if (rank.leaderboardPlace) {
    return `Mythic #${rank.leaderboardPlace}`;
  }
  if (rank.percentile) {
    return `Mythic ${rank.percentile}%`;
  }
  return `${rank.rank} ${rank.tier}`;
}

export function roundWinrate(x: number): number {
  return Math.round(x * 100) / 100;
}
