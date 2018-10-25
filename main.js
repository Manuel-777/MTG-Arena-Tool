'use strict';

const electron = require('electron');

const {dialog, app, globalShortcut, Menu, Tray, net, clipboard} = require('electron');
const path  = require('path');
const Store = require('./store.js');
const async = require("async");
const fs    = require("fs");

const {autoUpdater} = require("electron-updater");

// Adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')({showDevTools: false});
console.log(process.platform);

const debugBack = false;
const debugIPC = false;

var mainWindow;
var background;
var overlay;
var tray = null;
var closeToTray = true;
var updateState = 0;
var updateAvailable = 0;
var updateProgress = 0;
var updateSpeed = 0;
const ipc = electron.ipcMain;

var mainLoaded = false;
var backLoaded = false;

app.on('ready', () => {
    mainWindow  = createMainWindow();
    overlay     = createOverlay();
    background  = createBackgroundWindow();

    globalShortcut.register('Alt+Shift+D', () => {
        if (background.isVisible()) {
            background.hide();
        }
        else {
            background.show();
        }
    })

    mainWindow.webContents.once('dom-ready', () => {
        mainLoaded = true;
        if (backLoaded == true) {
            showWindow();
            background.webContents.send("set_renderer_state", 1);
        }
    });

    background.webContents.once('dom-ready', () => {
        backLoaded = true;
        if (mainLoaded == true) {
            showWindow();
            background.webContents.send("set_renderer_state", 1);
        }
    });

    autoUpdater.checkForUpdatesAndNotify();

    ipc.on('ipc_switch', function (event, method, arg) {
        if (debugIPC && method != "log_read") {
            if (debugIPC == 2 && method != "set_status" && method != "set_db" && method != "set_cards" && method != "set_decks" && method != "background_set_history_data") {
                console.log("IPC ", method+": "+JSON.stringify(arg));
            }
            else {
                console.log("IPC ", method);
            }
        }
        switch (method) {
            case 'ipc_log':
                console.log("IPC LOG: ", arg);
                break;

            case 'ipc_error':
                console.log("IPC ERROR: ", arg);
                background.webContents.send("error", arg);
                break;

            // to renderer
            case 'set_draft_link':
                mainWindow.webContents.send("set_draft_link", arg);
                break;

            case 'set_settings':
                //console.log("set settings: ", arg);
                saveSettings(arg);
                mainWindow.webContents.send("set_settings", arg);
                overlay.webContents.send("set_settings", arg);
                break;

            case 'auth':
                mainWindow.webContents.send("auth", arg);
                break;

            case 'login':
                background.webContents.send("login", arg);
                break;

            case 'set_remember':
                mainWindow.webContents.send("set_remember", arg);
                break;

            case 'offline':
                mainWindow.webContents.send("offline", arg);
                break;

            case 'set_status':
                mainWindow.webContents.send("set_status", arg);
                break;

            case 'set_events':
                mainWindow.webContents.send("set_events", arg);
                break;

            case 'set_db':
                mainWindow.webContents.send("set_db", arg);
                overlay.webContents.send("set_db", arg);
                break;

            case 'popup':
                mainWindow.webContents.send("popup", arg.text, arg.time);
                break;

            case 'background_set_history':
                mainWindow.webContents.send("set_history", arg);
                break;

            case 'background_set_history_data':
                mainWindow.webContents.send("set_history_data", arg);
                break;

            case 'set_deck_changes':
                mainWindow.webContents.send("set_deck_changes", arg);
                break;            

            case 'set_economy':
                mainWindow.webContents.send("set_economy", arg);
                break;

            case 'renderer_set_bounds':
                mainWindow.setBounds(arg);
                break;

            case 'renderer_window_minimize':
                mainWindow.minimize();
                break;

            case 'no_log':
                mainWindow.webContents.send("no_log", arg);
                break;

            case 'log_read':
                mainWindow.webContents.send("log_read", arg);
                break;  

            case 'set_username':
                mainWindow.webContents.send("set_username", arg);
                break;

            case 'set_rank':
                mainWindow.webContents.send("set_rank", arg.rank, arg.str);
                break;

            case 'set_decks':
                mainWindow.webContents.send("set_decks", arg);
                break;

            case 'set_deck_updated':
                mainWindow.webContents.send("set_deck_updated", arg);
                break;

            case 'set_cards':
                mainWindow.webContents.send("set_cards", arg.cards, arg.new);
                overlay.webContents.send("set_cards", arg.cards);
                break;

            case 'init_login':
                mainWindow.webContents.send("init_login", arg);
                break;

            case 'initialize':
                mainWindow.webContents.send("initialize", arg);
                break;

            case 'set_explore':
                mainWindow.webContents.send("set_explore", arg);
                break;

            case 'open_course_deck':
                mainWindow.webContents.send("open_course_deck", arg);
                break;

            // to background
            case 'remember':
                background.webContents.send("remember", arg);
                break;

            case 'request_draft_link':
                background.webContents.send("request_draft_link", arg);
                break;

            case 'get_deck_changes':
                background.webContents.send("get_deck_changes", arg);
                break;

            case 'request_explore':
                background.webContents.send("request_explore", arg);
                break;

            case 'request_events':
                background.webContents.send("request_events", arg);
                break;

            case 'request_economy':
                background.webContents.send("request_economy", arg);
                break;

            // ** FOR REMOVAL ** 
            case 'renderer_get_economy':
                background.webContents.send("set_economy", 1);
                break;

            case 'renderer_state':
                showWindow();
                background.webContents.send("set_renderer_state", arg);
                break;

            case 'save_settings':
                saveSettings(arg);
                background.webContents.send("save_settings", arg);
                overlay.webContents.send("set_settings", arg);
                break;

            case 'renderer_erase_data':
                background.webContents.send("delete_data", 1);
                httpDeleteData();
                break;

            case 'renderer_update_install':
                background.webContents.send("update_install", 1);
                break;

            case 'renderer_request_history':
                background.webContents.send("request_history", arg);
                break;

            case 'renderer_request_explore':
                background.webContents.send("request_explore", arg);
                break;

            case 'renderer_request_course':
                background.webContents.send("request_course", arg);
                break;

            case 'overlay_set_deck_mode':
                background.webContents.send("set_deck_mode", arg);
                break;

            // to overlay

            case 'set_deck':
                overlay.webContents.send("set_deck", arg);
                break;

            case 'set_draft':
                overlay.webContents.send("set_draft", arg);
                break;

            case 'set_draft_picks':
                overlay.webContents.send("set_draft_picks", arg);
                break;

            case 'set_timer':
                overlay.webContents.send("set_timer", arg);
                break;

            case 'set_opponent':
                overlay.webContents.send("set_opponent", arg);
                break;

            case 'set_opponent_rank':
                overlay.webContents.send("set_opponent_rank", arg.rank, arg.str);
                break;

            // to main js / window handling

            case 'show_background':
                background.show();
                break;

            case 'renderer_show':
                showWindow();
                break;

            case 'renderer_hide':
                hideWindow();
                break;

            case 'renderer_window_close':
                if (closeToTray) {
                    hideWindow();
                }
                else {
                    quit();
                }
                break;

            case 'set_close_to_tray':
                closeToTray = arg;
                break;

            case 'overlay_show':
                if (!overlay.isVisible()) {
                    overlay.show();
                }
                break;

            case 'overlay_close':
                overlay.hide();
                break;

            case 'overlay_minimize':
                overlay.minimize();
                break;

            case 'overlay_set_bounds':
                overlay.setBounds(arg);
                break;

            case 'overlay_set_ontop':
                overlay.setAlwaysOnTop(arg, 'floating');
                break;

            case 'save_overlay_pos':
                saveOverlayPos();
                break;

            case 'force_open_settings':
                mainWindow.webContents.send("force_open_settings", true);
                showWindow();
                break;

            case 'set_clipboard':
                clipboard.writeText(arg);
                break;

            case 'export_txt':
                dialog.showSaveDialog({
                    filters: [{
                        name: 'txt',
                        extensions: ['txt']
                    }],
                    defaultPath: '~/'+arg.name+'.txt'
                }, function(file_path) {
                    if (file_path) {
                        fs.writeFile(file_path, arg.str, function(err) {
                            if (err) {
                                dialog.showErrorBox('Error', err);
                                return;
                            }
                        });
                    }
                });

            case 'export_csvtxt':
                dialog.showSaveDialog({
                    filters: [{
                        name: 'csv',
                        extensions: ['csv']
                    },{
                        name: 'txt',
                        extensions: ['txt']
                    }],
                    defaultPath: '~/'+arg.name+'.csv'
                }, function(file_path) {
                    if (file_path) {
                        fs.writeFile(file_path, arg.str, function(err) {
                            if (err) {
                                dialog.showErrorBox('Error', err);
                                return;
                            }
                        });
                    }
                });

                break;

            default:
                console.log("IPC Switch unknown method ", method);
                break;
        }
    });

    //
    ipc.on('set_draft_cards', function(event, pack, picks, packn, pickn) {
        overlay.webContents.send("set_draft_cards", pack, picks, packn, pickn);
    });

    //
    ipc.on('set_turn', function(event, playerSeat, turnPhase, turnStep, turnNumber, turnActive, turnPriority, turnDecision) {
        overlay.webContents.send("set_turn", playerSeat, turnPhase, turnStep, turnNumber, turnActive, turnPriority, turnDecision);
    });
});


