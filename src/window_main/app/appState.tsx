import { LOGIN_AUTH } from "./reducers";
import { WildcardsChange } from "../HomeTab";

export interface AppState {
  topArtist: string;
  backgroundImage: string;
  offline: boolean;
  loading: boolean;
  loginState: number;
  canLogin: boolean;
  topNav: number;
  subNav: {
    type: number;
    id: string;
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
  };
}

export const defaultState: AppState = {
  topArtist: "Bedevil by Seb Seb McKinnon",
  backgroundImage: "default",
  offline: false,
  loading: false,
  loginState: LOGIN_AUTH,
  canLogin: true,
  topNav: 0,
  subNav: {
    type: -1,
    id: ""
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
    time: 0
  }
};
