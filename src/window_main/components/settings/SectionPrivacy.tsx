/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Checkbox from "../Checkbox";
import pd from "../../../shared/PlayerData";
import { ipcSend } from "../../renderer-util";
import Button from "../Button";

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
  return (
    <>
      <Checkbox
        text={
          <>
            Anonymous sharing <i>(makes your username anonymous on Explore)</i>
          </>
        }
        value={pd.settings.anon_explore}
        callback={clickAnonExplore}
      />
      <Checkbox
        text={
          <>
            Online sharing
            <i>
              (when disabled, uses offline mode and only contacts our servers to
              fetch Arena metadata)
            </i>
          </>
        }
        value={pd.settings.send_data}
        callback={clickSendData}
      />
      <Button text="Erase my shared data" onClick={eraseData} />
    </>
  );
}
