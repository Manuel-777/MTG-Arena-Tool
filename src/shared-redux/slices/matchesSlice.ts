import { createSlice } from "@reduxjs/toolkit";
import { InternalMatch } from "../../types/match";
import globalStore from "../../shared-store";

const matchesSlice = createSlice({
  name: "matches",
  initialState: {
    matchesIndex: [] as string[]
  },
  reducers: {
    setMatch: (state, action): void => {
      // We send the match along the state but add the match
      // in a separate store. Adding deep/complex objects to redux
      // seems to be highly inneficient and requires using inmutability.
      const match = action.payload as InternalMatch;
      globalStore.matches[match.id] = { ...match };
      if (state.matchesIndex.indexOf(match.id) === -1) {
        state.matchesIndex.push(match.id);
      }
    },
    setManyMatches: (state, action): void => {
      const newList: string[] = [];
      action.payload.map((match: InternalMatch) => {
        if (state.matchesIndex.indexOf(match.id) === -1) {
          globalStore.matches[match.id] = match;
          newList.push(match.id);
        }
      });
      state.matchesIndex = [...newList, ...state.matchesIndex];
    }
  }
});

export default matchesSlice;
