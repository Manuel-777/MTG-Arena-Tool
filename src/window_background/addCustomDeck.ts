import { setData } from "./backgroundUtil";
import { playerDb } from "../shared/db/LocalDatabase";
import playerData from "../shared/PlayerData";
import { InternalDeck } from "../types/Deck";

export default function addCustomDeck(customDeck: Partial<InternalDeck>): void {
  const id = customDeck.id ?? "";
  const deckData = {
    // preserve custom fields if possible
    ...(playerData.deck(id) || {}),
    ...customDeck
  };

  setData({ decks: { ...playerData.decks, [id]: deckData } });
  playerDb.upsert("decks", id, deckData);
}
