/* eslint-disable @typescript-eslint/camelcase */
import formatDistanceStrict from "date-fns/formatDistanceStrict";
import { shell } from "electron";
import { MatchPlayer } from "../types/currentMatch";
import { CardObject, InternalDeck, v2cardsList } from "../types/Deck";
import { InternalPlayer } from "../types/match";
import { DbCardData } from "../types/Metadata";
import { InternalRankData } from "../types/rank";

import {
  BLACK,
  BLUE,
  FACE_DFC_FRONT,
  FORMATS,
  GREEN,
  RED,
  WHITE
} from "./constants";
import db from "./database";
const NO_IMG_URL = "../images/notfound.png";

export function getCardImage(
  card: DbCardData | number | undefined,
  quality: string
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

export function prettierDeckData(deckData: InternalDeck): InternalDeck {
  // many precon descriptions are total garbage
  // manually update them with generic descriptions
  const prettyDescriptions: Record<string, string> = {
    "Decks/Precon/Precon_EPP_BG_Desc": "Golgari Swarm",
    "Decks/Precon/Precon_EPP_BR_Desc": "Cult of Rakdos",
    "Decks/Precon/Precon_EPP_GU_Desc": "Simic Combine",
    "Decks/Precon/Precon_EPP_GW_Desc": "Selesnya Conclave",
    "Decks/Precon/Precon_EPP_RG_Desc": "Gruul Clans",
    "Decks/Precon/Precon_EPP_RW_Desc": "Boros Legion",
    "Decks/Precon/Precon_EPP_UB_Desc": "House Dimir",
    "Decks/Precon/Precon_EPP_UR_Desc": "Izzet League",
    "Decks/Precon/Precon_EPP_WB_Desc": "Orzhov Syndicate",
    "Decks/Precon/Precon_EPP_WU_Desc": "Azorius Senate",
    "Decks/Precon/Precon_July_B": "Out for Blood",
    "Decks/Precon/Precon_July_U": "Azure Skies",
    "Decks/Precon/Precon_July_G": "Forest's Might",
    "Decks/Precon/Precon_July_R": "Dome Destruction",
    "Decks/Precon/Precon_July_W": "Angelic Army",
    "Decks/Precon/Precon_Brawl_Alela": "Alela, Artful Provocateur",
    "Decks/Precon/Precon_Brawl_Chulane": "Chulane, Teller of Tales",
    "Decks/Precon/Precon_Brawl_Korvold": "Korvold, Fae-Cursed King",
    "Decks/Precon/Precon_Brawl_SyrGwyn": "Syr Gwyn, Hero of Ashvale"
  };
  if (deckData.description in prettyDescriptions) {
    deckData.description = prettyDescriptions[deckData.description];
  }
  if (deckData.name.includes("?=?Loc")) {
    // precon deck names are garbage address locators
    // mask them with description instead
    deckData.name = deckData.description || "Preconstructed Deck";
  }
  return deckData;
}
