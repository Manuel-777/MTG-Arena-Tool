import electron from "electron";
import { dialog, app, globalShortcut, Menu, Tray, clipboard } from "electron";
import path from "path";
import fs from "fs";
import { autoUpdater } from "electron-updater";

import {
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  OVERLAY_DRAFT_MODES
} from "./shared/constants";
import { appDb } from "./shared/db/LocalDatabase";

app.setAppUserModelId("com.github.manuel777.mtgatool");

import electronDebug from "electron-debug";
// Adds debug features like hotkeys for triggering dev tools and reload
electronDebug({ showDevTools: false });
console.log(process.platform);

const debugBack = false;
const debugIPC = false;

var mainWindow = null;
var updaterWindow = null;
var background = null;
var overlay = null;
var mainTimeout = null;
let settings = {
  close_to_tray: false,
  launch_to_tray: false
};
var tray = null;

const ipc = electron.ipcMain;

let mainLoaded = false;
let backLoaded = false;
let overlayLoaded = false;
let arenaState = ARENA_MODE_IDLE;
let editMode = false;

const singleLock = app.requestSingleInstanceLock();

app.on("second-instance", () => {
  if (updaterWindow) {
    showWindow();
  } else if (mainWindow.isVisible()) {
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
    const Sentry = require("@sentry/electron");
    Sentry.init({
      dsn: "https://4ec87bda1b064120a878eada5fc0b10f@sentry.io/1778171"
    });
    startApp();
    const dotenv = require("dotenv");
    dotenv.config();
  }
});

function startUpdater() {
  if (!app.isPackaged) return;
  appDb.init("application");
  appDb.find("", "settings").then(doc => {
    const allowBeta = doc.beta_channel || false;
    updaterWindow = createUpdaterWindow();

    updaterWindow.webContents.on("did-finish-load", function() {
      updaterWindow.show();
      updaterWindow.moveTop();
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
  updaterWindow.webContents.send("update_progress", progressObj);
});
autoUpdater.on("update-downloaded", info => {
  console.log("Update downloaded: ", info);
  installUpdate();
});

function installUpdate() {
  autoUpdater.quitAndInstall(true, true);
}

let appStarted = false;

function startApp() {
  if (appStarted) {
    if (updaterWindow) {
      updaterWindow.destroy();
      updaterWindow = undefined;
    }
    return;
  }
  mainWindow = createMainWindow();
  background = createBackgroundWindow();

  const startBackgroundWhenReady = () => {
    if (mainLoaded && backLoaded && overlayLoaded) {
      background.webContents.send("start_background");
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
      if (
        debugIPC == 2 &&
        method != "set_status" &&
        method != "set_db" &&
        method != "background_set_history_data"
      ) {
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

      case "initial_settings":
        initialize(arg);
        break;

      case "set_settings":
        setSettings(arg);
        break;

      case "player_data_refresh":
        // HACK WARNING!
        // during Arena matches and drafts we deliberately let the main window state
        // "go stale" instead of auto-refreshing. This allows players to use deck
        // details or collections pages without being constantly "reset" to main tab
        if (arenaState === ARENA_MODE_IDLE) {
          mainWindow.webContents.send("player_data_refresh");
        }
        overlay.webContents.send("player_data_refresh");
        break;

      case "set_db":
        mainWindow.webContents.send("set_db", arg);
        overlay.webContents.send("set_db", arg);
        break;

      case "popup":
        mainWindow.webContents.send("popup", arg.text, arg.time);
        if (arg.progress) {
          // set progress to <0 to disable
          // set progress to >1 for indeterminate time
          mainWindow.setProgressBar(arg.progress);
        }
        break;

      case "toggle_edit_mode":
        toggleEditMode();
        break;

      case "renderer_window_minimize":
        mainWindow.minimize();
        break;

      case "set_arena_state":
        setArenaState(arg);
        break;

      case "renderer_set_bounds":
        mainWindow.setBounds(arg);
        break;

      case "show_background":
        background.show();
        break;

      case "renderer_show":
        showWindow();
        break;

      case "renderer_hide":
        hideWindow();
        break;

      case "renderer_window_close":
        if (settings.close_to_tray) {
          hideWindow();
        } else {
          quit();
        }
        break;

      case "set_clipboard":
        clipboard.writeText(arg);
        break;

      case "updates_check":
        background.webContents.send("download_metadata");
        startUpdater();
        break;

      case "export_txt":
        dialog.showSaveDialog(
          {
            filters: [
              {
                name: "txt",
                extensions: ["txt"]
              }
            ],
            defaultPath: "~/" + arg.name + ".txt"
          },
          function(file_path) {
            if (file_path) {
              fs.writeFile(file_path, arg.str, function(err) {
                if (err) {
                  dialog.showErrorBox("Error", err);
                  return;
                }
              });
            }
          }
        );
        break;

      case "export_csvtxt":
        dialog.showSaveDialog(
          {
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
          },
          function(file_path) {
            if (file_path) {
              fs.writeFile(file_path, arg.str, function(err) {
                if (err) {
                  dialog.showErrorBox("Error", err);
                  return;
                }
              });
            }
          }
        );
        break;

      default:
        if (to == 0) background.webContents.send(method, arg);
        if (to == 1) mainWindow.webContents.send(method, arg);
        if (to === 2) overlay.webContents.send(method, arg);
        break;
    }
  });
}

function initialize(_settings) {
  console.log("MAIN:  Initializing");
  settings = _settings;
  if (!settings.launch_to_tray) showWindow();
}

function openDevTools() {
  if (background.isDevToolsOpened()) {
    background.closeDevTools();
  } else {
    background.openDevTools({ mode: "detach" });
  }
  if (mainWindow.isDevToolsOpened()) {
    mainWindow.closeDevTools();
  } else {
    showWindow();
    mainWindow.openDevTools();
  }
}

function openOverlayDevTools() {
  if (overlay.isDevToolsOpened()) {
    overlay.closeDevTools();
  } else {
    overlay.openDevTools({ mode: "detach" });
  }
}

function setArenaState(state) {
  arenaState = state;
  if (state === ARENA_MODE_MATCH && settings.close_on_match) {
    mainWindow.hide();
  }
  mainWindow.webContents.send("player_data_refresh");
  overlay.webContents.send("set_arena_state", state);
  updateOverlayVisibility();
}

function toggleEditMode() {
  editMode = !editMode;
  overlay.webContents.send("set_edit_mode", editMode);
  updateOverlayVisibility();
}

function setSettings(_settings) {
  try {
    settings = JSON.parse(_settings);
  } catch (e) {
    console.log("MAIN: Error parsing settings");
    console.log(e);
    return;
  }
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
    settings.overlays.forEach((_settings, index) => {
      let short = "shortcut_overlay_" + (index + 1);
      globalShortcut.register(settings[short], () => {
        overlay.webContents.send("close", { action: -1, index: index });
      });
    });
  }

  app.setLoginItemSettings({
    openAtLogin: settings.startup
  });
  mainWindow.webContents.send("settings_updated");

  // Send settings update
  overlay.setAlwaysOnTop(settings.overlay_ontop, "floating");
  overlay.webContents.send("settings_updated");

  updateOverlayVisibility();
}

let overlayHideTimeout = undefined;

function updateOverlayVisibility() {
  const shouldDisplayOverlay = settings.overlays.some(getOverlayVisible);
  const isOverlayVisible = isEntireOverlayVisible();

  //console.log("shouldDisplayOverlay: ", shouldDisplayOverlay, "isOverlayVisible: ", isOverlayVisible);
  if (!shouldDisplayOverlay && isOverlayVisible) {
    // hide entire overlay window
    // Add a 1 second timeout for animations
    overlayHideTimeout = setTimeout(function() {
      overlay.hide();
    }, 1000);
  } else if (shouldDisplayOverlay && !isOverlayVisible) {
    // display entire overlay window
    clearTimeout(overlayHideTimeout);
    overlayHideTimeout = undefined;

    overlaySetBounds();
    overlay.show();
  }
}

function isEntireOverlayVisible() {
  return overlay.isVisible();
}

/**
 * Computes whether an Overlay windowlet should be visible based on the
 * specified current overlay settings and Arena state. For example, given
 * overlay settings for a draft-mode overlay, it will return true iff Arena
 * is currently in a draft or idle.
 *
 * @param OverlaySettingsData settings
 */
function getOverlayVisible(settings) {
  if (!settings) return false;

  // Note: ensure this logic matches the logic in OverlayWindowlet
  // TODO: extract a common utility?
  const currentModeApplies =
    (OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_MATCH) ||
    (editMode && arenaState === ARENA_MODE_IDLE);

  return settings.show && (currentModeApplies || settings.show_always);
}

function overlaySetBounds() {
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

  overlay.setBounds(newBounds);
}

// Catch exceptions
process.on("uncaughtException", function(err) {
  console.log("Uncaught exception;");
  console.log(err.stack);
  //console.log('Current chunk:',  currentChunk);
});

function onBackClosed() {
  background = null;
  quit();
}

function onMainClosed(e) {
  quit();
  //hideWindow();
  //e.preventDefault();
}

function hideWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  }
}

