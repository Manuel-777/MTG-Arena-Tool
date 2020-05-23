import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";

const initialHover = {
  grpId: 0,
  opacity: 0,
  wanted: 0
};

type Hover = typeof initialHover;

const hoverSlice = createSlice<Hover, SliceCaseReducers<Hover>>({
  name: "hover",
  initialState: initialHover,
  reducers: {
    setHoverIn: (state: Hover, action): void => {
      const { grpId, wanted } = action.payload;
      Object.assign(state, {
        grpId: grpId,
        wanted: wanted ?? 0,
        opacity: 1
      });
    },
    setHoverOut: (state: Hover): void => {
      state.opacity = 0;
    }
  }
});

export default hoverSlice;
