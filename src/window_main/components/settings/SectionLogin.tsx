/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { remote } from "electron";
import Button from "../misc/Button";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import store, { AppState } from "../../../shared-redux/stores/rendererStore";
import { IPC_BACKGROUND } from "../../../shared/constants";
import { useSelector } from "react-redux";

function click(): void {
  const clearAppSettings = {
    rememberMe: false,
    autoLogin: false,
    launchToTray: false
  };
  reduxAction(
    store.dispatch,
    "SET_APP_SETTINGS",
    clearAppSettings,
    IPC_BACKGROUND
  );
  setTimeout(() => {
    remote.app.relaunch();
    remote.app.exit(0);
  }, 1000);
}

export default function SectionLogin(): JSX.Element {
  const offline = useSelector((state: AppState) => state.renderer.offline);
  return (
    <div className="about">
      <Button text={offline ? "Login" : "Logout"} onClick={click} />
    </div>
  );
}
