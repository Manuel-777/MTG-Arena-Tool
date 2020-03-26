import { createSlice } from "@reduxjs/toolkit";

// Just an example slice.
const counterSlice = createSlice({
  name: "counter",
  initialState: 0,
  reducers: {
    increment: state => state + 1,
    decrement: state => state - 1
  }
});

export default counterSlice;
