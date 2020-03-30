/* eslint-disable @typescript-eslint/camelcase */
import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import settingsSlice from "../slices/settingsSlice";
import playerDataSlice from "../slices/playerDataSlice";
import appSettingsSlice from "../slices/appSettingsSlice";
import rendererSlice from "../slices/rendererSlice";
import hoverSlice from "../slices/hoverSlice";
import loginSlice from "../slices/loginSlice";
import homeSlice from "../slices/homeSlice";
import collectionSlice from "../slices/collectionSlice";
import exploreSlice from "../slices/exploreSlice";
import matchesSlice from "../slices/matchesSlice";
import eventsSlice from "../slices/eventsSlice";
import decksSlice from "../slices/decksSlice";

const rootReducer = combineReducers({
  settings: settingsSlice.reducer,
  playerdata: playerDataSlice.reducer,
  appsettings: appSettingsSlice.reducer,
  renderer: rendererSlice.reducer,
  hover: hoverSlice.reducer,
  login: loginSlice.reducer,
  homeData: homeSlice.reducer,
  collection: collectionSlice.reducer,
  explore: exploreSlice.reducer,
  matches: matchesSlice.reducer,
  events: eventsSlice.reducer,
  decks: decksSlice.reducer
});

const store = configureStore({
  reducer: rootReducer
});

export default store;
export type AppState = ReturnType<typeof rootReducer>;
