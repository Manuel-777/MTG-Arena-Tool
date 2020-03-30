import { configureStore, combineReducers } from "@reduxjs/toolkit";
import rendererSlice from "../slices/rendererSlice";
import playerDataSlice from "../slices/playerDataSlice";
import settingsSlice from "../slices/settingsSlice";
import appSettingsSlice from "../slices/appSettingsSlice";
import matchesSlice from "../slices/matchesSlice";
import eventsSlice from "../slices/eventsSlice";

const rootReducer = combineReducers({
  settings: settingsSlice.reducer,
  playerdata: playerDataSlice.reducer,
  appsettings: appSettingsSlice.reducer,
  renderer: rendererSlice.reducer,
  matches: matchesSlice.reducer,
  events: eventsSlice.reducer
});

const store = configureStore({
  reducer: rootReducer
});

export default store;
export type AppState = ReturnType<typeof rootReducer>;
