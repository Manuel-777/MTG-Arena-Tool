/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Toggle from "../misc/Toggle";
import { ipcSend } from "../../rendererUtil";
import Button from "../misc/Button";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared/redux/reducers";

function clickAnonExplore(value: boolean): void {
  ipcSend("save_user_settings", { anon_explore: value });
}

function clickSendData(value: boolean): void {
  ipcSend("save_user_settings", { send_data: value });
}

function eraseData(): void {
  if (
    confirm(
      "This will erase all of your decks and events shared online, are you sure?"
    )
  ) {
    ipcSend("delete_data", true);
  } else {
    return;
  }
}

export default function SectionPrivacy(): JSX.Element {
  const settings = useSelector((state: AppState) => state.settings);
  return (
    <>
      <Toggle
        text={
          <>
            Anonymous sharing <i>(makes your username anonymous on Explore)</i>
          </>
        }
        value={settings.anon_explore}
        callback={clickAnonExplore}
      />
      <Toggle
        text={
          <>
            Online sharing
            <i>
              (when disabled, uses offline mode and only contacts our servers to
              fetch Arena metadata)
            </i>
          </>
        }
        value={settings.send_data}
        callback={clickSendData}
      />
      <Button text="Erase my shared data" onClick={eraseData} />
    </>
  );
}
