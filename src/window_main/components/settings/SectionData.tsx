/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { remote } from "electron";
const { dialog } = remote;
import Checkbox from "../Checkbox";
import Input from "../Input";
import pd from "../../../shared/player-data";
import { ipcSend } from "../../renderer-util";
import { ReactSelect } from "../../../shared/ReactSelect";

const LANGUAGES = [
  "en",
  "es",
  "br",
  "de",
  "fr",
  "it",
  "js",
  "ru",
  "ko-kr",
  "zh-cn"
];

function getLanguageName(lang: string): string {
  switch (lang) {
    case "en":
      return "English";
    case "es":
      return "Spanish";
    case "br":
      return "Portuguese";
    case "de":
      return "Deutsche";
    case "fr":
      return "French";
    case "it":
      return "Italian";
    case "js":
      return "Japanese";
    case "ru":
      return "Russian";
    case "ko-kr":
      return "Korean";
    case "zh-cn":
      return "Chinese (simplified)";
    default:
      return "-";
  }
}

function setCardsLanguage(filter: string): void {
  ipcSend("save_app_settings", { metadata_lang: filter.toLowerCase() });
}

function arenaLogClick(logUriInput: any): void {
  // This is hackish, what we want to do is obtain the ref to the input
  // but the input is a React function component, so we cant do a ref to it.
  // So we get the parent ref and then DOM to it.
  logUriInput = logUriInput.getElementsByTagName("INPUT")[0];
  if (document.activeElement === logUriInput) return;
  const paths = dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: "Arena Log Location",
    defaultPath: pd.settings.logUri,
    buttonLabel: "Select",
    filters: [
      { name: "Text", extensions: ["txt", "text"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  });
  if (paths && paths.length && paths[0]) {
    logUriInput.focus();
    logUriInput.value = paths[0];
    logUriInput.blur();
  }
}

function arenaLogCallback(value: string): void {
  if (value === pd.settings.logUri) return;
  if (
    confirm("Changing the Arena log location requires a restart, are you sure?")
  ) {
    ipcSend("set_log", value);
  } else {
    value = pd.settings.logUri;
  }
}

export default function SectionData(): JSX.Element {
  const arenaLogRef = React.useRef(null);

  const arenaLogClickHandle = (): void => {
    if (arenaLogRef.current) {
      arenaLogClick(arenaLogRef.current);
    }
  };

  return (
    <>
      <label className="but_container_label">
        Arena Data
        <ReactSelect
          style={{ width: "180px", marginLeft: "32px" }}
          options={LANGUAGES}
          current={pd.settings.metadata_lang}
          optionFormatter={getLanguageName}
          callback={setCardsLanguage}
        />
      </label>
      <div className="settings_note">
        <i>
          <p>
            Changes the cards data language,
            <b>not the interface</b>. Requires restarting tool to take effect.
          </p>
          <p>Card names when exporting will also be changed.</p>
        </i>
      </div>
      <label
        ref={arenaLogRef}
        className="but_container_label"
        onClick={arenaLogClickHandle}
      >
        Arena Log:
        <div className="open_button" />
        <Input
          contStyle={{ margin: "3px", width: "70%" }}
          callbackEnter={arenaLogCallback}
          placeholder={pd.settings.logUri}
          value={pd.settings.logUri}
        />
      </label>
    </>
  );
}
