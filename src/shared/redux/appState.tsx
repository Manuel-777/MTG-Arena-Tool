import { LOGIN_AUTH } from "./reducers";
import { WildcardsChange } from "../../window_main/tabs/HomeTab";
import { MergedSettings } from "../../types/settings";
import { playerDataDefault, defaultCfg } from "../PlayerData";

export interface AppState {
  renderer: {
    backgroundColor: string;
    backgroundGrpId: number;
    backgroundImage: string;
    loading: boolean;
    noLog: boolean;
    offline: boolean;
    patreon: {
      patreon: boolean;
      patreonTier: number;
    };
    popup: {
      text: string;
      time: number;
      duration: number;
    };
    shareDialog: {
      open: boolean;
      url: string;
      type: string;
      data: any;
      id: string;
    };
    subNav: {
      type: number;
      id: string;
      data: any;
    };
    topArtist: string;
    topNav: number;
    updateState: string;
  };
  settings: MergedSettings;
  login: {
    canLogin: boolean;
    loginForm: {
      email: string;
      pass: string;
      rememberme: boolean;
    };
    loginState: number;
  };
  homeData: {
    wildcards: WildcardsChange[];
    filteredSet: string;
    usersActive: number;
  };
  hover: {
    grpId: number;
    opacity: number;
    size: number;
  };
  explore: {
    activeEvents: string[];
    data: {
      results_type: string;
      skip: number;
      results_number: number;
      result: any[];
    };
    filters: {
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
    };
  };
}

export const defaultState: AppState = {
  renderer: {
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
  settings: {
    ...playerDataDefault.settings,
    ...defaultCfg.settings
  },
  login: {
    canLogin: true,
    loginForm: {
      email: "",
      pass: "",
      rememberme: false
    },
    loginState: LOGIN_AUTH
  },
  homeData: {
    wildcards: [],
    filteredSet: "",
    usersActive: 0
  },
  hover: {
    grpId: 0,
    opacity: 0,
    size: 0
  },
  explore: {
    activeEvents: [],
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
    }
  }
};
