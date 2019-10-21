import { setData } from "./background-util";
import globals from "./globals";
import playerData from "../shared/player-data.js";

export interface Deck {
  id: string;
}

type StoreShim = { set: (key: string, value: any) => void };

const addCustomDeck = function(customDeck: Deck): void {
  const id = customDeck.id;
  const deckData = {
    // preserve custom fields if possible
    ...(playerData.deck(id) || {}),
    ...customDeck
  };

  setData({ decks: { ...playerData.decks, [customDeck.id]: deckData } });
  if ((globals.debugLog || !globals.firstPass) && globals.store) {
    ((globals.store as unknown) as StoreShim).set("decks." + id, deckData);
  }
};

export default addCustomDeck;
