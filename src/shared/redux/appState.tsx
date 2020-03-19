import { LOGIN_AUTH } from "./reducers";
import { WildcardsChange } from "../../window_main/tabs/HomeTab";
import { MergedSettings } from "../../types/settings";
import { playerDataDefault, defaultCfg } from "../PlayerData";

export interface AppState {
  topArtist: string;
  backgroundImage: string;
  backgroundGrpId: number;
  backgroundColor: string;
  offline: boolean;
  loading: boolean;
  loginState: number;
  canLogin: boolean;
  topNav: number;
  updateState: string;
  noLog: boolean;
  settings: MergedSettings;
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
  patreon: {
    patreon: boolean;
    patreonTier: number;
  };
  loginForm: {
    email: string;
    pass: string;
    rememberme: boolean;
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
  popup: {
    text: string;
    time: number;
    duration: number;
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
  topArtist: "Bedevil by Seb McKinnon",
  backgroundImage: "default",
  backgroundGrpId: 0,
  backgroundColor: "rgba(0, 0, 0, 0.25)",
  offline: false,
  loading: false,
  loginState: LOGIN_AUTH,
  canLogin: true,
  topNav: 0,
  updateState: "",
  noLog: false,
  settings: {
    ...playerDataDefault.settings,
    ...defaultCfg.settings
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
  patreon: {
    patreon: false,
    patreonTier: -1
  },
  loginForm: {
    email: "",
    pass: "",
    rememberme: false
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
  popup: {
    text: "",
    time: 0,
    duration: 0
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
