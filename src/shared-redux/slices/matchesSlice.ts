import { createSlice } from "@reduxjs/toolkit";
import { InternalMatch } from "../../types/match";

const matchesSlice = createSlice({
  name: "matches",
  initialState: {
    matches: {} as Record<string, any>, // Should be
    matchesIndex: [] as string[]
  },
  reducers: {
    setMatch: (state, action): void => {
      const match = action.payload as InternalMatch;
      if (state.matchesIndex.indexOf(match.id) === -1) {
        state.matches[match.id] = { ...match };
        state.matchesIndex.push(match.id);
      }
    }
  }
});

export default matchesSlice;
