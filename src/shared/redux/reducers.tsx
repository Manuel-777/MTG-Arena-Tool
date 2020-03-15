import { combineReducers } from "redux";
import { defaultState } from "./appState";
import { WildcardsChange } from "../../window_main/tabs/HomeTab";
import { MergedSettings } from "../../types/settings";

export const SET_BACKGROUND_IMAGE = "SET_BACKGROUND_IMAGE";
export const SET_BACKGROUND_GRPID = "SET_BACKGROUND_GRPID";
export const SET_BACKGROUND_COLOR = "SET_BACKGROUND_COLOR";
export const SET_SETTINGS = "SET_SETTINGS";
export const SET_TOP_ARTIST = "SET_TOP_ARTIST";
export const SET_HOVER_IN = "SET_HOVER_IN";
export const SET_HOVER_OUT = "SET_HOVER_OUT";
export const SET_HOVER_SIZE = "SET_HOVER_SIZE";
export const SET_OFFLINE = "SET_OFFLINE";
export const SET_LOADING = "SET_LOADING";
export const SET_TOP_NAV = "SET_TOP_NAV";
export const SET_SUB_NAV = "SET_SUB_NAV";
export const SET_LOGIN_STATE = "SET_LOGIN_STATE";
export const SET_LOGIN_FORM = "SET_LOGIN_FORM";
export const SET_LOGIN_EMAIL = "SET_LOGIN_EMAIL";
export const SET_LOGIN_REMEMBER = "SET_LOGIN_REMEMBER";
export const SET_LOGIN_PASS = "SET_LOGIN_PASS";
export const SET_CAN_LOGIN = "SET_CAN_LOGIN";
export const SET_HOME_DATA = "SET_HOME_DATA";
export const SET_POPUP = "SET_POPUP";
export const SET_PATREON = "SET_PATREON";
export const SET_EXPLORE_DATA = "SET_EXPLORE_DATA";
export const SET_EXPLORE_FILTERS = "SET_EXPLORE_FILTERS";
export const SET_EXPLORE_FILTERS_SKIP = "SET_EXPLORE_FILTERS_SKIP";
export const SET_UPDATE_STATE = "SET_UPDATE_STATE";
export const SET_NO_LOG = "SET_NO_LOG";
export const SET_SHARE_DIALOG = "SET_SHARE_DIALOG";
export const SET_SHARE_DIALOG_URL = "SET_SHARE_DIALOG_URL";
export const SET_SHARE_DIALOG_OPEN = "SET_SHARE_DIALOG_OPEN";
export const SET_ACTIVE_EVENTS = "SET_ACTIVE_EVENTS";
export const SET_ANY = "SET_ANY";

export const LOGIN_AUTH = 1;
export const LOGIN_WAITING = 2;
export const LOGIN_OK = 3;
export const LOGIN_FAILED = 4;

export interface Action {
  type: string;
  value: any;
}

const backgroundGrpId = (
  state: number = defaultState.backgroundGrpId,
  action: Action
): number => {
  switch (action.type) {
    case SET_BACKGROUND_GRPID:
      return action.value;
    default:
      return state;
  }
};

const settings = (
  state: MergedSettings = defaultState.settings,
  action: Action
): MergedSettings => {
  switch (action.type) {
    case SET_SETTINGS:
      return action.value;
    case SET_BACKGROUND_IMAGE:
      return { ...state, back_url: action.value };
    case SET_BACKGROUND_COLOR:
      return { ...state, back_color: action.value };
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
  data: any;
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
      if (action.value.skip == 0) return action.value;
      else
        return {
          ...action.value,
          result: [...state.result, ...action.value.result]
        };
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
    case SET_EXPLORE_FILTERS_SKIP:
      return { ...state, filterSkip: action.value };
    default:
      return state;
  }
};

const updateState = (
  state: string = defaultState.updateState,
  action: Action
): string => {
  switch (action.type) {
    case SET_UPDATE_STATE:
      return action.value;
    default:
      return state;
  }
};

const noLog = (
  state: boolean = defaultState.noLog,
  action: Action
): boolean => {
  switch (action.type) {
    case SET_NO_LOG:
      return action.value;
    default:
      return state;
  }
};

interface ShareDialogState {
  open: boolean;
  url: string;
  data: any;
  id: string;
}

const shareDialog = (
  state: ShareDialogState = defaultState.shareDialog,
  action: Action
): ShareDialogState => {
  switch (action.type) {
    case SET_SHARE_DIALOG:
      return { ...state, open: true, ...action.value };
    case SET_SHARE_DIALOG_URL:
      return { ...state, url: action.value };
    case SET_SHARE_DIALOG_OPEN:
      return { ...state, open: action.value };
    default:
      return state;
  }
};

const activeEvents = (
  state: string[] = defaultState.activeEvents,
  action: Action
): string[] => {
  switch (action.type) {
    case SET_ACTIVE_EVENTS:
      return { ...state, ...action.value };
    default:
      return state;
  }
};

export default combineReducers({
  backgroundGrpId: backgroundGrpId,
  settings: settings,
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
  exploreFilters: exploreFilters,
  updateState: updateState,
  noLog: noLog,
  shareDialog: shareDialog,
  activeEvents: activeEvents
});

export function dispatchAction(
  dispatch: any,
  action: string,
  value: any
): void {
  dispatch({
    type: action,
    value: value
  });
}
