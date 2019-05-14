"use strict";
const electron = require("electron");

const {
  dialog,
  app,
  globalShortcut,
  Menu,
  MenuItem,
  Tray,
  clipboard
} = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const Store = require("electron-store");

var rememberStore = new Store({
  name: "remember",
  defaults: {}
});

app.setAppUserModelId("com.github.manuel777.mtgatool");

// Adds debug features like hotkeys for triggering dev tools and reload
require("electron-debug")({ showDevTools: false });
console.log(process.platform);

const debugBack = false;
const debugIPC = false;

var mainWindow;
var updaterWindow;
var background;
var overlay;
var tray = null;
var closeToTray = true;
let autoLogin = false;
let launchToTray = false;
var alphaEnabled = false;

const ipc = electron.ipcMain;

var mainLoaded = false;
var backLoaded = false;
var firstSettingsRead = true;

const singleLock = app.requestSingleInstanceLock();

if (!singleLock) {
  console.log("We dont have single instance lock! quitting the app.");
  app.quit();
} else {
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

  app.on("ready", () => {
    if (app.isPackaged) {
      startUpdater();
    } else {
      startApp();
    }
  });
}

function startUpdater() {
  updaterWindow = createUpdaterWindow();

  updaterWindow.webContents.on("did-finish-load", function() {
    updaterWindow.show();
  });

  let betaChannel = rememberStore.get("settings.beta_channel");
  if (betaChannel) {
    autoUpdater.allowPrerelease = true;
  }

  autoUpdater.checkForUpdatesAndNotify();
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

function startApp() {
  mainWindow = createMainWindow();
  overlay = createOverlay();
  background = createBackgroundWindow();

  globalShortcut.register("Alt+Shift+D", () => {
    if (!background.isVisible()) background.show();
    else background.hide();
    background.toggleDevTools();
    overlay.toggleDevTools();
    mainWindow.toggleDevTools();
  });

  mainWindow.webContents.once("dom-ready", () => {
    mainLoaded = true;
    if (backLoaded == true) {
      background.webContents.send("set_renderer_state", 1);
    }
  });

  background.webContents.once("dom-ready", () => {
    backLoaded = true;
    if (mainLoaded == true) {
      background.webContents.send("set_renderer_state", 1);
    }
  });

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
        method != "set_cards" &&
        method != "set_decks" &&
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
        background.webContents.send("error", arg);
        break;

      case "set_settings":
        //console.log("set settings: ", arg);
        setSettings(arg);
        mainWindow.webContents.send("set_settings", arg);
        overlay.webContents.send("set_settings", arg);
        break;

      case "set_db":
        mainWindow.webContents.send("set_db", arg);
        overlay.webContents.send("set_db", arg);
        if (autoLogin) {
          background.webContents.send("auto_login");
        }
        break;

      case "popup":
        mainWindow.webContents.send("popup", arg.text, arg.time);
        break;

      case "renderer_window_minimize":
        mainWindow.minimize();
        break;

      case "set_rank":
        mainWindow.webContents.send("set_rank", arg.rank, arg.str);
        break;

      case "set_cards":
        mainWindow.webContents.send("set_cards", arg.cards, arg.new);
        overlay.webContents.send("set_cards", arg.cards);
        break;

      case "set_opponent_rank":
        overlay.webContents.send("set_opponent_rank", arg.rank, arg.str);
        break;

      // to main js / window handling

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
        if (closeToTray) {
          hideWindow();
        } else {
          quit();
        }
        break;

      case "set_close_to_tray":
        closeToTray = arg;
        break;

      case "overlay_show":
        if (!overlay.isVisible()) {
          overlay.showInactive();
        }
        break;

      case "overlay_close":
        overlay.hide();
        break;

      case "overlay_minimize":
        overlay.minimize();
        break;

      case "renderer_set_bounds":
        mainWindow.setBounds(arg);
        break;

      case "overlay_set_bounds":
        overlay.setBounds(arg);
        break;

      case "overlay_set_ontop":
        overlay.setAlwaysOnTop(arg, "floating");
        break;

      case "save_overlay_pos":
        saveOverlayPos();
        break;

      case "force_open_settings":
        mainWindow.webContents.send("force_open_settings", true);
        showWindow();
        break;

      case "set_clipboard":
        clipboard.writeText(arg);
        break;

      case "reset_overlay_pos":
        overlay.setPosition(0, 0);
        break;

      case "updates_check":
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
        if (to == 2) overlay.webContents.send(method, arg);
        break;
    }
  });

  //
  ipc.on("set_draft_cards", function(event, pack, picks, packn, pickn) {
    overlay.webContents.send("set_draft_cards", pack, picks, packn, pickn);
  });

  //
  ipc.on("set_turn", function(
    event,
    playerSeat,
    turnPhase,
    turnStep,
    turnNumber,
    turnActive,
    turnPriority,
    turnDecision
  ) {
    overlay.webContents.send(
      "set_turn",
      playerSeat,
      turnPhase,
      turnStep,
      turnNumber,
      turnActive,
      turnPriority,
      turnDecision
    );
  });
}

