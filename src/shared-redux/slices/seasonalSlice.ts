import { createSlice } from "@reduxjs/toolkit";
import { InternalRankUpdate } from "../../types/rank";
import globalStore from "../../shared-store";

const seasonalSlice = createSlice({
  name: "seasonal",
  initialState: {
    seasonal: {} as Record<string, string[]>
  },
  reducers: {
    setSeasonal: (state, action): void => {
      const update = action.payload as InternalRankUpdate;
      // Add to global store
      globalStore.seasonal[update.id] = update;
      const season = `${update.rankUpdateType.toLowerCase()}_${
        update.seasonOrdinal
      }`;
      // Add to indexes
      state.seasonal[season] = [...(state.seasonal[season] || []), update.id];
    },
    setManySeasonal: (state, action): void => {
      const newSeasonal = { ...state.seasonal };
      Object.keys(action.payload).forEach((id: string) => {
        const update = action.payload[id] as InternalRankUpdate;
        // Add to global store
        globalStore.seasonal[update.id] = update;
        const season = `${update.rankUpdateType.toLowerCase()}_${
          update.seasonOrdinal
        }`;
        // Add to indexes
        newSeasonal[season] = [...(newSeasonal[season] || []), update.id];
      });
      state.seasonal = newSeasonal;
    }
  }
});

export default seasonalSlice;
