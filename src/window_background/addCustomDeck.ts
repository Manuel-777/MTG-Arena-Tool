import { setData } from "./background-util";
import { playerDb } from "../shared/db/LocalDatabase";
import playerData from "../shared/player-data";

export interface Deck {
  id: string;
}

type StoreShim = { set:(key: string, value: any) => void };

const addCustomDeck = function(customDeck: Deck): void {
  const id = customDeck.id;
  const deckData = {
    // preserve custom fields if possible
    ...(playerData.deck(id) || {}),
    ...customDeck
  };

  setData({ decks: { ...playerData.decks, [customDeck.id]: deckData } });
  playerDb.upsert("decks", id, deckData);
};

export default addCustomDeck;
