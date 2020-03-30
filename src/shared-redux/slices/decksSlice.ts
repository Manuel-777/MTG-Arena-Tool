import { createSlice } from "@reduxjs/toolkit";
import globalStore from "../../shared-store";
import { InternalDeck } from "../../types/Deck";

const decksSlice = createSlice({
  name: "decks",
  initialState: {
    decksIndex: [] as string[]
  },
  reducers: {
    setDeck: (state, action): void => {
      const deck = action.payload as InternalDeck;
      globalStore.decks[deck.id] = { ...deck };
      if (state.decksIndex.indexOf(deck.id) === -1) {
        state.decksIndex.push(deck.id);
      }
    },
    setManyDecks: (state, action): void => {
      const newList: string[] = [];
      action.payload.map((deck: InternalDeck) => {
        if (state.decksIndex.indexOf(deck.id) === -1) {
          globalStore.decks[deck.id] = deck;
          newList.push(deck.id);
        }
      });
      state.decksIndex = [...newList, ...state.decksIndex];
    }
  }
});

export default decksSlice;
