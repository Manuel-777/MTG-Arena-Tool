/* eslint-disable @typescript-eslint/camelcase */
import React, { useState, useCallback } from "react";
import { remote } from "electron";
import { ipcSend } from "../../renderer-util";
import pd from "../../../shared/PlayerData";
import { SHORTCUT_NAMES } from "../../../shared/constants";
import Checkbox from "../Checkbox";
import Button from "../Button";
import EditKey from "../popups/EditKey";

function setKeyboardShortcuts(checked: boolean): void {
  ipcSend("save_user_settings", {
    enable_keyboard_shortcuts: checked,
    skipRefesh: true
  });
}

function ShortcutsRow({
  code,
  index
}: {
  code: string;
  index: number;
}): JSX.Element {
  const [openDialog, setOpenDialog] = useState(false);
  const ld = index % 2 ? "line_dark" : "line_light";

  function openKeyCombinationDialog(): void {
    remote.globalShortcut.unregisterAll();
    setOpenDialog(true);
  }

  const closeKeyCombDialog = useCallback(
    (key: string): void => {
      setOpenDialog(false);
      ((pd.settings as unknown) as Record<string, string>)[code] = key;
      ipcSend("save_user_settings", {
        ...pd.settings
      });
    },
    [code]
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
        {((pd.settings as unknown) as Record<string, string>)[code]}
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
  return (
    <>
      <Checkbox
        text="Enable keyboard shortcuts"
        value={pd.settings.enable_keyboard_shortcuts}
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
