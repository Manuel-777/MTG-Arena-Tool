import { createSlice } from "@reduxjs/toolkit";
import { playerDataDefault, defaultCfg } from "../../shared/PlayerData";
import { MergedSettings } from "../../types/settings";

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    ...playerDataDefault.settings,
    ...defaultCfg.settings
  } as MergedSettings,
  reducers: {
    setSettings: (state, action): void => {
      Object.assign(state, action.payload);
    }
  }
});

export default settingsSlice;
