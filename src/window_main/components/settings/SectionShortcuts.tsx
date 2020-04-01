/* eslint-disable @typescript-eslint/camelcase */
import React, { useState, useCallback } from "react";
import { remote } from "electron";
import {
  SHORTCUT_NAMES,
  IPC_ALL,
  IPC_RENDERER
} from "../../../shared/constants";
import Toggle from "../misc/Toggle";
import Button from "../misc/Button";
import EditKey from "../popups/EditKey";
import { useSelector } from "react-redux";
import store, { AppState } from "../../../shared-redux/stores/rendererStore";
import { reduxAction } from "../../../shared-redux/sharedRedux";

function setKeyboardShortcuts(checked: boolean): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { enable_keyboard_shortcuts: checked },
    IPC_ALL ^ IPC_RENDERER
  );
}

function ShortcutsRow({
  code,
  index
}: {
  code: string;
  index: number;
}): JSX.Element {
  const settings = useSelector((state: AppState) => state.settings);
  const [openDialog, setOpenDialog] = useState(false);
  const ld = index % 2 ? "line_dark" : "line_light";

  function openKeyCombinationDialog(): void {
    remote.globalShortcut.unregisterAll();
    setOpenDialog(true);
  }

  const closeKeyCombDialog = useCallback(
    (key: string): void => {
      setOpenDialog(false);
      reduxAction(
        store.dispatch,
        "SET_SETTINGS",
        { ...settings, [code]: key },
        IPC_ALL ^ IPC_RENDERER
      );
    },
    [code, settings]
  );

  return (
    <>
      <div
        className={ld + " shortcuts_line"}
        style={{ gridArea: `${index + 2} / 1 / auto / 2` }}
      >
        {SHORTCUT_NAMES[code]}
      </div>
      <div
        className={ld + " shortcuts_line"}
        style={{ gridArea: `${index + 2} / 2 / auto / 3` }}
      >
        {((settings as unknown) as Record<string, string>)[code]}
      </div>
      <div
        className={ld + " shortcuts_line"}
        style={{ gridArea: `${index + 2} / 3 / auto / 4` }}
      >
        <Button
          text="Edit"
          className={"button_simple button_edit"}
          onClick={openKeyCombinationDialog}
        />
      </div>
      {openDialog ? <EditKey closeCallback={closeKeyCombDialog} /> : <></>}
    </>
  );
}

export default function SectionShortcuts(): JSX.Element {
  const enableKeyboardShortcuts = useSelector(
    (state: AppState) => state.settings.enable_keyboard_shortcuts
  );
  return (
    <>
      <Toggle
        text="Enable keyboard shortcuts"
        value={enableKeyboardShortcuts}
        callback={setKeyboardShortcuts}
      />
      <div className="settings_note" style={{ margin: "24px 16px 16px" }}>
        Click Edit to change a shortcut
      </div>
      <div className="shortcuts_grid">
        <div
          className="line_dark line_bottom_border shortcuts_line"
          style={{ gridArea: "1 / 1 / auto / 3" }}
        >
          Action
        </div>
        <div
          className="line_dark line_bottom_border shortcuts_line"
          style={{ gridArea: "1 / 2 / auto / 4" }}
        >
          Shortcut
        </div>
        {Object.keys(SHORTCUT_NAMES).map((key: string, index: number) => (
          <ShortcutsRow key={key} code={key} index={index} />
        ))}
      </div>
    </>
  );
}
