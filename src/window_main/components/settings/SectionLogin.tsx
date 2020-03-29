/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { remote } from "electron";
import pd from "../../../shared/PlayerData";
import Button from "../misc/Button";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import store from "../../../shared-redux/stores/rendererStore";
import { IPC_BACKGROUND } from "../../../shared/constants";

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
  return (
    <div className="about">
      <Button text={pd.offline ? "Login" : "Logout"} onClick={click} />
    </div>
  );
}
