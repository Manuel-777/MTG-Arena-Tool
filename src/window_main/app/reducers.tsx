import { combineReducers } from "redux";
import { defaultState } from "./appState";
import { WildcardsChange } from "../HomeTab";

export const SET_BACKGROUND_IMAGE = 1;
export const SET_TOP_ARTIST = 2;
export const SET_HOVER_IN = 3;
export const SET_HOVER_OUT = 4;
export const SET_HOVER_SIZE = 5;
export const SET_OFFLINE = 6;
export const SET_LOADING = 7;
export const SET_TOP_NAV = 8;
export const SET_SUB_NAV = 9;
export const SET_LOGIN_STATE = 10;
export const SET_LOGIN_FORM = 11;
export const SET_LOGIN_EMAIL = 12;
export const SET_LOGIN_REMEMBER = 13;
export const SET_LOGIN_PASS = 14;
export const SET_CAN_LOGIN = 15;
export const SET_HOME_DATA = 16;
export const SET_POPUP = 17;
export const SET_PATREON = 18;
export const SET_EXPLORE_DATA = 19;
export const SET_EXPLORE_FILTERS = 20;
export const SET_ANY = 99;

export const LOGIN_AUTH = 1;
export const LOGIN_WAITING = 2;
export const LOGIN_OK = 3;
export const LOGIN_FAILED = 4;

export interface Action {
  type: number;
  value: any;
}

const backgroundImage = (
  state: string = defaultState.backgroundImage,
  action: Action
): string => {
  switch (action.type) {
    case SET_BACKGROUND_IMAGE:
      return action.value;
    default:
      return state;
  }
};

const topArtist = (
  state: string = defaultState.topArtist,
  action: Action
): string => {
  switch (action.type) {
    case SET_TOP_ARTIST:
      return action.value;
    default:
      return state;
  }
};

export interface HoverCardState {
  hoverGrpId: number;
  hoverOpacity: number;
}

export interface HoverState {
  grpId: number;
  opacity: number;
  size: number;
}

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

const offline = (
  state: boolean = defaultState.offline,
  action: Action
): boolean => {
  switch (action.type) {
    case SET_OFFLINE:
      return action.value;
    default:
      return state;
  }
};

const loading = (
  state: boolean = defaultState.loading,
  action: Action
): boolean => {
  switch (action.type) {
    case SET_LOADING:
      return action.value;
    default:
      return state;
  }
};

const topNav = (
  state: number = defaultState.topNav,
  action: Action
): number => {
  switch (action.type) {
    case SET_TOP_NAV:
      return action.value;
    default:
      return state;
  }
};

export interface SubNavState {
  type: number;
  id: string;
}

const subNav = (
  state: SubNavState = defaultState.subNav,
  action: Action
): SubNavState => {
  switch (action.type) {
    case SET_SUB_NAV:
      return action.value;
    default:
      return state;
  }
};

const loginState = (state = 1, action: Action): number => {
  switch (action.type) {
    case SET_LOGIN_STATE:
      return action.value;
    default:
      return state;
  }
};

export interface LoginFormState {
  email: string;
  pass: string;
  rememberme: boolean;
}

const loginForm = (
  state: LoginFormState = defaultState.loginForm,
  action: Action
): LoginFormState => {
  switch (action.type) {
    case SET_LOGIN_PASS:
      return { ...state, pass: action.value };
    case SET_LOGIN_EMAIL:
      return { ...state, email: action.value };
    case SET_LOGIN_REMEMBER:
      return { ...state, rememberme: action.value };
    case SET_LOGIN_FORM:
      return { ...state, ...action.value };
    default:
      return state;
  }
};

const canLogin = (
  state: boolean = defaultState.canLogin,
  action: Action
): boolean => {
  switch (action.type) {
    case SET_CAN_LOGIN:
      return action.value;
    default:
      return state;
  }
};

export interface HomeDataState {
  wildcards: WildcardsChange[];
  filteredSet: string;
  usersActive: number;
}

const homeData = (
  state: HomeDataState = defaultState.homeData,
  action: Action
): HomeDataState => {
  switch (action.type) {
    case SET_HOME_DATA:
      return action.value;
    default:
      return state;
  }
};

export interface PopupState {
  text: string;
  time: number;
}

const popup = (
  state: PopupState = defaultState.popup,
  action: Action
): PopupState => {
  switch (action.type) {
    case SET_POPUP:
      return action.value;
    default:
      return state;
  }
};

export interface PatreonState {
  patreon: boolean;
  patreonTier: number;
}

const patreon = (
  state: PatreonState = defaultState.patreon,
  action: Action
): PatreonState => {
  switch (action.type) {
    case SET_PATREON:
      return action.value;
    default:
      return state;
  }
};

const explore = (
  state: any = defaultState.exploreData,
  action: Action
): any => {
  switch (action.type) {
    case SET_EXPLORE_DATA:
      return action.value;
    default:
      return state;
  }
};

const exploreFilters = (
  state: any = defaultState.exploreFilters,
  action: Action
): any => {
  switch (action.type) {
    case SET_EXPLORE_FILTERS:
      return action.value;
    default:
      return state;
  }
};

export default combineReducers({
  backgroundImage: backgroundImage,
  topArtist: topArtist,
  hover: hover,
  offline: offline,
  loading: loading,
  loginState: loginState,
  topNav: topNav,
  subNav: subNav,
  loginForm: loginForm,
  canLogin: canLogin,
  homeData: homeData,
  popup: popup,
  patreon: patreon,
  exploreData: explore,
  exploreFilters: exploreFilters
});

export function dispatchAction(
  dispatch: any,
  action: number,
  value: any
): void {
  dispatch({
    type: action,
    value: value
  });
}
