import { configureStore, combineReducers } from "@reduxjs/toolkit";
import rendererSlice from "../slices/rendererSlice";
import settingsSlice from "../slices/settingsSlice";
import matchesSlice from "../slices/matchesSlice";

const rootReducer = combineReducers({
  settings: settingsSlice.reducer,
  renderer: rendererSlice.reducer,
  matches: matchesSlice.reducer
});

const store = configureStore({
  reducer: rootReducer
});

export default store;
export type AppState = ReturnType<typeof rootReducer>;
