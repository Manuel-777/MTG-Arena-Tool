import { remote } from "electron";
import React from "react";
import ReactDOM from "react-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import { LOGIN_WAITING, LOGIN_OK, IPC_NONE } from "../../shared/constants";
import { TopNav } from "../components/main/topNav";
import { forceOpenAbout, getOpenNav, getOpenSub } from "../tabControl";
import BackgroundImage from "../components/main/BackgroundImage";
import TopBar from "../components/main/TopBar";
import LoadingBar from "../components/main/LoadingBar";
import Auth from "../components/main/Auth";
import ipcListeners from "./ipcListeners";
import Popup from "../components/main/Popup";
import CardHover from "../components/main/CardHover";
import OutputLogInput from "../components/popups/OutputLogInput";
import { ipcSend } from "../rendererUtil";
import Share from "../components/popups/Share";
import store, { AppState } from "../../shared-redux/stores/rendererStore";
import {
  reduxAction,
  initializeRendererReduxIPC
} from "../../shared-redux/sharedRedux";

initializeRendererReduxIPC(store);

function App(): JSX.Element {
  const loginState = useSelector((state: AppState) => state.login.loginState);
  const topArtist = useSelector((state: AppState) => state.renderer.topArtist);
  const offline = useSelector((state: AppState) => state.renderer.offline);
  const loading = useSelector((state: AppState) => state.renderer.loading);
  const topNav = useSelector((state: AppState) => state.renderer.topNav);
  const subNavType = useSelector(
    (state: AppState) => state.renderer.subNav.type
  );
  const subNavId = useSelector((state: AppState) => state.renderer.subNav.id);
  const subNavData = useSelector(
    (state: AppState) => state.renderer.subNav.data
  );
  const authForm = useSelector((state: AppState) => state.login.loginForm);
  const noLog = useSelector((state: AppState) => state.renderer.noLog);
  const share = useSelector((state: AppState) => state.renderer.shareDialog);
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
        reduxAction(dispatch, "SET_NO_LOG", false, IPC_NONE);
        ipcSend("set_log", log);
      }, 350);
    },
    [dispatch]
  );

  const closeShare = React.useCallback(() => {
    setTimeout(() => {
      reduxAction(dispatch, "SET_SHARE_DIALOG_OPEN", false, IPC_NONE);
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
