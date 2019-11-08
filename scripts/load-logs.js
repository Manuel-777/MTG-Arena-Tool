//
// Simple script to batch load multiple backed up game log files.
//
// Usage: Edit `batch_load_files.json` to contain the absolute
// paths to all backed up log files
// Run `npm run load-logs` and watch the text scroll by for a few hours.

// IMPORTANT: Backup your config file before you do this.

// The code below works by instantiating the background process and
// sending the minimal necesary IPC calls so it thinks it's starting up as normal.
// After it's done it's job we kill it and do the same thing with each log in turn.

// At the time of writing there are several backward compatibility issues
// with very old logs.

// To generate a file of logs, from a directory of saved logs, use something like this:
// $ python -c "import glob, os, json; print(json.dumps(sorted(glob.glob(r'<<<path to logs>>>\*'), key=os.path.getmtime), indent=4))" > ./batch_load_files.json

const { app, BrowserWindow, ipcMain: ipc } = require("electron");
const path = require("path");
const DEBUG = true;

function createBackgroundWindow() {
  const win = new BrowserWindow({
    frame: false,
    x: 0,
    y: 0,
    show: DEBUG,
    width: 640,
    height: 480,
    title: "Background",
    icon: "icon.png",
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.loadURL(`file://${__dirname}/../lib/window_background/index.html`);
  return win;
}

var background;
var lastMessageTime = Date.now();

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

  function endLog() {
    console.log("LOG LOADER --- DETACHING IPC");
    ipc.removeListener("ipc_switch", switchHandler);
    console.log("LOG LOADER --- SENDING CLOSE");

    // background.close();
    // console.log('LOG LOADER --- calling', callback);
    // console.log('LOG LOADER --- SENDING DESTROY');
    // background.destroy();

    setTimeout(callback, 1000);
  }

  function switchHandler(event, method, from, arg, to) {
    lastMessageTime = Date.now();

    switch (method) {
      case "show_login":
        console.log("LOG LOADER --- SENDING OFFLINE LOGIN");
        background.webContents.send("login", { username: "", password: "" });
        break;

      case "initialize":
        endLog();
        break;

      case "set_player_data":
      case "set_active_events":
      case "action_log":
      case "set_match":
        // ignore
        break;

      case "popup":
        if (arg.text.includes("Detailed logs disabled")) {
          endLog();
        }

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

function terminateStall() {
  const timeSinceLastMessage = Date.now() - lastMessageTime;
  // if thirty seconds have passed then trigger a
  // termination using a false initialize event

  if (timeSinceLastMessage > 30000) {
    ipc.send("ipc_switch", {
      event: "Timeout - exiting",
      method: "initialize"
    });
  }
}

app.on("ready", () => {
  const log_files = require("./batch_load_files.json");

  var tsInterval = setInterval(terminateStall, 1000);

  nextLog(log_files, _ => {
    if (!DEBUG) {
      background.close();
    }
    clearTimeout(tsInterval);
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
