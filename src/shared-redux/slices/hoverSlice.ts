import { createSlice } from "@reduxjs/toolkit";

const hoverSlice = createSlice({
  name: "hover",
  initialState: {
    grpId: 0,
    opacity: 0,
    size: 0
  },
  reducers: {
    setHoverIn: (state, action): void => {
      state.grpId = action.payload;
      state.opacity = 1;
    },
    setHoverOut: (state): void => {
      state.opacity = 0;
    },
    setHoverSize: (state, action): void => {
      state.size = action.payload;
    }
  }
});

export default hoverSlice;
