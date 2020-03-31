import { createSlice } from "@reduxjs/toolkit";
import globalStore from "../../shared-store";
import { DeckChange } from "../../types/Deck";

const deckChangesSlice = createSlice({
  name: "deckChanges",
  initialState: {
    deckChangesIndex: [] as string[]
  },
  reducers: {
    setChange: (state, action): void => {
      const change = action.payload as DeckChange;
      globalStore.deckChanges[change.id] = { ...change };
      if (state.deckChangesIndex.indexOf(change.id) === -1) {
        state.deckChangesIndex.push(change.id);
      }
    },
    setManyChangees: (state, action): void => {
      const newList: string[] = [];
      action.payload.map((change: DeckChange) => {
        if (state.deckChangesIndex.indexOf(change.id) === -1) {
          globalStore.deckChanges[change.id] = change;
          newList.push(change.id);
        }
      });
      state.deckChangesIndex = [...newList, ...state.deckChangesIndex];
    }
  }
});

export default deckChangesSlice;
