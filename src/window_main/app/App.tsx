import { remote } from "electron";
import React, { useCallback } from "react";
import ReactDOM from "react-dom";

import { createStore } from "redux";
import { Provider, useDispatch, useSelector } from "react-redux";
import appReducer, {
  LOGIN_WAITING,
  dispatchAction,
  SET_NO_LOG,
  SET_SHARE_DIALOG_OPEN
} from "./reducers";

const store = createStore(
  appReducer,
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
    (window as any).__REDUX_DEVTOOLS_EXTENSION__()
);

import { TopNav } from "../components/main/topNav";
import { forceOpenAbout, getOpenNav, getOpenSub } from "../tabControl";
import BackgroundImage from "../components/main/BackgroundImage";
import TopBar from "../components/main/TopBar";
import LoadingBar from "../components/main/LoadingBar";
import Auth from "../Auth";
import { LOGIN_OK } from "./reducers";
import ipcListeners from "./ipcListeners";
import Popup from "../components/main/Popup";
import CardHover from "../components/main/CardHover";
import { AppState } from "./appState";
import OutputLogInput from "../components/popups/OutputLogInput";
import { ipcSend } from "../renderer-util";
import Share from "../components/popups/Share";

function App(): JSX.Element {
  const loginState = useSelector((state: AppState) => state.loginState);
  const topArtist = useSelector((state: AppState) => state.topArtist);
  const offline = useSelector((state: AppState) => state.offline);
  const loading = useSelector((state: AppState) => state.loading);
  const topNav = useSelector((state: AppState) => state.topNav);
  const subNavType = useSelector((state: AppState) => state.subNav.type);
  const subNavId = useSelector((state: AppState) => state.subNav.id);
  const subNavData = useSelector((state: AppState) => state.subNav.data);
  const authForm = useSelector((state: AppState) => state.loginForm);
  const noLog = useSelector((state: AppState) => state.noLog);
  const share = useSelector((state: AppState) => state.shareDialog);
  /*
    Set up IPC listeners.
    This should only happen once when the app starts, so no
    action should recreate the App component.
    IPC Listeners should be inside a React component below the
    context provider hierarchy, so they can dispatch actions.
  */
  const dispatch = useDispatch();
  React.useEffect(() => {
    ipcListeners(dispatch);
  }, [dispatch]);

  React.useEffect(() => {
    console.log("loginState: " + loginState);
  }, [loginState]);

  const closeNoLog = React.useCallback(
    (log: string) => {
      setTimeout(() => {
        ipcSend("set_log", log);
        dispatchAction(dispatch, SET_NO_LOG, false);
      }, 350);
    },
    [dispatch]
  );

  const closeShare = React.useCallback(() => {
    setTimeout(() => {
      dispatchAction(dispatch, SET_SHARE_DIALOG_OPEN, false);
    }, 350);
  }, [dispatch]);

  return (
    <>
      <BackgroundImage />
      <div className="outer_wrapper">
        <TopBar artist={topArtist} offline={offline} />
        <Popup />
        {noLog ? <OutputLogInput closeCallback={closeNoLog} /> : <></>}
        {share.open ? <Share closeCallback={closeShare} /> : <></>}
        <CardHover />
        {loginState == LOGIN_OK ? <TopNav /> : <></>}
        {loading || loginState == LOGIN_WAITING ? (
          <LoadingBar style={loginState == LOGIN_OK ? { top: "99px" } : {}} />
        ) : (
          <></>
        )}
        {loginState == LOGIN_OK ? (
          <div className="wrapper">
            <div className="overflow_ux_main">
              <div className="moving_ux">
                {getOpenNav(topNav, offline)}
                <div className="ux_item">
                  {getOpenSub(subNavType, subNavId, subNavData)}
                </div>
                <div className="ux_item"></div>
              </div>
            </div>
          </div>
        ) : (
          <Auth authForm={authForm} />
        )}
      </div>
      <div className={"version_number"} onClick={forceOpenAbout}>
        v{remote.app.getVersion()}
      </div>
    </>
  );
}

export default function RenderApp(): void {
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("appcontainer")
  );
}
