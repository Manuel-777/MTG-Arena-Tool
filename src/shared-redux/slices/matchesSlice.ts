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
      const match = action.payload as InternalMatch;
      if (state.matchesIndex.indexOf(match.id) === -1) {
        globalStore.matches[match.id] = { ...match };
        state.matchesIndex.push(match.id);
      }
    },
    setManyMatches: (state, action): void => {
      const newList: string[] = [];
      action.payload.map((id: string) => {
        if (state.matchesIndex.indexOf(id) === -1) {
          newList.push(id);
        }
      });
      state.matchesIndex = [...newList, ...state.matchesIndex];
    }
  }
});

export default matchesSlice;
