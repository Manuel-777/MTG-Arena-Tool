/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { remote, shell } from "electron";
const { dialog } = remote;
import Checkbox from "../Checkbox";
import Input from "../Input";
import pd from "../../../shared/player-data";
import { ipcSend } from "../../renderer-util";
import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { parse, isValid } from "date-fns";
import Button from "../Button";

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
  ipcSend("save_app_settings_norefresh", {
    metadata_lang: filter.toLowerCase()
  });
}

function firstPassCallback(checked: boolean): void {
  ipcSend("save_user_settings", {
    skip_firstpass: checked,
    skipRefresh: true
  });
}

function arenaLogClick(logUriInput: HTMLInputElement): void {
  // ignore clicks inside actual input field
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

function localeCallback(value: string): void {
  if (value !== pd.settings.log_locale_format) {
    ipcSend("save_app_settings_norefresh", {
      log_locale_format: value
    });
  }
}

function parseLinkOpen(): void {
  shell.openExternal("https://date-fns.org/v2.2.1/docs/parse");
}

function openAppDbLink(): void {
  shell.showItemInFolder(pd.appDbPath);
}

function openPlayerDbLink(): void {
  shell.showItemInFolder(pd.playerDbPath);
}

function backportClick(): void {
  ipcSend("popup", {
    text: "Backporting all player data...",
    time: 0,
    progress: 2
  });
  ipcSend("backport_all_data");
}

export default function SectionData(): JSX.Element {
  const arenaLogRef = React.useRef<HTMLInputElement>(null);

  const arenaLogClickHandle = (): void => {
    if (arenaLogRef.current) {
      arenaLogClick(arenaLogRef.current);
    }
  };

  let parsedOutput = <>auto-detection</>;
  if (pd.settings.log_locale_format) {
    const testDate = parse(
      pd.last_log_timestamp,
      pd.settings.log_locale_format,
      new Date()
    );
    if (isValid(testDate) && !isNaN(testDate.getTime())) {
      parsedOutput = (
        <>
          <b className="green">{testDate.toISOString()}</b>
          <i> (simplified extended ISO_8601 format)</i>
        </>
      );
    } else {
      parsedOutput = (
        <>
          <b className="red">Invalid format or timestamp</b>
        </>
      );
    }
  }

  return (
    <>
      <label className="but_container_label">
        Arena Data
        <WrappedReactSelect
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
      <label className="but_container_label" onClick={arenaLogClickHandle}>
        Arena Log:
        <div className="open_button" />
        <Input
          ref={arenaLogRef}
          contStyle={{ width: "70%" }}
          callback={arenaLogCallback}
          placeholder={pd.settings.logUri}
          value={pd.settings.logUri}
        />
      </label>
      <Checkbox
        text="Read entire Arena log during launch"
        value={!pd.settings.skip_firstpass}
        callback={firstPassCallback}
      />
      <div style={{ paddingLeft: "35px" }} className="settings_note">
        <i>
          <p>
            Enabling this ensures that mtgatool will not miss any data still
            available in your Arena log, even when mtgatool is launched while
            Arena is running <b>(Recommended)</b>.
          </p>
          <p>
            Disabling this will make mtgatool launch more quickly by skipping
            your preexisting Arena log and only reading new log data.{" "}
            <b>
              This may miss data if you launch mtgatool during an Arena session.
            </b>
          </p>
        </i>
      </div>
      <label className="but_container_label">
        Log Timestamp Format:
        <Input
          callback={localeCallback}
          placeholder={"default (auto)"}
          value={pd.settings.log_locale_format}
        />
      </label>
      <div className="settings_note">
        <p>Parsed output: {parsedOutput}</p>
        <i>
          <p>
            Date and time format to use when parsing the Arena log. Incorrect
            formats can cause issues importing or displaying data. mtgatool
            tries to auto-detect formats, but sometimes manual input is
            required.
          </p>
          <p>
            Leave blank to use default auto-detection, or{" "}
            <a onClick={parseLinkOpen} className="link parse_link">
              use ISO_8601 to specify a custom format
            </a>
            .
          </p>
        </i>
        <p>
          Last log timestamp: <b>{pd.last_log_timestamp}</b>
        </p>
        <p>
          Last format used: <b>{pd.settings.last_log_format}</b>
        </p>
      </div>
      <div className="settings_title">Local Data</div>
      <div className="settings_note">
        <p>
          Current application settings:
          <a onClick={openAppDbLink} className="link app_db_link">
            {pd.appDbPath}
          </a>
        </p>
        <p>
          Current player settings and history:
          <a onClick={openPlayerDbLink} className="link player_db_link">
            {pd.playerDbPath}
          </a>
        </p>
      </div>
      <Button
        text="Backport Data to Legacy JSON"
        onClick={backportClick}
        style={{ width: "300px" }}
      />
    </>
  );
}
