import { AppState } from "./ContextProvider";

export const SET_BACKGROUND_IMAGE = 0;
export const SET_TOP_ARTIST = 1;
export const SET_HOVER_CARD = 2;
export const SET_OFFLINE = 3;
export const SET_LOADING = 4;
export const SET_TOP_NAV = 5;
export const SET_LOGIN_STATE = 6;
export const SET_LOGIN_FORM = 7;
export const SET_LOGIN_PASS = 8;
export const SET_CAN_LOGIN = 9;
export const SET_HOME_DATA = 10;
export const SET_POPUP = 11;

export const LOGIN_AUTH = 0;
export const LOGIN_WAITING = 1;
export const LOGIN_OK = 2;
export const LOGIN_FAILED = 3;

export default function contextReducer(state: AppState, action: any): AppState {
  switch (action.type) {
    case SET_BACKGROUND_IMAGE: {
      return { ...state, backgroundImage: action.value };
    }
    case SET_TOP_ARTIST: {
      return { ...state, topArtist: action.value };
    }
    case SET_HOVER_CARD: {
      return { ...state, hoverGrpId: action.value };
    }
    case SET_OFFLINE: {
      return { ...state, offline: action.value };
    }
    case SET_LOADING: {
      return { ...state, loading: action.value };
    }
    case SET_TOP_NAV: {
      return { ...state, topNav: action.value };
    }
    case SET_LOGIN_STATE: {
      return { ...state, login: action.value };
    }
    case SET_LOGIN_PASS: {
      return {
        ...state,
        loginForm: { ...state.loginForm, pass: action.value }
      };
    }
    case SET_LOGIN_FORM: {
      return { ...state, loginForm: action.value };
    }
    case SET_CAN_LOGIN: {
      return { ...state, canLogin: action.value };
    }
    case SET_HOME_DATA: {
      return { ...state, homeData: action.value };
    }
    case SET_POPUP: {
      return { ...state, popup: action.value };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

export function dispatchAction(
  dispatch: any,
  action: number,
  value: any
): void {
  dispatch({ type: action, value: value });
}
