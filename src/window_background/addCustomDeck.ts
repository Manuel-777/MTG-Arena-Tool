import { playerDb } from "../shared/db/LocalDatabase";
import { InternalDeck } from "../types/Deck";
import { getDeck } from "../shared-store";
import { reduxAction } from "../shared-redux/sharedRedux";
import globals from "./globals";
import { IPC_RENDERER } from "../shared/constants";

export default function addCustomDeck(customDeck: Partial<InternalDeck>): void {
  const id = customDeck.id ?? "";
  const deckData = {
    // preserve custom fields if possible
    ...(getDeck(id) || {}),
    ...customDeck
  };

  reduxAction(globals.store.dispatch, "SET_DECK", deckData, IPC_RENDERER);
  playerDb.upsert("decks", id, deckData);
}
