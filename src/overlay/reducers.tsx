import { combineReducers } from "redux";
import { hoverSlice, settingsSlice } from "../shared/redux/reducers";

export default combineReducers({
  settings: settingsSlice.reducer,
  hover: hoverSlice.reducer
});
