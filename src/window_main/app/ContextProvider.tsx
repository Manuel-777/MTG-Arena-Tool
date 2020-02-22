import React from "react";
import ContextReducer from "./ContextReducer";

const StateContext = React.createContext(null);
const DispatchContext = React.createContext(null);

export interface AppContext {
  HoverGrpId: number;
  TopArtist: string;
  BackgroundImage: string;
  Offline: boolean;
  Loading: boolean;
  TopNav: number;
}

const defaultState: AppContext = {
  HoverGrpId: 1,
  TopArtist: "Bedevil by Seb Seb McKinnon",
  BackgroundImage: "default",
  Offline: false,
  Loading: false,
  TopNav: 0
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

const useContext = (): AppContext => {
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
