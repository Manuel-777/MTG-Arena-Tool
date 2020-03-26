import { configureStore, combineReducers } from "@reduxjs/toolkit";
import rendererSlice from "../slices/rendererSlice";
import settingsSlice from "../slices/settingsSlice";

const rootReducer = combineReducers({
  settings: settingsSlice.reducer,
  renderer: rendererSlice.reducer
});

const store = configureStore({
  reducer: rootReducer
});

export default store;
export type AppState = ReturnType<typeof rootReducer>;
