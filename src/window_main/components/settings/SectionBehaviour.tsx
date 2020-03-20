/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Toggle from "../misc/Toggle";
import Input from "../misc/Input";
import { ipcSend } from "../../rendererUtil";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared/redux/reducers";

function clickBetaChannel(value: boolean): void {
  ipcSend("save_app_settings_norefresh", {
    beta_channel: value
  });
}

function clickAutoLogin(value: boolean): void {
  ipcSend("save_app_settings_norefresh", {
    auto_login: value
  });
}

function clickLaunchToTray(value: boolean): void {
  ipcSend("save_app_settings_norefresh", {
    launch_to_tray: value
  });
}

function clickStartup(value: boolean): void {
  ipcSend("save_user_settings", { startup: value, skipRefresh: true });
}

function clickCloseOnMatch(value: boolean): void {
  ipcSend("save_user_settings", { close_on_match: value });
}

function clickCloseToTray(value: boolean): void {
  ipcSend("save_app_settings_norefresh", {
    close_to_tray: value
  });
}

function changeExportFormat(value: string): void {
  ipcSend("save_user_settings", { export_format: value, skipRefresh: true });
}

export default function SectionBehaviour(): JSX.Element {
  const settings = useSelector((state: AppState) => state.settings);
  return (
    <>
      <Toggle
        text={"Beta updates channel"}
        value={settings.beta_channel}
        callback={clickBetaChannel}
      />
      <Toggle
        text={"Login/offline mode automatically"}
        value={settings.auto_login}
        callback={clickAutoLogin}
      />
      <Toggle
        text={"Launch to tray"}
        value={settings.launch_to_tray}
        callback={clickLaunchToTray}
      />
      <Toggle
        text={"Launch on startup"}
        value={settings.startup}
        callback={clickStartup}
      />
      <Toggle
        text={"Close main window on match found"}
        value={settings.close_on_match}
        callback={clickCloseOnMatch}
      />
      <Toggle
        text={"Close to tray"}
        value={settings.close_to_tray}
        callback={clickCloseToTray}
      />
      <Input
        label="Export Format:"
        value={settings.export_format}
        placeholder="$Name,$Count,$SetName,$SetCode,$Rarity,$Type"
        callback={changeExportFormat}
      />
      <div className="settings_note">
        <i>
          Possible variables: $Name, $Count, $SetName, $SetCode, $Collector,
          $Rarity, $Type, $Cmc
        </i>
      </div>
    </>
  );
}
