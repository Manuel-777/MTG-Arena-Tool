import React from "react";

const StateContext = React.createContext(null);
const DispatchContext = React.createContext(null);

function contextReducer(state: any, action: any): any {
  switch (action.type) {
    case "setBackgroundImage": {
      return { ...state, BackgroundImage: action.BackgroundImage };
    }
    case "setTopArtist": {
      return { ...state, TopArtist: action.TopArtist };
    }
    case "setHoverCard": {
      return { ...state, HoverGrpId: action.HoverGrpId };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

interface AppContext {
  HoverGrpId: number;
  TopArtist: string;
  BackgroundImage: string;
}

const defaultState: AppContext = {
  HoverGrpId: 1,
  TopArtist: "Bedevil by Seb Seb McKinnon",
  BackgroundImage: "default"
};

interface WebProviderProps {
  children: JSX.Element;
}

function ContextProvider({ children }: WebProviderProps): JSX.Element {
  const [state, dispatch] = React.useReducer(contextReducer, defaultState);
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
      "useWebContext must be used in a component within a WebProvider."
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
