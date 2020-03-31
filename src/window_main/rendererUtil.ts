/* eslint-disable @typescript-eslint/no-use-before-define, @typescript-eslint/camelcase */
import { app, ipcRenderer as ipc, remote } from "electron";
import path from "path";
import Pikaday from "pikaday";
import {
  IPC_BACKGROUND,
  IPC_RENDERER,
  CARD_RARITIES
} from "../shared/constants";
import { WinLossGate } from "../types/event";
import store from "../shared-redux/stores/rendererStore";
import { MissingWildcards, CardCounts } from "./components/decks/types";
import Deck from "../shared/deck";
import db from "../shared/database";

export const actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);

export function ipcSend(
  method: string,
  arg?: unknown,
  to = IPC_BACKGROUND
): void {
  ipc.send("ipc_switch", method, IPC_RENDERER, arg, to);
}

export function toggleArchived(id: string | number): void {
  ipcSend("toggle_archived", id);
}

export function getTagColor(tag?: string): string {
  return (
    (tag ? store.getState().playerdata.tagsColors[tag] : undefined) ?? "#FAE5D2"
  );
}

export function makeResizable(
  div: HTMLElement,
  resizeCallback?: (width: number) => void,
  finalCallback?: (width: number) => void
): void {
  let mPos: number;
  let finalWidth: number | undefined;

  const resize = function(e: MouseEvent): void {
    const parent = div.parentNode;
    if (parent) {
      const parEl = parent as HTMLElement;
      const dx = mPos - e.x;
      mPos = e.x;
      const newWidth = Math.max(10, parseInt(parEl.style.width) + dx);
      parEl.style.width = `${newWidth}px`;
      parEl.style.flex = `0 0 ${newWidth}px`;
      if (resizeCallback instanceof Function) resizeCallback(newWidth);
      finalWidth = newWidth;
    }
  };

  div.addEventListener(
    "mousedown",
    event => {
      mPos = event.x;
      document.addEventListener("mousemove", resize, false);
    },
    false
  );

  document.addEventListener(
    "mouseup",
    () => {
      document.removeEventListener("mousemove", resize, false);
      if (finalWidth) {
        if (finalCallback instanceof Function) finalCallback(finalWidth);
        finalWidth = undefined;
      }
    },
    false
  );
}

export function showDatepicker(
  defaultDate: Date | undefined,
  onChange: (date: Date) => void | undefined,
  pickerOptions = {}
): void {
  const cont = document.createElement("div");
  cont.classList.add("dialog_content");
  cont.style.width = "320px";
  cont.style.height = "400px";
  // https://github.com/Pikaday/Pikaday
  const now = new Date();
  const picker = new Pikaday({
    defaultDate,
    maxDate: now,
    onSelect: (): void => {
      const value = picker.getDate();
      value && onChange && onChange(value);
    },
    setDefaultDate: defaultDate !== undefined,
    ...pickerOptions
  });
  cont.appendChild(picker.el);
}

export function formatPercent(
  value: number,
  config = { maximumSignificantDigits: 2 }
): string {
  return value.toLocaleString([], {
    style: "percent",
    ...config
  });
}

export function formatWinrateInterval(lower: number, upper: number): string {
  return `${formatPercent(lower)} to ${formatPercent(upper)} with 95% confidence
(estimated actual winrate bounds, assuming a normal distribution)`;
}

export function formatNumber(value: number, config = {}): string {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

export function getWinrateClass(wr: number): string {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

export function getEventWinLossClass(wlGate: Partial<WinLossGate>): string {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins && wlGate.CurrentLosses) {
    if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
    if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  }
  return "red";
}

interface Winrate {
  wins: number;
  losses: number;
  colors?: number[] | undefined;
}

export function compareWinrates(a: Winrate, b: Winrate): -1 | 0 | 1 {
  const _a = a.wins / a.losses;
  const _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compareColorWinrates(a, b);
}

export function compareColorWinrates(winA: Winrate, winB: Winrate): -1 | 0 | 1 {
  const a = winA.colors ?? [];
  const b = winB.colors ?? [];

  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;

  const sa = a.reduce(function(_a: number, _b: number) {
    return _a + _b;
  }, 0);
  const sb = b.reduce(function(_a: number, _b: number) {
    return _a + _b;
  }, 0);
  if (sa < sb) return -1;
  if (sa > sb) return 1;

  return 0;
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

  const playerEconomy = store.getState().playerdata.economy;

  const ownedWildcards = {
    common: playerEconomy.wcCommon,
    uncommon: playerEconomy.wcUncommon,
    rare: playerEconomy.wcRare,
    mythic: playerEconomy.wcMythic
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

export function getWildcardsMissing(
  deck: Deck,
  grpid: number,
  isSideboard?: boolean
): number {
  let mainQuantity = 0;
  const cards = store.getState().playerdata.cards;
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
    const n = cards.cards[id];
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
/*
  // This is the function that was in the Deck class
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
*/

export function getCardsMissingCount(deck: Deck, grpid: number): number {
  const mainMissing = getWildcardsMissing(deck, grpid, false);
  const sideboardMissing = getWildcardsMissing(deck, grpid, true);
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
