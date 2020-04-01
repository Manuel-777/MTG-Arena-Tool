import { InternalMatch } from "../types/match";
import { get_deck_colors as getDeckColors } from "../shared/util";
import { DEFAULT_TILE } from "../shared/constants";
import { prettierDeckData } from "../shared/util";
import db from "../shared/database";
import { InternalEvent } from "../types/event";
import { InternalDeck } from "../types/Deck";
import { InternalEconomyTransaction } from "../types/inventory";
import { InternalDraft } from "../types/draft";
import { InternalRankUpdate } from "../types/rank";

import isValid from "date-fns/isValid";
import parseISO from "date-fns/parseISO";
import { DeckChange } from "../types/Deck";

const defaultDeck = JSON.parse(
  '{"deckTileId":' +
    DEFAULT_TILE +
    ',"description":null,"format":"Standard","colors":[],"id":"00000000-0000-0000-0000-000000000000","isValid":false,"lastUpdated":"2018-05-31T00:06:29.7456958","lockedForEdit":false,"lockedForUse":false,"mainDeck":[],"name":"Undefined","resourceId":"00000000-0000-0000-0000-000000000000","sideboard":[]}'
);

const globalStore = {
  matches: {} as Record<string, InternalMatch>,
  events: {} as Record<string, InternalEvent>,
  decks: {} as Record<string, InternalDeck>,
  staticDecks: [] as string[],
  transactions: {} as Record<string, InternalEconomyTransaction>,
  drafts: {} as Record<string, InternalDraft>,
  seasonal: {} as Record<string, InternalRankUpdate>,
  deckChanges: {} as Record<string, DeckChange>
};

//
// Match utility functions
//
export function getMatch(id: string): InternalMatch | undefined {
  //return globalStore.matches[id] || undefined;
  if (!id || !globalStore.matches[id]) return undefined;
  const matchData = globalStore.matches[id];
  let preconData = {};
  if (matchData.playerDeck && matchData.playerDeck.id in db.preconDecks) {
    preconData = db.preconDecks[matchData.playerDeck.id];
  }
  const playerDeck = prettierDeckData({
    ...defaultDeck,
    ...preconData,
    ...matchData.playerDeck
  });
  playerDeck.colors = getDeckColors(playerDeck);

  const oppDeck = { ...defaultDeck, ...matchData.oppDeck };
  oppDeck.colors = getDeckColors(oppDeck);

  return {
    ...matchData,
    id,
    oppDeck,
    playerDeck,
    type: "match"
  };
}

export function matchExists(id: string): boolean {
  return globalStore.matches[id] ? true : false;
}

export function matchesList(): InternalMatch[] {
  return Object.keys(globalStore.matches).map(
    (key: string) => globalStore.matches[key]
  );
}

//
// Events utility functions
//
export function getEvent(id: string): InternalEvent | undefined {
  if (!id || !globalStore.events[id]) return undefined;
  const eventData = globalStore.events[id];
  return {
    ...eventData,
    //custom: !static_events.includes(id),
    type: "Event"
  };
}

export function eventExists(id: string): boolean {
  return globalStore.events[id] ? true : false;
}

export function eventsList(): InternalEvent[] {
  return Object.keys(globalStore.events).map(
    (key: string) => globalStore.events[key]
  );
}

//
// Decks utility functions
//
export function getDeck(id: string): InternalDeck | undefined {
  if (!id || !globalStore.decks[id]) return undefined;
  const preconData = db.preconDecks[id] || {};
  const deckData = {
    ...preconData,
    ...globalStore.decks[id],
    colors: getDeckColors(globalStore.decks[id]),
    custom: !globalStore.staticDecks.includes(id)
  };
  // lastUpdated does not specify timezone but implicitly occurs at UTC
  // attempt to add UTC timezone to lastUpdated iff result would be valid
  if (
    deckData.lastUpdated &&
    !deckData.lastUpdated.includes("Z") &&
    isValid(parseISO(deckData.lastUpdated + "Z"))
  ) {
    deckData.lastUpdated = deckData.lastUpdated + "Z";
  }
  return prettierDeckData(deckData);
}

export function getDeckName(deckId: string): string {
  return globalStore.decks[deckId]?.name ?? deckId;
}

export function deckExists(id: string): boolean {
  return globalStore.decks[id] ? true : false;
}

export function decksList(): InternalDeck[] {
  return Object.keys(globalStore.decks).map(
    (key: string) => globalStore.decks[key]
  );
}

//
// Deck Changes utility functions
//
export function getDeckChange(id: string): DeckChange | undefined {
  if (!id || !globalStore.events[id]) return undefined;
  return globalStore.deckChanges[id];
}

export function deckChangeExists(id: string): boolean {
  return globalStore.deckChanges[id] ? true : false;
}

export function getDeckChangesList(id?: string): DeckChange[] {
  return Object.keys(globalStore.deckChanges)
    .map(id => globalStore.deckChanges[id])
    .filter(change => change && change.deckId === id);
}

//
// Economy utility functions
//
export function getTransaction(
  id: string
): InternalEconomyTransaction | undefined {
  if (!id || !globalStore.transactions[id]) return undefined;
  const txnData = globalStore.transactions[id];
  return {
    ...txnData,
    // Some old data stores the raw original context in ".originalContext"
    // All NEW data stores this in ".context" and ".originalContext" is blank.
    originalContext: txnData.originalContext ?? txnData.context
  };
}

export function transactionExists(id: string): boolean {
  return globalStore.transactions[id] ? true : false;
}

export function transactionsList(): InternalEconomyTransaction[] {
  return Object.keys(globalStore.transactions).map(
    (key: string) => globalStore.transactions[key]
  );
}

//
// Draft utility functions
//
export function getDraft(id: string): InternalDraft | undefined {
  if (!id || !globalStore.drafts[id]) return undefined;
  return globalStore.drafts[id];
}

export function draftExists(id: string): boolean {
  return globalStore.drafts[id] ? true : false;
}

export function draftsList(): InternalDraft[] {
  return Object.keys(globalStore.drafts).map(
    (key: string) => globalStore.drafts[key]
  );
}

//
// Seasonal utility functions
//
export function getSeasonal(id: string): InternalRankUpdate | undefined {
  if (!id || !globalStore.seasonal[id]) return undefined;
  return globalStore.seasonal[id];
}

export function seasonalExists(id: string): boolean {
  return globalStore.seasonal[id] ? true : false;
}

export function seasonalList(ids: string[] = []): InternalRankUpdate[] {
  if (ids.length == 0) {
    return Object.keys(globalStore.seasonal).map(
      (key: string) => globalStore.seasonal[key]
    );
  } else {
    return ids.map(id => globalStore.seasonal[id]).filter(update => update);
  }
}

export function archive(id: string): any {
  let data = undefined;
  if (deckExists(id)) data = getDeck(id);
  if (draftExists(id)) data = getDraft(id);
  if (matchExists(id)) data = getMatch(id);
  if (eventExists(id)) data = getEvent(id);
  if (transactionExists(id)) data = getTransaction(id);

  if (data) {
    return { ...data, archived: !data.archived };
  }
  return undefined;
}

export default globalStore;