function setSettings(settings) {
  app.setLoginItemSettings({
    openAtLogin: settings.startup
  });
  closeToTray = settings.close_to_tray;
  autoLogin = settings.auto_login;
  launchToTray = settings.launch_to_tray;

  if (!launchToTray && firstSettingsRead) {
    showWindow();
  }

  var oldAlphaEnabled = alphaEnabled;
  alphaEnabled = settings.overlay_alpha_back < 1;
  if (oldAlphaEnabled != alphaEnabled) {
    recreateOverlay();
  }
  firstSettingsRead = false;
}

// Catch exceptions
process.on("uncaughtException", function(err) {
  console.log("Uncaught exception;");
  console.log(err.stack);
  //console.log('Current chunk:',  currentChunk);
});

function onClosed() {
  mainWindow = null;
}

function onOverlayClosed() {
  overlay = null;
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
  if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show();
  }
  if (updaterWindow && !updaterWindow.isVisible()) {
    updaterWindow.show();
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

function saveOverlayPos() {
  var obj = {};
  var bounds = overlay.getBounds();
  var pos = overlay.getPosition();
  obj.width = Math.floor(bounds.width);
  obj.height = Math.floor(bounds.height);
  obj.x = Math.floor(pos[0]);
  obj.y = Math.floor(pos[1]);
  background.webContents.send("overlayBounds", obj);
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
    icon: "icon.png"
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
    icon: "icon.png"
  });
  win.loadURL(`file://${__dirname}/window_background/index.html`);
  win.on("closed", onClosed);

  return win;
}

function createMainWindow() {
  const win = new electron.BrowserWindow({
    backgroundColor: "#000",
    frame: false,
    show: false,
    width: 800,
    height: 600,
    title: "MTG Arena Tool",
    icon: "icon.png"
  });
  win.loadURL(`file://${__dirname}/window_main/index.html`);
  win.on("closed", onClosed);

  let iconPath = path.join(__dirname, "icon-tray.png");
  if (process.platform == "win32") {
    iconPath = path.join(__dirname, "icon.ico");
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
    saveWindowPos();
  });

  return win;
}

function createOverlay() {
  const over = new electron.BrowserWindow({
    transparent: alphaEnabled,
    frame: false,
    alwaysOnTop: true,
    x: 0,
    y: 0,
    width: 300,
    height: 600,
    show: false,
    title: "MTG Arena Tool",
    icon: "iconoverlay.png"
  });
  over.loadURL(`file://${__dirname}/window_overlay/index.html`);
  over.on("closed", onOverlayClosed);

  over.on("resize", () => {
    saveOverlayPos();
  });

  /*
  setTimeout( function() {
    overlay.webContents.send("set_deck", currentDeck);
    //debug_overlay_show();
  }, 1000);
  */
  return over;
}

function recreateOverlay() {
  if (overlay) {
    overlay.destroy();
    overlay = createOverlay();
    overlay.webContents.once("dom-ready", () => {
      background.webContents.send("reload_overlay");
    });
  }
}

app.on("window-all-closed", () => {
  quit();
});

app.on("activate", () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});
