/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/camelcase */
import electron, {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  Menu,
  SaveDialogReturnValue,
  Tray
} from "electron";
import _ from "lodash";
import { autoUpdater } from "electron-updater";
import fs from "fs";
import path from "path";
import installDevTools from "./devtools";
import {
  ARENA_MODE_DRAFT,
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  OVERLAY_DRAFT_MODES
} from "./shared/constants";
import { appDb } from "./shared/db/LocalDatabase";
import { SettingsData, OverlaySettingsData } from "./types/settings";
import { IPC_BACKGROUND, IPC_RENDERER, IPC_OVERLAY } from "./shared/constants";
import { initializeMainReduxIPC } from "./shared-redux/sharedRedux";
import store from "./shared-redux/stores/mainStore";

app.setAppUserModelId("com.github.manuel777.mtgatool");

console.log(process.platform);

const debugBack = false;
const debugIPC = false;

let mainWindow: BrowserWindow | undefined = undefined;
let updaterWindow: BrowserWindow | undefined = undefined;
let background: BrowserWindow | undefined = undefined;
let overlay: BrowserWindow | undefined = undefined;
let mainTimeout: NodeJS.Timeout | undefined = undefined;
let tray = null;

const ipc = electron.ipcMain;

let mainLoaded = false;
let backLoaded = false;
let overlayLoaded = false;
let arenaState = ARENA_MODE_IDLE;
let editMode = false;

let oldSettings = {};

const singleLock = app.requestSingleInstanceLock();

app.on("second-instance", () => {
  if (updaterWindow) {
    showWindow();
  } else if (mainWindow?.isVisible()) {
    if (mainWindow.isMinimized()) {
      showWindow();
    }
  } else {
    showWindow();
  }
});

if (!singleLock) {
  console.log("We dont have single instance lock! quitting the app.");
  app.quit();
}

app.on("ready", () => {
  if (app.isPackaged) {
    startUpdater();
  } else {
    installDevTools();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/electron");
    Sentry.init({
      dsn: "https://4ec87bda1b064120a878eada5fc0b10f@sentry.io/1778171"
    });
    startApp();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require("dotenv");
    dotenv.config();
  }
});

function startUpdater(): void {
  if (!app.isPackaged) return;
  appDb.init("application");
  appDb.find("", "settings").then(doc => {
    const allowBeta = doc.betaChannel || false;
    updaterWindow = createUpdaterWindow();

    updaterWindow.webContents.on("did-finish-load", function() {
      updaterWindow?.show();
      updaterWindow?.moveTop();
    });

    //autoUpdater.allowDowngrade = true;
    autoUpdater.allowPrerelease = allowBeta;
    autoUpdater.checkForUpdatesAndNotify();
  });
}

autoUpdater.on("update-not-available", info => {
  console.log("Update not available", info);
  if (mainWindow) {
    mainWindow.webContents.send("set_update_state", "Client up to date!");
  }
  startApp();
});
autoUpdater.on("error", err => {
  if (mainWindow) {
    mainWindow.webContents.send("set_update_state", "Update error.");
  }
  console.log("Update error: ", err);
  startApp();
});
autoUpdater.on("download-progress", progressObj => {
  updaterWindow?.webContents.send("update_progress", progressObj);
});
autoUpdater.on("update-downloaded", info => {
  console.log("Update downloaded: ", info);
  installUpdate();
});

function installUpdate(): void {
  autoUpdater.quitAndInstall(true, true);
}

let appStarted = false;

