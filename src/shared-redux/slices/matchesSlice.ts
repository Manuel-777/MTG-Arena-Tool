import {
  createSlice,
  SliceCaseReducers,
  PayloadAction
} from "@reduxjs/toolkit";
import { InternalMatch } from "../../types/match";
import globalStore from "../../shared-store";

const initialMatchState = {
  matchesIndex: [] as string[]
};

type Matches = typeof initialMatchState;

const matchesSlice = createSlice<Matches, SliceCaseReducers<Matches>>({
  name: "matches",
  initialState: initialMatchState,
  reducers: {
    setMatch: (state: Matches, action: PayloadAction<InternalMatch>): void => {
      // We send the match along the state but add the match
      // in a separate store. Adding deep/complex objects to redux
      // seems to be highly inneficient and requires using inmutability.
      const match = action.payload;
      globalStore.matches[match.id] = { ...match };
      if (state.matchesIndex.indexOf(match.id) === -1) {
        state.matchesIndex.push(match.id);
      }
    },
    setManyMatches: (
      state: Matches,
      action: PayloadAction<InternalMatch[]>
    ): void => {
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

export const { setManyMatches, setMatch } = matchesSlice.actions;

export default matchesSlice;
