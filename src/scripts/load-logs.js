//
// Simple script to batch load multiple backed up game log files.
//
// Usage: Edit `batch_load_files.json` to contain the absolute
// paths to all backed up log files
// Run `npm run load-logs` and watch the text scroll by for a few hours.
// Backup your config file before you do this.

// The code below works by instantiating the background process and
// sending the minimal necesary IPC calls so it thinks it's starting up as normal.
// After it's done it's job we kill it and do the same thing with each log in turn.

// At the time of writing there are several backward compatibility issues
// with very old logs.

import { app, BrowserWindow, ipcMain as ipc } from 'electron';

import path from 'path';

function createBackgroundWindow() {
  const win = new BrowserWindow({
    frame: false,
    x: 0,
    y: 0,
    show: false,
    width: 640,
    height: 480,
    title: "Background",
    icon: "icon.png",
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.loadURL(`file://${__dirname}/../window_background/index.html`);
  return win;
}

var background;

function processLog(filename, callback) {
  process.env.LOGFILE = filename;
  console.log(`LOG LOADER --- LOG IS: ${filename}`);
  if (background) {
    background.reload();
  } else {
    console.log("LOG LOADER --- CREATING BACKGROUND PROCESS");
    background = createBackgroundWindow();
  }

  background.webContents.once("dom-ready", () => {
    console.log("LOG LOADER --- STARTING BACKGROUND PROCESS");
    background.webContents.send("start_background");
  });

  function switchHandler(event, method, from, arg, to) {
    switch (method) {
      case "show_login":
        console.log("LOG LOADER --- SENDING OFFLINE LOGIN");
        background.webContents.send("login", { username: "", password: "" });
        break;

      case "initialize":
        console.log("LOG LOADER --- DETACHING IPC");
        ipc.removeListener("ipc_switch", switchHandler);
        console.log("LOG LOADER --- SENDING CLOSE");

        // background.close();
        // console.log('LOG LOADER --- calling', callback);
        // console.log('LOG LOADER --- SENDING DESTROY');
        // background.destroy();

        setTimeout(callback, 1000);
        break;

      case "set_player_data":
      case "set_active_events":
      case "set_priority_timer":
      case "action_log":
      case "set_match":
        // ignore
        break;

      case "popup":
        if (!arg.progress) {
          //
        }
        break;
      default:
        console.log(
          `IPC ${method} \t(${from} -> ${to}):\t${JSON.stringify(arg).substring(
            0,
            64
          )}`
        );
        break;
    }
  }

  ipc.on("ipc_switch", switchHandler);
}

function nextLog(log_files, callback) {
  console.log("nextLog", log_files);
  var log = log_files.shift();
  if (!log) {
    callback();
  } else {
    processLog(log, _ => nextLog(log_files, callback));
  }
}

// Set app name so we load the correct config file.
const appName = "MTG-Arena-Tool";
app.setName(appName);
const appData = app.getPath("appData");
app.setPath("userData", path.join(appData, appName));

app.on("ready", () => {
  const log_files = require("./batch_load_files.json");
  nextLog(log_files, _ => {
    background.close();
    console.log("LOG LOADER --- Done!");
  });
});

app.on("closed", function() {
  console.log("closed");
});

app.on("window-all-closed", () => {
  console.log("window-all-closed");
  app.quit();
});