function startApp(): void {
  if (appStarted) {
    if (updaterWindow) {
      updaterWindow.destroy();
      updaterWindow = undefined;
    }
    return;
  }
  mainWindow = createMainWindow();
  background = createBackgroundWindow();

  const startBackgroundWhenReady = (): void => {
    if (mainLoaded && backLoaded && overlayLoaded) {
      if (mainWindow && background && overlay) {
        initializeMainReduxIPC(store, background, mainWindow, overlay);
        store.subscribe(() => {
          if (!_.isEqual(oldSettings, store.getState().settings)) {
            setSettings(store.getState().settings);
          }
        });
      }
      background?.webContents.send("start_background");
    }
  };

  globalShortcut.register("Alt+Shift+D", openDevTools);

  appStarted = true;

  mainWindow.webContents.once("dom-ready", () => {
    mainLoaded = true;
    startBackgroundWhenReady();
  });

  background.webContents.once("dom-ready", () => {
    backLoaded = true;
    startBackgroundWhenReady();
  });

  setTimeout(() => {
    overlay = createOverlayWindow();
    overlay.webContents.once("dom-ready", () => {
      overlayLoaded = true;
      startBackgroundWhenReady();
    });
  }, 500);

  // If we destroy updater before creating another renderer
  // Electron shuts down the whole app.
  if (updaterWindow) {
    updaterWindow.destroy();
    updaterWindow = undefined;
  }

  ipc.on("ipc_switch", function(event, method, from, arg, to) {
    if (debugIPC && method != "log_read") {
      if (debugIPC == 2 && method != "set_status" && method != "set_db") {
        console.log("IPC ", method + ": " + JSON.stringify(arg));
      } else {
        console.log("IPC ", method, "From:", from, "To:", to);
      }
    }
    switch (method) {
      case "ipc_log":
        console.log("IPC LOG: ", arg);
        break;

      case "ipc_error":
        console.log("IPC ERROR: ", arg);
        break;

      case "initialize_main":
        initialize(arg);
        break;

      case "set_db":
        mainWindow?.webContents.send("set_db", arg);
        overlay?.webContents.send("set_db", arg);
        break;

      case "popup":
        mainWindow?.webContents.send("popup", arg.text, arg.time);
        if (arg.progress) {
          // set progress to <0 to disable
          // set progress to >1 for indeterminate time
          mainWindow?.setProgressBar(arg.progress);
        }
        break;

      case "toggle_edit_mode":
        toggleEditMode();
        break;

      case "renderer_window_minimize":
        mainWindow?.minimize();
        break;

      case "set_arena_state":
        setArenaState(arg);
        break;

      case "renderer_set_bounds":
        mainWindow?.setBounds(arg);
        break;

      case "show_background":
        background?.show();
        break;

      case "renderer_show":
        showWindow();
        break;

      case "renderer_hide":
        hideWindow();
        break;

      case "renderer_window_close":
        if (store.getState().settings.close_to_tray) {
          hideWindow();
        } else {
          quit();
        }
        break;

      case "set_clipboard":
        clipboard.writeText(arg);
        break;

      case "updates_check":
        background?.webContents.send("download_metadata");
        startUpdater();
        break;

      case "export_txt":
        mainWindow &&
          dialog
            .showSaveDialog(mainWindow, {
              filters: [
                {
                  name: "txt",
                  extensions: ["txt"]
                }
              ],
              defaultPath: "~/" + arg.name + ".txt"
            })
            .then((value: SaveDialogReturnValue): void => {
              const filePath = value.filePath;
              if (filePath) {
                fs.writeFile(
                  filePath,
                  arg.str,
                  (err: NodeJS.ErrnoException | null): void => {
                    if (err) {
                      dialog.showErrorBox("Error", err.message);
                      return;
                    }
                  }
                );
              }
            });
        break;

      case "export_csvtxt":
        mainWindow &&
          dialog
            .showSaveDialog(mainWindow, {
              filters: [
                {
                  name: "csv",
                  extensions: ["csv"]
                },
                {
                  name: "txt",
                  extensions: ["txt"]
                }
              ],
              defaultPath: "~/" + arg.name + ".csv"
            })
            .then((value: SaveDialogReturnValue): void => {
              const filePath = value.filePath;
              if (filePath) {
                fs.writeFile(
                  filePath,
                  arg.str,
                  (err: NodeJS.ErrnoException | null): void => {
                    if (err) {
                      dialog.showErrorBox("Error", err.message);
                      return;
                    }
                  }
                );
              }
            });
        break;

      default:
        if (to == IPC_BACKGROUND) background?.webContents.send(method, arg);
        if (to == IPC_RENDERER) mainWindow?.webContents.send(method, arg);
        if (to === IPC_OVERLAY) overlay?.webContents.send(method, arg);
        break;
    }
  });
}

function initialize(launchToTray: boolean): void {
  console.log("MAIN:  Initializing");
  if (!launchToTray) showWindow();
}

function openDevTools(): void {
  const backgroundDevWin = background as any;
  if (backgroundDevWin?.isDevToolsOpened()) {
    backgroundDevWin.closeDevTools();
  } else {
    backgroundDevWin?.openDevTools({ mode: "detach" });
  }
  const mainDevWin = mainWindow as any;
  if (mainDevWin?.isDevToolsOpened()) {
    mainDevWin.closeDevTools();
  } else {
    showWindow();
    mainDevWin?.openDevTools();
  }
}

function openOverlayDevTools(): void {
  const overlayDevWin = overlay as any;
  if (overlayDevWin?.isDevToolsOpened()) {
    overlayDevWin.closeDevTools();
  } else {
    overlayDevWin?.openDevTools({ mode: "detach" });
  }
}

