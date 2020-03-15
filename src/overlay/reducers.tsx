import { combineReducers } from "redux";
import {
  Action,
  SET_HOVER_IN,
  SET_HOVER_OUT,
  SET_HOVER_SIZE,
  HoverState
} from "../shared/redux/reducers";

import { defaultState } from "../shared/redux/appState";

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
