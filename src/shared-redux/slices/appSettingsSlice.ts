import { createSlice } from "@reduxjs/toolkit";

const settingsSlice = createSlice({
  name: "appsettings",
  initialState: {
    email: "",
    token: "",
    toolVersion: 0,
    autoLogin: false,
    launchToTray: false,
    rememberMe: true,
    betaChannel: false,
    metadataLang: "en",
    logLocaleFormat: "",
    logUri: ""
  },
  reducers: {
    setAppSettings: (state, action): void => {
      Object.assign(state, action.payload);
    }
  }
});

export default settingsSlice;
