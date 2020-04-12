import { createSlice } from "@reduxjs/toolkit";

const hoverSlice = createSlice({
  name: "hover",
  initialState: {
    grpId: 0,
    opacity: 0,
    wanted: 0
  },
  reducers: {
    setHoverIn: (state, action): void => {
      const { grpId, wanted } = action.payload;
      Object.assign(state, {
        grpId: grpId,
        wanted: wanted ?? 0,
        opacity: 1
      });
    },
    setHoverOut: (state): void => {
      state.opacity = 0;
    }
  }
});

export default hoverSlice;
