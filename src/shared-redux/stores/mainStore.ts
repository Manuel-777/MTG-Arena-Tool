/* eslint-disable @typescript-eslint/camelcase */
import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import settingsSlice from "../slices/settingsSlice";
import appSettingsSlice from "../slices/appSettingsSlice";
import rendererSlice from "../slices/rendererSlice";
import loginSlice from "../slices/loginSlice";

const rootReducer = combineReducers({
  settings: settingsSlice.reducer,
  appsettings: appSettingsSlice.reducer,
  renderer: rendererSlice.reducer,
  login: loginSlice.reducer
});

const store = configureStore({
  reducer: rootReducer
});

export default store;
export type AppState = ReturnType<typeof rootReducer>;
