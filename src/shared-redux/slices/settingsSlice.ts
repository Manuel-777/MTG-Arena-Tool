import { createSlice } from "@reduxjs/toolkit";
import { defaultCfg } from "../../shared/PlayerData";

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    ...defaultCfg.settings
  },
  reducers: {
    setSettings: (state, action): void => {
      Object.assign(state, action.payload);
    }
  }
});

export default settingsSlice;
