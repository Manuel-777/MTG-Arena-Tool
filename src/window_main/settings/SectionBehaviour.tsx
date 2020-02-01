/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Checkbox from "../components/Checkbox";
import pd from "../../shared/player-data";
import { ipcSend } from "../renderer-util";

function clickBetaChannel(value: boolean): void {
  ipcSend("save_app_settings", {
    beta_channel: value
  });
}

function clickAutoLogin(value: boolean): void {
  ipcSend("save_app_settings", {
    auto_login: value
  });
}

function clickLaunchToTray(value: boolean): void {
  ipcSend("save_app_settings", {
    launch_to_tray: value
  });
}

function clickStartup(value: boolean): void {
  ipcSend("save_app_settings", {
    startup: value
  });
}

function clickCloseOnMatch(value: boolean): void {
  ipcSend("save_app_settings", {
    close_on_match: value
  });
}

function clickCloseToTray(value: boolean): void {
  ipcSend("save_app_settings", {
    close_to_tray: value
  });
}

export default function SectionBehaviour(): JSX.Element {
  return (
    <>
      <Checkbox
        text={"Beta updates channel"}
        value={pd.settings.beta_channel}
        callback={clickBetaChannel}
      />
      <Checkbox
        text={"Login/offline mode automatically"}
        value={pd.settings.auto_login}
        callback={clickAutoLogin}
      />
      <Checkbox
        text={"Launch to tray"}
        value={pd.settings.launch_to_tray}
        callback={clickLaunchToTray}
      />
      <Checkbox
        text={"Launch on startup"}
        value={pd.settings.startup}
        callback={clickStartup}
      />
      <Checkbox
        text={"Close main window on match found"}
        value={pd.settings.close_on_match}
        callback={clickCloseOnMatch}
      />
      <Checkbox
        text={"Close to tray"}
        value={pd.settings.close_to_tray}
        callback={clickCloseToTray}
      />
    </>
  );
}
