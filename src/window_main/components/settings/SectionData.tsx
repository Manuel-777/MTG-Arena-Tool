/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { remote, shell } from "electron";
const { dialog } = remote;
import Toggle from "../misc/Toggle";
import Input from "../misc/Input";
import pd from "../../../shared/PlayerData";
import { ipcSend } from "../../rendererUtil";
import ReactSelect from "../../../shared/ReactSelect";
import { parse, isValid } from "date-fns";
import Button from "../misc/Button";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared/redux/reducers";

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
    skip_firstpass: !checked,
    skipRefresh: true
  });
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
  const settings = useSelector((state: AppState) => state.settings);

  const arenaLogCallback = React.useCallback(
    (value: string): void => {
      if (value === settings.logUri) return;
      if (
        confirm(
          "Changing the Arena log location requires a restart, are you sure?"
        )
      ) {
        ipcSend("set_log", value);
      }
    },
    [settings.logUri]
  );

  const openPathDialog = React.useCallback(() => {
    dialog
      .showOpenDialog(remote.getCurrentWindow(), {
        title: "Arena Log Location",
        defaultPath: settings.logUri,
        buttonLabel: "Select",
        filters: [
          { name: "Text", extensions: ["txt", "text"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      })
      .then((value: Electron.OpenDialogReturnValue): void => {
        const paths = value.filePaths;
        if (paths && paths.length && paths[0]) {
          arenaLogCallback(paths[0]);
        }
      });
  }, [arenaLogCallback, settings.logUri]);

  let parsedOutput = <>auto-detection</>;
  if (settings.log_locale_format) {
    const testDate = parse(
      pd.last_log_timestamp,
      settings.log_locale_format,
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
      <div className="centered_setting_container">
        <label>Arena Data </label>
        <ReactSelect
          options={LANGUAGES}
          current={settings.metadata_lang}
          optionFormatter={getLanguageName}
          callback={setCardsLanguage}
        />{" "}
      </div>
      <div className="settings_note">
        <i>
          <p>
            Changes the cards data language,
            <b>not the interface</b>. Requires restarting tool to take effect.
          </p>
          <p>Card names when exporting will also be changed.</p>
        </i>
      </div>
      <div className="centered_setting_container">
        <label>Arena Log:</label>
        <div
          style={{
            display: "flex",
            width: "-webkit-fill-available",
            justifyContent: "flex-end"
          }}
        >
          <div className="open_button" onClick={openPathDialog} />
          <Input
            callback={arenaLogCallback}
            placeholder={settings.logUri}
            value={settings.logUri}
          />
        </div>
      </div>
      <Toggle
        text="Read entire Arena log during launch"
        value={!settings.skip_firstpass}
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
      <div className="centered_setting_container">
        <label>Log Timestamp Format:</label>
        <Input
          callback={localeCallback}
          placeholder={"default (auto)"}
          value={settings.log_locale_format}
        />
      </div>
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
          Last format used: <b>{pd.last_log_format}</b>
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
