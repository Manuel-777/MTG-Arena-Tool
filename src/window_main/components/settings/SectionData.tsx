/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { remote, shell } from "electron";
const { dialog } = remote;
import Toggle from "../misc/Toggle";
import Input from "../misc/Input";
import { ipcSend } from "../../rendererUtil";
import ReactSelect from "../../../shared/ReactSelect";
import { parse, isValid } from "date-fns";
import { useSelector } from "react-redux";
import store, { AppState } from "../../../shared-redux/stores/rendererStore";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { IPC_ALL, IPC_RENDERER } from "../../../shared/constants";

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
  reduxAction(
    store.dispatch,
    "SET_APP_SETTINGS",
    {
      metadataLang: filter.toLowerCase()
    },
    IPC_ALL ^ IPC_RENDERER
  );
}

function firstPassCallback(checked: boolean): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { skip_firstpass: !checked },
    IPC_ALL ^ IPC_RENDERER
  );
}

function localeCallback(value: string): void {
  reduxAction(
    store.dispatch,
    "SET_APP_SETTINGS",
    {
      logLocaleFormat: value
    },
    IPC_ALL ^ IPC_RENDERER
  );
}

function parseLinkOpen(): void {
  shell.openExternal("https://date-fns.org/v2.2.1/docs/parse");
}

function openAppDbLink(): void {
  shell.showItemInFolder(store.getState().playerdata.appDbPath);
}

function openPlayerDbLink(): void {
  shell.showItemInFolder(store.getState().playerdata.playerDbPath);
}

export default function SectionData(): JSX.Element {
  const settings = useSelector((state: AppState) => state.settings);
  const appSettings = useSelector((state: AppState) => state.appsettings);
  const playerData = useSelector((state: AppState) => state.playerdata);

  const arenaLogCallback = React.useCallback(
    (value: string): void => {
      if (value === appSettings.logUri) return;
      if (
        confirm(
          "Changing the Arena log location requires a restart, are you sure?"
        )
      ) {
        ipcSend("set_log", value);
      }
    },
    [appSettings.logUri]
  );

  const openPathDialog = React.useCallback(() => {
    dialog
      .showOpenDialog(remote.getCurrentWindow(), {
        title: "Arena Log Location",
        defaultPath: appSettings.logUri,
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
  }, [arenaLogCallback, appSettings.logUri]);

  let parsedOutput = <>auto-detection</>;
  if (appSettings.logLocaleFormat) {
    const testDate = parse(
      playerData.lastLogTimestamp,
      appSettings.logLocaleFormat,
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
          current={appSettings.metadataLang}
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
            placeholder={appSettings.logUri}
            value={appSettings.logUri}
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
          value={appSettings.logLocaleFormat}
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
      </div>
      <div className="settings_title">Local Data</div>
      <div className="settings_note">
        <p>
          Current application settings:
          <a onClick={openAppDbLink} className="link app_db_link">
            {playerData.appDbPath}
          </a>
        </p>
        <p>
          Current player settings and history:
          <a onClick={openPlayerDbLink} className="link player_db_link">
            {playerData.playerDbPath}
          </a>
        </p>
      </div>
    </>
  );
}
