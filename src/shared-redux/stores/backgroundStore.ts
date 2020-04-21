import { configureStore, combineReducers } from "@reduxjs/toolkit";
import rendererSlice from "../slices/rendererSlice";
import playerDataSlice from "../slices/playerDataSlice";
import settingsSlice from "../slices/settingsSlice";
import appSettingsSlice from "../slices/appSettingsSlice";
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
