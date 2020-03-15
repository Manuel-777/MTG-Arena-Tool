/* eslint-disable @typescript-eslint/camelcase */
import { remote, shell } from "electron";
import React from "react";
import { SETTINGS_PRIVACY } from "../../../shared/constants";
import { ipcSend } from "../../rendererUtil";
import { forceOpenSettings } from "../../tabControl";

export default function OfflineSplash(): JSX.Element {
  return (
    <div className="message_center_offline" style={{ display: "flex" }}>
      <div className="message_unlink"></div>
      <div className="message_big red">Oops, you are offline!</div>
      <div className="message_sub_16 white">To access online features:</div>
      <div className="message_sub_16 white">
        If you are logged in, you may need to{" "}
        <a
          className="privacy_link"
          onClick={(): void => forceOpenSettings(SETTINGS_PRIVACY)}
        >
          enable online sharing
        </a>{" "}
        and restart.
      </div>
      <div className="message_sub_16 white">
        If you are in offline mode, you can{" "}
        <a
          className="launch_login_link"
          onClick={(): void => {
            const clearAppSettings = {
              remember_me: false,
              auto_login: false,
              launch_to_tray: false
            };
            ipcSend("save_app_settings", clearAppSettings);
            remote.app.relaunch();
            remote.app.exit(0);
          }}
        >
          login to your account
        </a>
        .
      </div>
      <div className="message_sub_16 white">
        If you need an account, you can{" "}
        <a
          className="signup_link"
          onClick={(): Promise<void> =>
            shell.openExternal("https://mtgatool.com/signup/")
          }
        >
          sign up here
        </a>
        .
      </div>
    </div>
  );
}
