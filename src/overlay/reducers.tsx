import { combineReducers } from "redux";
import { hoverSlice } from "../shared/redux/reducers";

export default combineReducers({
  hover: hoverSlice.reducer
});
