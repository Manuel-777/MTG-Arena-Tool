import { combineReducers } from "redux";
import { createSlice } from "@reduxjs/toolkit";
import { defaultState } from "./appState";
import { WildcardsChange } from "../../window_main/tabs/HomeTab";
import { MergedSettings } from "../../types/settings";

export const SET_BACKGROUND_IMAGE = "SET_BACKGROUND_IMAGE";
export const SET_BACKGROUND_GRPID = "SET_BACKGROUND_GRPID";
export const SET_BACKGROUND_COLOR = "SET_BACKGROUND_COLOR";
export const SET_SETTINGS = "SET_SETTINGS";
export const SET_TOP_ARTIST = "SET_TOP_ARTIST";
export const SET_OFFLINE = "SET_OFFLINE";
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
export const SET_UPDATE_STATE = "SET_UPDATE_STATE";
export const SET_NO_LOG = "SET_NO_LOG";
export const SET_SHARE_DIALOG = "SET_SHARE_DIALOG";
export const SET_SHARE_DIALOG_URL = "SET_SHARE_DIALOG_URL";
export const SET_SHARE_DIALOG_OPEN = "SET_SHARE_DIALOG_OPEN";
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

export const hoverSlice = createSlice({
  name: "hover",
  initialState: defaultState.hover,
  reducers: {
    setHoverIn: (state, action): void => {
      state.grpId = action.payload;
      state.opacity = 1;
    },
    setHoverOut: (state): void => {
      state.opacity = 0;
    },
    setHoverSize: (state, action): void => {
      state.size = action.payload;
    }
  }
});

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

export const loadingSlice = createSlice({
  name: "loading",
  initialState: defaultState.loading,
  reducers: {
    setLoading: (state, action): boolean => action.payload
  }
});

export const topNavSlice = createSlice({
  name: "topNav",
  initialState: defaultState.topNav,
  reducers: {
    setTopNav: (state, action): number => action.payload
  }
});

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

export const exploreSlice = createSlice({
  name: "explore",
  initialState: defaultState.explore,
  reducers: {
    setExploreData: (state, action): void => {
      const isSameResultType =
        state.data.results_type === action.payload.results_type;
      const isSubsequentResult = action.payload.skip > state.data.skip;
      if (isSameResultType && isSubsequentResult) {
        // when possible, extend prevous data
        const result = state.data.result.concat(action.payload.result);
        const resultsNumber =
          state.data.results_number + action.payload.results_number;
        action.payload.result = result;
        action.payload.results_number = resultsNumber;
        state.data = action.payload;
      } else if (action.payload.results_number === 0) {
        // query has no future results
        state.data.results_number = -1;
      } else {
        state.data = action.payload;
      }
    },
    setExploreFilters: (state, action): void => {
      state.filters = action.payload;
    },
    setExploreFiltersSkip: (state, action): void => {
      state.filters.filterSkip = action.payload;
    },
    setActiveEvents: (state, action): void => {
      state.activeEvents.push(...action.payload);
    }
  }
});

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

export default combineReducers({
  backgroundGrpId: backgroundGrpId,
  settings: settings,
  topArtist: topArtist,
  hover: hoverSlice.reducer,
  offline: offline,
  loading: loadingSlice.reducer,
  loginState: loginState,
  topNav: topNavSlice.reducer,
  subNav: subNav,
  loginForm: loginForm,
  canLogin: canLogin,
  homeData: homeData,
  popup: popup,
  patreon: patreon,
  explore: exploreSlice.reducer,
  updateState: updateState,
  noLog: noLog,
  shareDialog: shareDialog
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
