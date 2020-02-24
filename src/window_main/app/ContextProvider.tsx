import React from "react";
import ContextReducer, { LOGIN_AUTH } from "./ContextReducer";
import { WildcardsChange } from "../HomeTab";

const StateContext = React.createContext(null);
const DispatchContext = React.createContext(null);

export interface AppState {
  hoverGrpId: number;
  hoverOpacity: number;
  topArtist: string;
  backgroundImage: string;
  offline: boolean;
  loading: boolean;
  topNav: number;
  login: number;
  canLogin: boolean;
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
  popup: {
    text: string;
    time: number;
  };
}

const defaultState: AppState = {
  hoverGrpId: 1,
  hoverOpacity: 0,
  topArtist: "Bedevil by Seb Seb McKinnon",
  backgroundImage: "default",
  offline: false,
  loading: false,
  topNav: 0,
  login: LOGIN_AUTH,
  canLogin: true,
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
  popup: {
    text: "",
    time: 0
  }
};

interface WebProviderProps {
  children: JSX.Element;
}

function ContextProvider({ children }: WebProviderProps): JSX.Element {
  const [state, dispatch] = React.useReducer(ContextReducer, defaultState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

const useContext = (): AppState => {
  const context = React.useContext(StateContext);
  if (!context) {
    throw new Error(
      "useContext must be used in a component within a ContextProvider."
    );
  }
  return context;
};

function useDispatch(): unknown {
  const context = React.useContext(DispatchContext);
  if (context === undefined) {
    throw new Error("useWebDispatch must be used within a WebProvider");
  }
  return context;
}

export { ContextProvider, useContext, useDispatch };
