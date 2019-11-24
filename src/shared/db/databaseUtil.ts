import { app, remote, ipcRenderer as ipc } from "electron";
import { IPC_MAIN, IPC_BACKGROUND } from "../constants";

export const rememberDefaults = {
  email: "",
  token: "",
  settings: {
    toolVersion: 0,
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false,
    metadata_lang: "en",
    log_locale_format: ""
  }
};
export const settingsDefaults = {
  logUri: ""
};

export const USER_DATA_DIR = (app || remote.app).getPath("userData");

// Begin of IPC messages recievers
export function ipcSend(
  method: string,
  from = IPC_BACKGROUND,
  arg: any,
  to = IPC_MAIN
): void {
  ipc.send("ipc_switch", method, from, arg, to);
}

export function logInfo(message: string): void {
  console.log(`Local DB: ${message}`);
}

let blockingQueriesInFlight = 0;

export function showBusy(message: string): void {
  blockingQueriesInFlight += 1;
  logInfo(message);
  ipcSend("popup", IPC_BACKGROUND, { text: message, time: 0, progress: 2 });
}

export function hideBusyIfDone(message?: string): void {
  blockingQueriesInFlight = Math.max(0, blockingQueriesInFlight - 1);
  logInfo(message || "...done.");
  if (blockingQueriesInFlight > 0) {
    return; // not done, still busy
  }
  const time = message ? 3000 : 1;
  ipcSend("popup", IPC_BACKGROUND, { text: message, time, progress: -1 });
}

export function wrapCallback(
  verb: string,
  isBlocking: boolean,
  callback?: (err: Error | null, data: any) => void
): (err: Error | null, data: any) => void {
  return (err: Error | null, data: any): void => {
    let message = "...done.";
    if (err) {
      message = `...ERROR during ${verb}!`;
      console.error("Local DB: ERROR during ${verb}!", err);
    } else {
      if (typeof data === "number" && data > 1) {
      message = `...${verb} complete: ${data} document(s).`;
      } else {
        message = `...${verb} complete.`;
      }
    }
    if (isBlocking) {
      hideBusyIfDone(message);
    }
    if (callback) {
      callback(err, data);
    } else if (err) {
      throw err;
    }
  };
}
