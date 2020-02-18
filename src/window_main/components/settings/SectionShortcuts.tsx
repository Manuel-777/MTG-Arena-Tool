/* eslint-disable @typescript-eslint/camelcase */
import React, { KeyboardEvent } from "react";
import { remote } from "electron";
import { ipcSend, openDialog, closeDialog } from "../../renderer-util";
import pd from "../../../shared/player-data";
import { SHORTCUT_NAMES } from "../../../shared/constants";
import Checkbox from "../Checkbox";
import Button from "../Button";
import { createDiv, queryElements as $$ } from "../../../shared/dom-fns";

function setKeyboardShortcuts(checked: boolean): void {
  ipcSend("save_user_settings", {
    enable_keyboard_shortcuts: checked,
    skipRefesh: true
  });
}

function openKeyCombinationDialog(name: string): void {
  const cont = createDiv(["dialog_content"]);
  cont.style.width = "320px";
  cont.style.height = "120px";

  remote.globalShortcut.unregisterAll();

  const desc = createDiv(["keycomb_desc"], "Press any key");
  const okButton = createDiv(["button_simple"], "Ok");

  function reportKeyEvent(zEvent: KeyboardEvent): void {
    const keyDesc = $$(".keycomb_desc")[0];
    const keys = [];

    if (zEvent.ctrlKey) keys.push("Control");
    if (zEvent.shiftKey) keys.push("Shift");
    if (zEvent.altKey) keys.push("Alt");
    if (zEvent.metaKey) keys.push("Meta");

    if (!["Control", "Shift", "Alt", "Meta"].includes(zEvent.key))
      keys.push(zEvent.key);

    const reportStr = keys.join("+");
    keyDesc.innerHTML = reportStr;

    zEvent.stopPropagation();
    zEvent.preventDefault();
  }

  okButton.addEventListener("click", function() {
    pd.settings[name] = $$(".keycomb_desc")[0].innerHTML;

    ipcSend("save_user_settings", {
      ...pd.settings
    });

    document.removeEventListener("keydown", reportKeyEvent as any);
    closeDialog();
  });

  document.addEventListener("keydown", reportKeyEvent as any);
  cont.appendChild(desc);
  cont.appendChild(okButton);
  openDialog(cont, () => {
    document.removeEventListener("keydown", reportKeyEvent as any);
  });
}

function ShortcutsRow({
  code,
  index
}: {
  code: string;
  index: number;
}): JSX.Element {
  const ld = index % 2 ? "line_dark" : "line_light";
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
        {pd.settings[code]}
      </div>
      <div
        className={ld + " shortcuts_line"}
        style={{ gridArea: `${index + 2} / 3 / auto / 4` }}
      >
        <Button
          text="Edit"
          className={"button_simple button_edit"}
          onClick={(): void => {
            openKeyCombinationDialog(code);
          }}
        />
      </div>
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
