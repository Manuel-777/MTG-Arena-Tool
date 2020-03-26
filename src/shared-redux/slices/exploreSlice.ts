import { createSlice } from "@reduxjs/toolkit";

export interface ExploreQuery {
  filterWCC: string;
  filterWCU: string;
  filterWCR: string;
  filterWCM: string;
  onlyOwned: boolean;
  filterType: string;
  filterEvent: string;
  filterSort: string;
  filterSortDir: -1 | 1;
  filteredMana: number[];
  filteredRanks: string[];
  filterSkip: number;
}

const exploreSlice = createSlice({
  name: "explore",
  initialState: {
    activeEvents: [] as string[],
    data: {
      results_type: "Ranked Constructed",
      skip: 0,
      results_number: 0,
      result: []
    },
    filters: {
      filterEvent: "Ladder",
      filterType: "Ranked Constructed",
      filterSort: "By Winrate",
      filterSortDir: -1,
      filterSkip: 0,
      filterWCC: "",
      filterWCU: "",
      filterWCR: "",
      filterWCM: "",
      filteredMana: [],
      filteredRanks: [],
      onlyOwned: false
    } as ExploreQuery
  },
  reducers: {
    setExploreData: (state, action): void => {
      const isSameResultType =
        state.data.results_type === action.payload.results_type;
      const isSubsequentResult = action.payload.skip > state.data.skip;
      if (isSameResultType && isSubsequentResult) {
        // when possible, extend prevous data
        const result = state.data.result.concat(action.payload.result);
        const resultsNumber =
          state.data.results_number + action.payload.results_number;
        action.payload.result = result;
        action.payload.results_number = resultsNumber;
        state.data = action.payload;
      } else if (action.payload.results_number === 0) {
        // query has no future results
        state.data.results_number = -1;
      } else {
        state.data = action.payload;
      }
    },
    setExploreFilters: (state, action): void => {
      state.filters = action.payload;
    },
    setExploreFiltersSkip: (state, action): void => {
      state.filters.filterSkip = action.payload;
    },
    setActiveEvents: (state, action): void => {
      state.activeEvents.push(...action.payload);
    }
  }
});

export default exploreSlice;
