/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Toggle from "../misc/Toggle";
import { ipcSend } from "../../ipcSend";
import Button from "../misc/Button";
import { useSelector } from "react-redux";
import store, { AppState } from "../../../shared/redux/stores/rendererStore";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import { constants } from "mtgatool-shared";
const { IPC_ALL, IPC_RENDERER } = constants;

function clickAnonExplore(value: boolean): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { anon_explore: value } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function clickSendData(value: boolean): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { send_data: value } },
    IPC_ALL ^ IPC_RENDERER
  );
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