function toggleWindow() {
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

function showWindow() {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    else mainWindow.moveTop();
  }
  if (updaterWindow) {
    if (!updaterWindow.isVisible()) updaterWindow.show();
    else updaterWindow.moveTop();
  }
}

function quit() {
  app.quit();
}

function saveWindowPos() {
  var obj = {};
  var bounds = mainWindow.getBounds();
  var pos = mainWindow.getPosition();
  obj.width = Math.floor(bounds.width);
  obj.height = Math.floor(bounds.height);
  obj.x = Math.floor(pos[0]);
  obj.y = Math.floor(pos[1]);
  background.webContents.send("windowBounds", obj);
}

function resetWindows() {
  const primary = electron.screen.getPrimaryDisplay();
  const { bounds } = primary;
  // reset overlay
  overlaySetBounds();

  // reset main to primary
  mainWindow.setBounds({ ...bounds, width: 800, height: 600 });
  mainWindow.show();
  mainWindow.moveTop();
  saveWindowPos();
}

function createUpdaterWindow() {
  const win = new electron.BrowserWindow({
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

function createBackgroundWindow() {
  const win = new electron.BrowserWindow({
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

function createOverlayWindow() {
  let bounds = electron.screen.getPrimaryDisplay().bounds;
  const overlay = new electron.BrowserWindow({
    transparent: true,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    show: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    title: "Overlay",
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

function createMainWindow() {
  const win = new electron.BrowserWindow({
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
      click: () => {
        showWindow();
      }
    },
    {
      label: "Edit Overlay Positions",
      click: () => {
        toggleEditMode();
      }
    },
    {
      label: "Reset Windows",
      click: () => resetWindows()
    },
    {
      label: "Quit",
      click: () => {
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
      mainTimeout = null;
    }
    mainTimeout = setTimeout(function() {
      saveWindowPos();
      mainTimeout = null;
    }, 500);
  });

  win.on("move", function() {
    if (mainTimeout) {
      clearTimeout(mainTimeout);
      mainTimeout = null;
    }
    mainTimeout = setTimeout(function() {
      saveWindowPos();
      mainTimeout = null;
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