function setArenaState(state: number): void {
  arenaState = state;
  if (state === ARENA_MODE_MATCH && store.getState().settings.close_on_match) {
    mainWindow?.hide();
  }
  overlay?.webContents.send("set_arena_state", state);
  updateOverlayVisibility();
}

function toggleEditMode(): void {
  editMode = !editMode;
  overlay?.webContents.send("set_edit_mode", editMode);
  updateOverlayVisibility();
}

function setSettings(settings: SettingsData): void {
  oldSettings = JSON.parse(JSON.stringify(settings));
  console.log("MAIN:  Updating settings");

  // update keyboard shortcuts
  globalShortcut.unregisterAll();
  if (settings.enable_keyboard_shortcuts) {
    globalShortcut.register(settings.shortcut_devtools_main, openDevTools);
    globalShortcut.register(
      settings.shortcut_devtools_overlay,
      openOverlayDevTools
    );
    globalShortcut.register(settings.shortcut_editmode, () => {
      toggleEditMode();
    });
    settings.overlays?.forEach((_settings: any, index: number) => {
      const short = "shortcut_overlay_" + (index + 1);
      globalShortcut.register((settings as any)[short], () => {
        overlay?.webContents.send("close", { action: -1, index: index });
      });
    });
  }

  app.setLoginItemSettings({
    openAtLogin: settings.startup
  });

  // Send settings update
  overlay?.setAlwaysOnTop(settings.overlay_ontop, "pop-up-menu");
  if (settings.overlay_ontop && overlay && !overlay.isAlwaysOnTop()) {
    overlay.moveTop();
  }

  updateOverlayVisibility();
}

let overlayHideTimeout: NodeJS.Timeout | undefined = undefined;

function updateOverlayVisibility(): void {
  const shouldDisplayOverlay = store
    .getState()
    .settings.overlays?.some(getOverlayVisible);
  const isOverlayVisible = isEntireOverlayVisible();

  //console.log("shouldDisplayOverlay: ", shouldDisplayOverlay, "isOverlayVisible: ", isOverlayVisible);
  if (!shouldDisplayOverlay && isOverlayVisible) {
    // hide entire overlay window
    // Add a 1 second timeout for animations
    overlayHideTimeout = setTimeout(function() {
      overlay?.hide();
    }, 1000);
  } else if (shouldDisplayOverlay && !isOverlayVisible) {
    // display entire overlay window
    overlayHideTimeout && clearTimeout(overlayHideTimeout);
    overlayHideTimeout = undefined;

    overlaySetBounds();
    overlay?.show();
  }
}

function isEntireOverlayVisible(): boolean {
  return overlay?.isVisible() ?? false;
}

/**
 * Computes whether an Overlay windowlet should be visible based on the
 * specified current overlay settings and Arena state. For example, given
 * overlay settings for a draft-mode overlay, it will return true iff Arena
 * is currently in a draft or idle.
 *
 * @param OverlaySettingsData settings
 */
function getOverlayVisible(settings: OverlaySettingsData): boolean {
  if (!settings) return false;

  // Note: ensure this logic matches the logic in OverlayWindowlet
  // TODO: extract a common utility?
  const currentModeApplies =
    (OVERLAY_DRAFT_MODES.includes(settings.mode as any) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!OVERLAY_DRAFT_MODES.includes(settings.mode as any) &&
      arenaState === ARENA_MODE_MATCH) ||
    (editMode && arenaState === ARENA_MODE_IDLE);

  return settings.show && (currentModeApplies || settings.show_always);
}

function overlaySetBounds(): void {
  const newBounds = { x: 0, y: 0, width: 0, height: 0 };
  electron.screen.getAllDisplays().forEach(display => {
    newBounds.x = Math.min(newBounds.x, display.bounds.x);
    newBounds.y = Math.min(newBounds.y, display.bounds.y);
  });
  electron.screen.getAllDisplays().forEach(display => {
    newBounds.width = Math.max(
      newBounds.width,
      Math.abs(newBounds.x) + display.bounds.x + display.bounds.width
    );
    newBounds.height = Math.max(
      newBounds.height,
      Math.abs(newBounds.y) + display.bounds.y + display.bounds.height
    );
  });

  console.log(
    "Overlay bounds: ",
    newBounds.x,
    newBounds.y,
    newBounds.width,
    newBounds.height
  );

  overlay?.setBounds(newBounds);
}

// Catch exceptions
process.on("uncaughtException", function(err) {
  console.log("Uncaught exception;");
  console.log(err.stack);
  //console.log('Current chunk:',  currentChunk);
});

function onBackClosed(): void {
  background = undefined;
  quit();
}

