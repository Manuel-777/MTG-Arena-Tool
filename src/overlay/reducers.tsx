import { combineReducers } from "redux";
import {
  Action,
  SET_HOVER_IN,
  SET_HOVER_OUT,
  SET_HOVER_SIZE,
  HoverState
} from "../window_main/app/reducers";

import { defaultState } from "../window_main/app/appState";

const hover = (
  state: HoverState = defaultState.hover,
  action: Action
): HoverState => {
  switch (action.type) {
    case SET_HOVER_IN:
      return {
        ...state,
        grpId: action.value,
        opacity: 1
      };
    case SET_HOVER_OUT:
      return {
        ...state,
        opacity: 0
      };
    case SET_HOVER_SIZE:
      return {
        ...state,
        size: action.value
      };
    default:
      return state;
  }
};

export default combineReducers({
  hover: hover
});
