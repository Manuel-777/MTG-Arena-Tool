import { createSlice } from "@reduxjs/toolkit";

const collectionSlice = createSlice({
  name: "collection",
  initialState: {
    countMode: "All cards",
    rareDraftFactor: 3,
    mythicDraftFactor: 0.14,
    boosterWinFactor: 1.2,
    futureBoosters: 0
  },
  reducers: {
    setCountMode: (state, action): void => {
      state.countMode = action.payload;
    },
    setRareDraftFactor: (state, action): void => {
      state.rareDraftFactor = action.payload;
    },
    setMythicDraftFactor: (state, action): void => {
      state.mythicDraftFactor = action.payload;
    },
    setBoosterWinFactor: (state, action): void => {
      state.boosterWinFactor = action.payload;
    },
    setFutureBoosters: (state, action): void => {
      state.futureBoosters = action.payload;
    }
  }
});

export default collectionSlice;
