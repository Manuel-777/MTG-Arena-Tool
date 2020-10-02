import { remote } from "electron";
import anime from "animejs";
import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import ErrorBoundary from "./ErrorBoundary";
import { TopNav } from "../components/main/topNav";
import {
  forceOpenAbout,
  getOpenNav,
  getOpenSub,
  forceOpenSettings,
} from "../tabControl";
import TopBar from "../components/main/TopBar";
import LoadingBar from "../components/main/LoadingBar";
import Auth from "../components/main/Auth";
import ipcListeners from "./ipcListeners";
import Popup from "../components/main/Popup";
import CardHover from "../components/main/CardHover";
import OutputLogInput from "../components/popups/OutputLogInput";
import { ipcSend } from "../ipcSend";
import Share from "../components/popups/Share";
import store, { AppState } from "../../shared/redux/stores/rendererStore";
import { reduxAction } from "../../shared/redux/sharedRedux";
import initializeRendererReduxIPC from "../../shared/redux/initializeRendererReduxIPC";

import settingsIcon from "../../assets/images/cog.png";
import css from "./app.css";
import AuthSettings from "../components/auth-settings";
import DetailedLogs from "../components/popups/DetailedLogs";
import IconButton from "../components/misc/IconButton";
import { constants } from "mtgatool-shared";
const { LOGIN_WAITING, LOGIN_OK, IPC_NONE, EASING_DEFAULT } = constants;

initializeRendererReduxIPC(store);

function App(): JSX.Element {
  const loginState = useSelector((state: AppState) => state.login.loginState);
  const openAuthSettings = useSelector(
    (state: AppState) => state.renderer.authSettings
  );
  const topArtist = useSelector((state: AppState) => state.renderer.topArtist);
  const offline = useSelector((state: AppState) => state.renderer.offline);
  const loading = useSelector((state: AppState) => state.renderer.loading);
  const navIndex = useSelector((state: AppState) => state.renderer.navIndex);
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
  const detailedLogsDialog = useSelector(
    (state: AppState) => state.renderer.detailedLogsDialog
  );
  const movingUxRef = useRef<HTMLDivElement | null>(null);
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

  const closeNoLog = React.useCallback(
    (log: string) => {
      setTimeout(() => {
        reduxAction(dispatch, { type: "SET_NO_LOG", arg: false }, IPC_NONE);
        ipcSend("set_log", log);
      }, 350);
    },
    [dispatch]
  );

  const closeDetailedLogs = React.useCallback(() => {
    setTimeout(() => {
      reduxAction(
        dispatch,
        { type: "SET_DETAILED_LOGS_DIALOG", arg: false },
        IPC_NONE
      );
    }, 350);
  }, [dispatch]);

  const closeShare = React.useCallback(() => {
    setTimeout(() => {
      reduxAction(
        dispatch,
        { type: "SET_SHARE_DIALOG_OPEN", arg: false },
        IPC_NONE
      );
    }, 350);
  }, [dispatch]);

  const closeSettings = React.useCallback(() => {
    setTimeout(() => {
      reduxAction(
        dispatch,
        { type: "SET_AUTH_SETTINGS", arg: false },
        IPC_NONE
      );
    }, 350);
  }, [dispatch]);

  useEffect(() => {
    setTimeout(() => {
      anime({
        targets: movingUxRef.current, //css.movingUx,
        left: navIndex * -100 + "%",
        easing: EASING_DEFAULT,
        duration: 350,
      });
    }, 10);
  }, [navIndex, movingUxRef]);

  return (
    <>
      {process.platform !== "linux" && (
        <TopBar artist={topArtist} offline={offline} />
      )}
      <div
        className={
          process.platform == "linux"
            ? loginState == LOGIN_OK
              ? css.appWrapperNoFrame
              : css.appWrapperBackNoFrame
            : loginState == LOGIN_OK
            ? css.appWrapper
            : css.appWrapperBack
        }
      >
        {noLog ? <OutputLogInput closeCallback={closeNoLog} /> : <></>}
        {share.open ? <Share closeCallback={closeShare} /> : <></>}
        {detailedLogsDialog ? (
          <DetailedLogs closeCallback={closeDetailedLogs} />
        ) : (
          <></>
        )}
        <CardHover />
        {loginState == LOGIN_OK ? <TopNav /> : <></>}
        {loading || loginState == LOGIN_WAITING ? (
          <LoadingBar
            style={
              loginState == LOGIN_OK || process.platform == "linux"
                ? { top: process.platform !== "linux" ? "72px" : "0px" }
                : {}
            }
          />
        ) : (
          <></>
        )}
        <ErrorBoundary>
          {loginState == LOGIN_OK ? (
            <div className={css.wrapper}>
              <div className={css.overflowUxMain}>
                <div className={css.movingUx} ref={movingUxRef}>
                  {getOpenNav(topNav, offline)}
                  <div className={css.uxItem}>
                    {getOpenSub(subNavType, subNavId, subNavData)}
                  </div>
                  <div className={css.uxItem}></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Auth authForm={authForm} />
              {openAuthSettings && (
                <AuthSettings closeCallback={closeSettings} />
              )}
            </>
          )}
        </ErrorBoundary>
      </div>
      {loginState == LOGIN_OK ? (
        <></>
      ) : (
        <div className={css.appSettings}>
          <IconButton
            style={{ margin: "auto" }}
            icon={settingsIcon}
            onClick={(): void => forceOpenSettings()}
          />
        </div>
      )}
      <Popup />
      <div className={css.versionNumber} onClick={forceOpenAbout}>
        v{remote.app.getVersion()}
      </div>
    </>
  );
}

export default App;