function onMainClosed(): void {
  quit();
  //hideWindow();
  //e.preventDefault();
}

function hideWindow(): void {
  if (mainWindow?.isVisible()) {
    mainWindow.hide();
  }
}

function toggleWindow(): void {
  if (mainWindow && mainWindow.isVisible()) {
    if (!mainWindow.isMinimized()) {
      mainWindow.minimize();
    } else {
      showWindow();
    }
  } else {
    showWindow();
  }
}

function showWindow(): void {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    else mainWindow.moveTop();
  }
  if (updaterWindow) {
    if (!updaterWindow.isVisible()) updaterWindow.show();
    else updaterWindow.moveTop();
  }
}

function quit(): void {
  app.quit();
}

function saveWindowPos(): void {
  const obj: Record<string, number> = {};
  const bounds = mainWindow?.getBounds();
  const pos = mainWindow?.getPosition();
  obj.width = Math.floor(bounds?.width ?? 320);
  obj.height = Math.floor(bounds?.height ?? 240);
  obj.x = Math.floor(pos?.[0] ?? 0);
  obj.y = Math.floor(pos?.[1] ?? 0);
  background?.webContents.send("windowBounds", obj);
}

function resetWindows(): void {
  const primary = electron.screen.getPrimaryDisplay();
  const { bounds } = primary;
  // reset overlay
  overlaySetBounds();

  // reset main to primary
  mainWindow?.setBounds({ ...bounds, width: 800, height: 600 });
  mainWindow?.show();
  mainWindow?.moveTop();
  saveWindowPos();
}

function createUpdaterWindow(): BrowserWindow {
  const win = new BrowserWindow({
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    center: true,
    show: false,
    width: 320,
    height: 240,
    title: "Updater",
    icon: "icons/icon.png",
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.loadURL(`file://${__dirname}/window_updater/index.html`);

  return win;
}

function createBackgroundWindow(): BrowserWindow {
  const win = new BrowserWindow({
    frame: false,
    x: 0,
    y: 0,
    show: debugBack,
    width: 640,
    height: 480,
    title: "Background",
    icon: "icons/icon.png",
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.loadURL(`file://${__dirname}/window_background/index.html`);
  win.on("closed", onBackClosed);

  return win;
}

function createOverlayWindow(): BrowserWindow {
  const bounds = electron.screen.getPrimaryDisplay().bounds;
  const overlay = new BrowserWindow({
    transparent: true,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    title: "Overlay",
    show: process.platform == "linux" ? false : true,
    webPreferences: {
      nodeIntegration: true
    }
  });
  overlay.loadURL(`file://${__dirname}/overlay/index.html`);

  if (process.platform !== "linux") {
    // https://electronjs.org/docs/api/browser-window#winsetignoremouseeventsignore-options
    // does not currently support Linux
    overlay.setIgnoreMouseEvents(true, { forward: true });
  }

  return overlay;
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    backgroundColor: "#000",
    frame: false,
    show: false,
    width: 800,
    height: 600,
    title: "MTG Arena Tool",
    icon: "icons/icon.png",
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.loadURL(`file://${__dirname}/window_main/index.html`);
  win.on("closed", onMainClosed);

  let iconPath = path.join(__dirname, "../icons/icon-tray.png");
  if (process.platform == "linux") {
    iconPath = path.join(__dirname, "../icons/icon-tray@8x.png");
  }
  if (process.platform == "win32") {
    iconPath = path.join(__dirname, "../icons/icon-256.png");
  }

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: (): void => {
        showWindow();
      }
    },
    {
      label: "Edit Overlay Positions",
      click: (): void => {
        toggleEditMode();
      }
    },
    {
      label: "Reset Windows",
      click: (): void => resetWindows()
    },
    {
      label: "Quit",
      click: (): void => {
        quit();
      }
    }
  ]);
  tray.on("double-click", toggleWindow);
  tray.setToolTip("MTG Arena Tool");
  tray.setContextMenu(contextMenu);

  win.on("resize", () => {
    if (mainTimeout) {
      clearTimeout(mainTimeout);
      mainTimeout = undefined;
    }
    mainTimeout = setTimeout(function() {
      saveWindowPos();
      mainTimeout = undefined;
    }, 500);
  });

  win.on("move", function() {
    if (mainTimeout) {
      clearTimeout(mainTimeout);
      mainTimeout = undefined;
    }
    mainTimeout = setTimeout(function() {
      saveWindowPos();
      mainTimeout = undefined;
    }, 500);
  });

  return win;
}

app.on("window-all-closed", () => {
  quit();
});

app.on("activate", () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});
