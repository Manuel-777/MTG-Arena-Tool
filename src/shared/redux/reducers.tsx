/* eslint-disable @typescript-eslint/camelcase */
import { createSlice } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { MergedSettings } from "../../types/settings";
import { WildcardsChange } from "../../window_main/tabs/HomeTab";
import { defaultCfg, playerDataDefault } from "../PlayerData";

export const LOGIN_AUTH = 1;
export const LOGIN_WAITING = 2;
export const LOGIN_OK = 3;
export const LOGIN_FAILED = 4;

export const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    ...playerDataDefault.settings,
    ...defaultCfg.settings
  } as MergedSettings,
  reducers: {
    setSettings: (state, action): void => {
      Object.assign(state, action.payload);
    }
  }
});

export const hoverSlice = createSlice({
  name: "hover",
  initialState: {
    grpId: 0,
    opacity: 0,
    wanted: 0,
    size: 0
  },
  reducers: {
    setHoverIn: (state, action): void => {
      const { grpId, wanted } = action.payload;
      state.grpId = grpId;
      state.wanted = wanted ?? 0;
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
  initialState: {
    archivedCache: {} as Record<string, boolean>,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    backgroundGrpId: 0,
    backgroundImage: "default",
    loading: false,
    noLog: false,
    offline: false,
    patreon: {
      patreon: false,
      patreonTier: -1
    },
    playerDataTimestamp: Date.now(),
    popup: {
      text: "",
      time: 0,
      duration: 0
    },
    shareDialog: {
      open: false,
      url: "",
      type: "",
      data: {},
      id: ""
    },
    subNav: {
      type: -1,
      id: "",
      data: null
    },
    topArtist: "Bedevil by Seb McKinnon",
    topNav: 0,
    updateState: ""
  },
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
    setPlayerDataTimestamp: (state, action): void => {
      state.playerDataTimestamp = action.payload;
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
    },
    setArchived: (state, action): void => {
      const { id, archived } = action.payload;
      if (!id) return;
      // update local cache (avoids round trip)
      state.archivedCache[id] = !!archived;
    }
  }
});

export const loginSlice = createSlice({
  name: "login",
  initialState: {
    canLogin: true,
    loginForm: {
      email: "",
      pass: "",
      rememberme: false
    },
    loginState: LOGIN_AUTH
  },
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
  initialState: {
    wildcards: [] as WildcardsChange[],
    filteredSet: "",
    usersActive: 0
  },
  reducers: {
    setHomeData: (state, action): any => action.payload
  }
});

export const collectionSlice = createSlice({
  name: "collection",
  initialState: {
    countMode: "All cards",
    rareDraftFactor: 3,
    mythicDraftFactor: 0.14,
    boosterWinFactor: 1.2,
    futureBoosters: 0
  },
  reducers: {
    setCountMode: (state, action): void => {
      state.countMode = action.payload;
    },
    setRareDraftFactor: (state, action): void => {
      state.rareDraftFactor = action.payload;
    },
    setMythicDraftFactor: (state, action): void => {
      state.mythicDraftFactor = action.payload;
    },
    setBoosterWinFactor: (state, action): void => {
      state.boosterWinFactor = action.payload;
    },
    setFutureBoosters: (state, action): void => {
      state.futureBoosters = action.payload;
    }
  }
});

export interface ExploreQuery {
  filterWCC: string;
  filterWCU: string;
  filterWCR: string;
  filterWCM: string;
  onlyOwned: boolean;
  filterType: string;
  filterEvent: string;
  filterSort: string;
  filterSortDir: -1 | 1;
  filteredMana: number[];
  filteredRanks: string[];
  filterSkip: number;
}

export const exploreSlice = createSlice({
  name: "explore",
  initialState: {
    activeEvents: [] as string[],
    data: {
      results_type: "Ranked Constructed",
      skip: 0,
      results_number: 0,
      result: []
    },
    filters: {
      filterEvent: "Ladder",
      filterType: "Ranked Constructed",
      filterSort: "By Winrate",
      filterSortDir: -1,
      filterSkip: 0,
      filterWCC: "",
      filterWCU: "",
      filterWCR: "",
      filterWCM: "",
      filteredMana: [],
      filteredRanks: [],
      onlyOwned: false
    } as ExploreQuery
  },
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

const rootReducer = combineReducers({
  settings: settingsSlice.reducer,
  renderer: rendererSlice.reducer,
  hover: hoverSlice.reducer,
  login: loginSlice.reducer,
  homeData: homeSlice.reducer,
  collection: collectionSlice.reducer,
  explore: exploreSlice.reducer
});
export default rootReducer;
export type AppState = ReturnType<typeof rootReducer>;