function saveSettings(settings) {
    app.setLoginItemSettings({
        openAtLogin: settings.startup
    });
    closeToTray = settings.close_to_tray;
}


// Catch exceptions
process.on('uncaughtException', function (err) {
    console.log('Uncaught exception;');
    console.log(err.stack);
    //console.log('Current chunk:',  currentChunk);
});

/*
    Auto update stuff
*/
autoUpdater.on('checking-for-update', () => {
    updateState = 0;
    sendUpdateState();
    console.log('Auto updater:', 'Checking for update...');
})

autoUpdater.on('update-available', (info) => {
    updateState = 1;
    updateAvailable = true;
    sendUpdateState();
    console.log('Auto updater:', 'Update available.');
    mainWindow.webContents.send("show_notification", "Update available");
    mainWindow.webContents.send("popup", "An update is available.");
})

autoUpdater.on('update-not-available', (info) => {
    updateState = -1;
    updateAvailable = false;
    sendUpdateState();
    console.log('Auto updater:', 'Update not available.');
})

autoUpdater.on('error', (err) => {
    updateState = -2;
    updateAvailable = false;
    sendUpdateState();
    console.log('Auto updater:', 'Error in auto-updater. ' + err);
    mainWindow.webContents.send("popup", "Updater error.");
})

autoUpdater.on('download-progress', (progressObj) => {
    updateState = 2;
    updateProgress = Math.round(progressObj.percent * 100) / 100;
    updateSpeed = progressObj.bytesPerSecond;
    sendUpdateState();

    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log('Auto updater:', log_message);
})

