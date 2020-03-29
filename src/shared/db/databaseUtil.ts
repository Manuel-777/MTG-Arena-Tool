import { app, remote, ipcRenderer as ipc } from "electron";
import { IPC_RENDERER, IPC_BACKGROUND } from "../constants";

export const rememberDefaults = {
  settings: {
    email: "",
    token: "",
    toolVersion: 0,
    autoLogin: false,
    launchToTray: false,
    rememberMe: true,
    betaChannel: false,
    metadataLang: "en",
    logLocaleFormat: "",
    logUri: ""
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
  to = IPC_RENDERER
): void {
  // This is crude but works..
  if (process && process.type === "renderer") {
    ipc.send("ipc_switch", method, from, arg, to);
  }
}

function logInfo(message: string): void {
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
