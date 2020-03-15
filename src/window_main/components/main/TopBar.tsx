import React from "react";
import { ipcSend } from "../../rendererUtil";
import { forceOpenSettings } from "../../tabControl";

interface TopBarProps {
  artist: string;
  offline: boolean;
}

function clickMinimize(): void {
  ipcSend("renderer_window_minimize", 1);
}

function clickSettings(): void {
  forceOpenSettings();
}

function clickClose(): void {
  ipcSend("renderer_window_close", 1);
}

export default function TopBar(props: TopBarProps): JSX.Element {
  return (
    <div className="top">
      <div className="flex_item">
        <div className="top_logo"></div>
        <div className="top_artist">{props.artist}</div>
      </div>
      <div className="flex_item">
        {props.offline ? (
          <div className="unlink" title="You are not logged-in."></div>
        ) : (
          <></>
        )}
        <div onClick={clickMinimize} className="button minimize"></div>
        <div onClick={clickSettings} className="button settings"></div>
        <div onClick={clickClose} className="button close"></div>
      </div>
    </div>
  );
}
