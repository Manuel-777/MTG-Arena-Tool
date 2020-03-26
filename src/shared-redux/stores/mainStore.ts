import { configureStore } from "@reduxjs/toolkit";
import counterSlice from "../slices/counterSlice";

// Eeach process should just import the slices it needs
// and create its own store in a separate file for each.
const store = configureStore({
  reducer: counterSlice.reducer
});

export default store;
