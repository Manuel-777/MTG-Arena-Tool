/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { remote } from "electron";
import pd from "../../../shared/PlayerData";
import { ipcSend } from "../../rendererUtil";
import Button from "../misc/Button";

function click(): void {
  const clearAppSettings = {
    remember_me: false,
    auto_login: false,
    launch_to_tray: false
  };
  ipcSend("save_app_settings", clearAppSettings);
  remote.app.relaunch();
  remote.app.exit(0);
}

export default function SectionLogin(): JSX.Element {
  return (
    <div className="about">
      <Button text={pd.offline ? "Login" : "Logout"} onClick={click} />
    </div>
  );
}
