import DeckOption, { DeckOptionDeck } from "./DeckOption";
import Aggregator from "./aggregator";
import React from "react";

export type DeckType = DeckOptionDeck & { id: string };

export default function getDeckComponent(deckId: string, decks: DeckType[]) {
  if (deckId === Aggregator.DEFAULT_DECK) return deckId;
  const matches = decks.filter((_deck: { id: string }) => _deck.id === deckId);
  if (matches.length === 0) return deckId;
  const deck = matches[0];

  return <DeckOption deckId={deckId} deck={deck} />;
}

export const getDeckComponentForwarded = (decks: DeckType[]) => (
  deckId: string
) => {
  return getDeckComponent(deckId, decks);
};
