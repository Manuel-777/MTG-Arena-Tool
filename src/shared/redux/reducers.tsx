import { combineReducers } from "redux";
import { createSlice } from "@reduxjs/toolkit";
import { defaultState } from "./appState";

export const LOGIN_AUTH = 1;
export const LOGIN_WAITING = 2;
export const LOGIN_OK = 3;
export const LOGIN_FAILED = 4;

export const settingsSlice = createSlice({
  name: "settings",
  initialState: defaultState.settings,
  reducers: {
    setSettings: (state, action): void => {
      Object.assign(state, action.payload);
    }
  }
});

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

export const rendererSlice = createSlice({
  name: "renderer",
  initialState: defaultState.renderer,
  reducers: {
    setBackgroundColor: (state, action): void => {
      state.backgroundColor = action.payload;
    },
    setBackgroundGrpId: (state, action): void => {
      state.backgroundGrpId = action.payload;
    },
    setBackgroundImage: (state, action): void => {
      state.backgroundImage = action.payload;
    },
    setLoading: (state, action): void => {
      state.loading = action.payload;
    },
    setNoLog: (state, action): void => {
      state.noLog = action.payload;
    },
    setOffline: (state, action): void => {
      state.offline = action.payload;
    },
    setPatreon: (state, action): void => {
      state.patreon = action.payload;
    },
    setPopup: (state, action): void => {
      state.popup = action.payload;
    },
    setShareDialog: (state, action): void => {
      state.shareDialog = action.payload;
      state.shareDialog.open = true;
    },
    setShareDialogOpen: (state, action): void => {
      state.shareDialog.open = action.payload;
    },
    setShareDialogUrl: (state, action): void => {
      state.shareDialog.url = action.payload;
    },
    setSubNav: (state, action): void => {
      state.subNav = action.payload;
    },
    setTopArtist: (state, action): void => {
      state.topArtist = action.payload;
    },
    setTopNav: (state, action): void => {
      state.topNav = action.payload;
    },
    setUpdateState: (state, action): void => {
      state.updateState = action.payload;
    }
  }
});

export const loginSlice = createSlice({
  name: "login",
  initialState: defaultState.login,
  reducers: {
    setLoginState: (state, action): void => {
      state.loginState = action.payload;
    },
    setLoginPassword: (state, action): void => {
      state.loginForm.pass = action.payload;
    },
    setLoginEmail: (state, action): void => {
      state.loginForm.email = action.payload;
    },
    setLoginRemember: (state, action): void => {
      state.loginForm.rememberme = action.payload;
    },
    setLoginForm: (state, action): void => {
      state.loginForm = action.payload;
    },
    setCanLogin: (state, action): void => {
      state.canLogin = action.payload;
    }
  }
});

export const homeSlice = createSlice({
  name: "home",
  initialState: defaultState.homeData,
  reducers: {
    setHomeData: (state, action) => action.payload
  }
});

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

export default combineReducers({
  settings: settingsSlice.reducer,
  renderer: rendererSlice.reducer,
  hover: hoverSlice.reducer,
  login: loginSlice.reducer,
  homeData: homeSlice.reducer,
  explore: exploreSlice.reducer
});
