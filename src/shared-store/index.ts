import { InternalMatch } from "../types/match";
import { get_deck_colors as getDeckColors } from "../shared/util";
import { DEFAULT_TILE } from "../shared/constants";
import { prettierDeckData } from "../shared/util";
import db from "../shared/database";
import { InternalEvent } from "../types/event";

const defaultDeck = JSON.parse(
  '{"deckTileId":' +
    DEFAULT_TILE +
    ',"description":null,"format":"Standard","colors":[],"id":"00000000-0000-0000-0000-000000000000","isValid":false,"lastUpdated":"2018-05-31T00:06:29.7456958","lockedForEdit":false,"lockedForUse":false,"mainDeck":[],"name":"Undefined","resourceId":"00000000-0000-0000-0000-000000000000","sideboard":[]}'
);

const globalStore = {
  matches: {} as Record<string, InternalMatch>,
  events: {} as Record<string, InternalEvent>
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

export default globalStore;
