import { createSlice } from "@reduxjs/toolkit";
import { WildcardsChange } from "../../window_main/tabs/HomeTab";

const homeSlice = createSlice({
  name: "home",
  initialState: {
    wildcards: [] as WildcardsChange[],
    filteredSet: "",
    usersActive: 0
  },
  reducers: {
    setHomeData: (state, action): any => action.payload
  }
});

export default homeSlice;