autoUpdater.on('update-downloaded', (info) => {
    updateState = 3;
    sendUpdateState();
    mainWindow.webContents.send("show_notification", "Update downloaded");
    console.log('Auto updater:', 'Update downloaded');
    mainWindow.webContents.send("popup", "Update downloaded");
});

function sendUpdateState() {
    var state = {state: updateState, available: updateAvailable, progress: updateProgress, speed: updateSpeed};
    mainWindow.webContents.send("set_update", state);
}

function onClosed() {
    mainWindow = null;
}

function onOverlayClosed() {
    overlay = null;
}

function hideWindow() {
    if (mainWindow.isVisible()) {
        mainWindow.hide()
    }
}

function toggleWindow() {
    if (mainWindow.isVisible()) {
        if (!mainWindow.isMinimized()) {
            mainWindow.minimize();
        }
        else {
            showWindow();
        }
    } else {
        showWindow();
    }
}

function showWindow() {
    if (!mainWindow.isVisible()) {
        mainWindow.show();
    }
}

function quit() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
}

function saveWindowPos() {
    var obj = {};
    var bounds = mainWindow.getBounds();
    var pos = mainWindow.getPosition();
    obj.width = Math.floor(bounds.width);
    obj.height = Math.floor(bounds.height);
    obj.x = Math.floor(pos[0]);
    obj.y = Math.floor(pos[1]);
    background.webContents.send('windowBounds', obj);
}

function saveOverlayPos() {
	var obj = {};
	var bounds = overlay.getBounds();
	var pos = overlay.getPosition();
	obj.width = Math.floor(bounds.width);
	obj.height = Math.floor(bounds.height);
	obj.x = Math.floor(pos[0]);
	obj.y = Math.floor(pos[1]);
    background.webContents.send('overlayBounds', obj);
}

function createBackgroundWindow() {
    const win = new electron.BrowserWindow({
        frame: false,
        x: 0,
        y: 0,
        show: debugBack,
        width: 100,
        height: 100,
        title: "MTG Arena Tool",
        icon:'icon.png'
    });
    win.loadURL(`file://${__dirname}/window_background/index.html`);
    win.on('closed', onClosed);

    return win;
}

function createMainWindow() {
    const win = new electron.BrowserWindow({
        /*transparent: true,*/
        backgroundColor: '#000',
        frame: false,
        show: false,
        width: 800,
        height: 600,
        title: "MTG Arena Tool",
        icon:'icon.png'
    });
    win.loadURL(`file://${__dirname}/window_main/index.html`);
    win.on('closed', onClosed);

    let iconPath = path.join(__dirname, 'icon.png');
    if (process.platform == 'win32') {
        iconPath = path.join(__dirname, 'icon.ico');
    }
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {label: 'Show', click: () => { showWindow();}},
      {label: 'Quit', click: () => { quit();}}
    ])
    tray.on('double-click', toggleWindow);
    tray.setToolTip('MTG Arena Tool');
    tray.setContextMenu(contextMenu);

	win.on('resize', (e) => {
		saveWindowPos();
	});

    return win;
}

function createOverlay() {
    const over = new electron.BrowserWindow({
        /*transparent: true,*/
        frame: false,
        alwaysOnTop: true,
        x: 0,
        y: 0,
        width: 300,
        height: 600,
        show: false,
        title: "MTG Arena Tool",
        icon:'images/icon.png'
    });
    over.loadURL(`file://${__dirname}/window_overlay/index.html`);
    over.on('closed', onOverlayClosed);

	over.on('resize', () => {
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

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
    if (mainWindow.isVisible()) {
        if (mainWindow.isMinimized()) {
            showWindow();
        }
    } else {
        showWindow();
    }
});

if (shouldQuit) {
    app.quit();
    return;
}

app.on('window-all-closed', () => {
    quit();
});

app.on('activate', () => {
    if (!mainWindow) {
        mainWindow = createMainWindow();
    }
});
