import { EnhancedStore, Dispatch, AnyAction } from "@reduxjs/toolkit";
import electron, {
  IpcMainEvent,
  BrowserWindow,
  IpcRendererEvent
} from "electron";
import {
  IPC_BACKGROUND,
  IPC_RENDERER,
  IPC_OVERLAY,
  IPC_NONE,
  IPC_MAIN
} from "../shared/constants";
import actions from "./actions";
const ipc = electron.ipcMain;
const ipcRenderer = electron.ipcRenderer;

/**
 * initializeMainReduxIPC
 *
 * Initializes redux store ipc listener for main process (main.js)
 * @param store  Redux store (EnhancedStore)
 * @param background window/process (BrowserWindow)
 * @param mainWindow window/process (BrowserWindow)
 * @param overlay window/process (BrowserWindow)
 */
export function initializeMainReduxIPC(
  store: EnhancedStore,
  back: BrowserWindow,
  main: BrowserWindow,
  overlay: BrowserWindow
): void {
  ipc.on("redux-action", function(
    event: IpcMainEvent,
    type: number,
    arg: string,
    to: number
  ) {
    // dispatch action
    try {
      if (to & IPC_MAIN) {
        const action = JSON.parse(arg);
        store.dispatch(actions[type](action));
      }
      // Relay action
      // to is binary to allow any number or relays
      if (to & IPC_BACKGROUND)
        back?.webContents.send("redux-action", type, arg);
      if (to & IPC_RENDERER) main?.webContents.send("redux-action", type, arg);
      if (to & IPC_OVERLAY)
        overlay?.webContents.send("redux-action", type, arg);
    } catch (e) {
      console.error("Attempted to parse a Redux Action but failed;", type, e);
    }
  });
}

/**
 * initializeRendererReduxIPC
 *
 * Initializes redux store ipc listeners for renderer processes.
 * @param store Redux store (EnhancedStore)
 */
export function initializeRendererReduxIPC(store: EnhancedStore): void {
  ipcRenderer.on(
    "redux-action",
    (event: IpcRendererEvent, type: string, arg: string) => {
      // dispatch action
      try {
        const action = JSON.parse(arg);
        store.dispatch(actions[type](action));
      } catch (e) {
        console.error("Attempted to parse a Redux Action but failed;", type, e);
      }
    }
  );
}

/**
 * Dispatch a redux action to the main store and (if required) relay it to other processes
 * @param dispatch Dispatcher
 * @param type Action type
 * @param arg argument / object
 * @param to process to relay to
 */
export function reduxAction(
  dispatch: Dispatch<AnyAction>,
  type: string,
  arg: any,
  to: number
): void {
  dispatch(actions[type](arg));
  if (to !== IPC_NONE) {
    ipcRenderer.send("redux-action", type, JSON.stringify(arg), to);
  }
}
