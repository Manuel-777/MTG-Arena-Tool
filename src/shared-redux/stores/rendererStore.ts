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
import economySlice from "../slices/economySlice";
import eventsSlice from "../slices/eventsSlice";
import decksSlice from "../slices/decksSlice";
import draftsSlice from "../slices/draftsSlice";
import seasonalSlice from "../slices/seasonalSlice";
import deckChangesSlice from "../slices/deckChangesSlice";

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
  economy: economySlice.reducer,
  events: eventsSlice.reducer,
  decks: decksSlice.reducer,
  drafts: draftsSlice.reducer,
  seasonal: seasonalSlice.reducer,
  deckChanges: deckChangesSlice.reducer
});

const store = configureStore({
  reducer: rootReducer
});

export default store;
export type AppState = ReturnType<typeof rootReducer>;
