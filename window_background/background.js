var electron = require('electron');

const {app, net, clipboard} = require('electron');
const path  = require('path');
const Store = require('../store.js');
const async = require("async");
const qs    = require('qs');

const rememberCfg = {
    email: '',
    token: ''
}

const defaultCfg = {
    windowBounds: { width: 800, height: 600, x: 0, y: 0 },
    overlayBounds: { width: 300, height: 600, x: 0, y: 0 },
    cards: { cards_time: 0, cards_before:[], cards:[] },
    settings: {
        overlay_sideboard: false,
        sound_priority: false,
        cards_quality: 'small',
        show_overlay: true,
        show_overlay_always: false,
        startup: true,
        close_to_tray: true,
        send_data: true,
        anon_explore: false,
        close_on_match: true,
        cards_size: 2,
        overlay_alpha: 1,
        overlay_alpha_back: 1,
        overlay_top: true,
        overlay_title: true,
        overlay_deck: true,
        overlay_clock: true,
        overlay_ontop: true,
        export_format: "$Name,$Count,$Rarity,$SetName,$Collector",
        back_color: "rgba(0,0,0,0.3)",
        back_url: ''
    },
    economy_index:[],
    economy:[],
    deck_changes:{},
    deck_changes_index:[],
    courses_index:[],
    matches_index:[],
    draft_index:[],
    gems_history:[],
    gold_history:[],
    wildcards_history:[]
}

var rstore = new Store({
    configName: "remember",
    defaults: rememberCfg
});

var store = new Store({
	configName: 'default',
	defaults: defaultCfg
});

const sha1 = require('js-sha1');

const serverAddress = 'mtgatool.com';

const debugLog = false;
const debugNet = true;
var debugLogSpeed = 0.1;
var timeStart = 0;
var timeEnd = 0;
const fs = require("fs");
window.ipc = electron.ipcRenderer;

const actionLogDir = path.join((electron.app || electron.remote.app).getPath('userData'), 'actionlogs');
if (!fs.existsSync(actionLogDir)){
    fs.mkdirSync(actionLogDir);
}

var firstPass = true;
var tokenAuth = undefined;

var renderer_state = 0;
var currentChunk = "";
var oppDeck = {mainDeck: [], sideboard: []};
var currentDeck = {};
var currentDeckUpdated = {};
var currentMatchId = null;
var currentMatchTime = 0;
var currentEventId = null;
var matchWincon = "";
var duringMatch = false;
var matchBeginTime = 0;

var arenaVersion = '';
var playerPassword = '';
var playerUsername = '';
var playerName = null;
var playerRank = null;
var playerTier = null;
var playerId = null;
var playerSeat = null;
var playerWin = 0;

var oppName = null;
var oppRank = null;
var oppTier = null;
var oppId = null;
var oppSeat = null;
var oppWin = 0;
var annotationsRead = [];

var prevTurn = -1;
var turnPhase = "";
var turnStep  = "";
var turnNumber = 0;
var turnActive = 0;
var turnPriority = 0;
var turnDecision = 0;
var turnStorm = 0;
var playerLife = 20;
var opponentLife = 20;

var zones = {};
var gameObjs = {};
var hoverCard = undefined;
var history = {};
var drafts = {};
var events = {};
var topDecks = {};
//var coursesToSubmit = {};
var decks = [];

var gold = 0;
var gems = 0;
var vault = 0;
var wcTrack = 0;
var wcCommon = 0;
var wcUncommon = 0;
var wcRare = 0;
var wcMythic = 0;

var updateAvailable = false;
var updateState = -1;
var updateProgress = -1;
var updateSpeed = 0;
var currentDraft = undefined;
var currentDraftPack = undefined;
var draftSet = "";
var draftId = undefined;
var overlayDeckMode = 0;
var lastDeckUpdate = new Date();

var economy = {};
var goldHistory = [];
var gemsHistory = [];
var wilcardsHistory = [];
var deck_changes_index = [];
var deck_changes = {};


// Begin of IPC messages recievers
ipc_send = function (method, arg) {
    if (method == "ipc_log") {
        //console.log("IPC LOG", arg);
    }
    //console.log("ipc_switch", method, arg);
    ipc.send('ipc_switch', method, arg);
};


var rememberMe = false;

//
ipc.on('remember', function (event, arg) {
    rememberMe = arg;
    if (!arg) {
        rstore.set("email", "");
        rstore.set("token", "");
    }
});

function loadSettings() {
    var settings = store.get("settings");
    updateSettings(settings, true);
}

ipc.on('reload_overlay', function (event, arg) {
    loadSettings();
    var obj = store.get('overlayBounds');
    ipc_send("overlay_set_bounds", obj);
});

//
ipc.on('set_renderer_state', function (event, arg) {
    ipc_send("ipc_log", "Renderer state: "+arg);
	renderer_state = arg;
	loadSettings();

    if (rstore.get("token") !== "" && rstore.get("email") !== "") {
        rememberMe = true;
        tokenAuth = rstore.get("token");
        ipc_send("set_remember", rstore.get("email"));
    }    
});

//
ipc.on('login', function (event, arg) {
    if (arg.password == "********") {
        tokenAuth = rstore.get("token");
        playerUsername = arg.username;
        httpAuth(arg.username, arg.password);
    }
    else if (arg.username == '' && arg.password == '') {
        ipc_send("auth", {ok: true, user:-1});
        loadPlayerConfig(playerId);
        playerUsername = '';
    }
    else {
        playerUsername = arg.username;
        tokenAuth = '';
        httpAuth(arg.username, arg.password);
    }
});

//
ipc.on('request_draft_link', function (event, obj) {
    httpDraftShareLink(obj.id, obj.expire);
});

//
ipc.on('windowBounds', function (event, obj) {
	store.set('windowBounds', obj);
});

//
ipc.on('overlayBounds', function (event, obj) {
	store.set('overlayBounds', obj);
});

//
ipc.on('save_settings', function (event, settings) {
    store.set('settings', settings);
    updateSettings(settings, false);
});

//
ipc.on('delete_data', function (event, arg) {
    httpDeleteData();
});

//
ipc.on('request_events', function (event, arg) {
    ipc_send("set_events", JSON.stringify(events));
});

//
ipc.on('request_history', function (event, state) {
    requestHistorySend(state);
});

window.onerror = (msg, url, line, col, err) => {
    var error = {
        msg: err.msg,
        stack: err.stack,
        line: line,
        col: col
    }
    error.id = sha1(error.msg + playerId);
    resetLogLoop(250);
    httpSendError(error);
}

process.on('uncaughtException', function(err){
    var error = {
        msg: err,
        stack: "uncaughtException",
        line: 0,
        col: 0
    }
    console.log("ERROR: ", error);
    error.id = sha1(error.msg + playerId);
    resetLogLoop(250);
    httpSendError(error);
})

//
ipc.on('error', function (event, err) {
    err.id = sha1(err.msg + playerId);
    resetLogLoop(250);
    httpSendError(err);
});

//
function requestHistorySend(state) {
	if (history.matches != undefined) {
		calculateRankWins(history);
	}
    if (state == 1) {
        // Send the data and open history tab
        ipc_send("background_set_history", JSON.stringify(history));
    }
    else {
        /// Send only the data
        ipc_send("background_set_history_data", JSON.stringify(history));
    }
}

// Calculates winrates for history tabs (set to last 10 dys as default)
function calculateRankWins() {
	var rankwinrates = {beginner: {w:0, l:0, t:0, r:"Beginner"}, bronze: {w:0, l:0, t:0, r:"Bronze"}, silver: {w:0, l:0, t:0, r:"Silver"}, gold: {w:0, l:0, t:0, r:"Gold"}, diamond: {w:0, l:0, t:0, r:"Diamond"}, master: {w:0, l:0, t:0, r:"Master"}};
	for (var i = 0; i < history.matches.length; i++) {
		let match_id = history.matches[i];
		let match = history[match_id];

		if (match == undefined) continue;
		if (match.type != "match") continue;
		if (match.opponent == undefined) continue;

		if (daysPast(match.date) > 10) continue;

		let struct = undefined;
		switch (match.opponent.rank) {
			case "Beginner":
				struct = rankwinrates.beginner;	break;
			case "Bronze":
				struct = rankwinrates.bronze;	break;
			case "Silver":
				struct = rankwinrates.silver;	break;
			case "Gold":
				struct = rankwinrates.gold;		break;
			case "Diamond":
				struct = rankwinrates.diamond;	break;
			case "Master":
				struct = rankwinrates.master;	break;
			default:
				struct = undefined;	break;
		}

		if (struct != undefined) {
			struct.t += 1;
			if (match.opponent.win > match.player.win)
				struct.l += 1;
			else 
				struct.w += 1;
		}
	}

	history.rankwinrates = rankwinrates;
}

ipc.on('request_explore', function (event, arg) {
    if (playerUsername == '') {
        ipc_send("offline", 1);
    }
    else {
        if (arg == "all" || arg == "All" ) {
            httpGetTopDecks("");
        }
        else {
            //arg = arg.replace("_m_", "_m19_");// dirty hack :(
            httpGetTopDecks(arg);
        }
    }
});

ipc.on('request_economy', function (event, arg) { 
    var ec = economy;
    ec.gold = gold;
    ec.gems = gems;
    ec.vault = vault;
    ec.wcTrack = wcTrack;
    ec.wcCommon = wcCommon;
    ec.wcUncommon = wcUncommon;
    ec.wcRare = wcRare;
    ec.wcMythic = wcMythic;
    ipc_send("set_economy", JSON.stringify(ec));
});

ipc.on('request_course', function (event, arg) {
    httpGetCourse(arg);
});

ipc.on('set_deck_mode', function (event, state) {
    overlayDeckMode = state;
    update_deck(true);
});

ipc.on('get_deck_changes', function (event, arg) {
    get_deck_changes(arg);
});

function rememberLogin(bool) {
    if (bool) {
        rstore.set("email", playerUsername);
        rstore.set("token", tokenAuth);
    }
    else {
        rstore.set("email", "");
        rstore.set("token", "");
    }
}

// Loads this player's configuration file
function loadPlayerConfig(playerId) {
    logLoopMode = 1;
    prevLogSize = 0;
    resetLogLoop(500);
	ipc_send("ipc_log", "Load player ID: "+playerId);
    store = new Store({
        configName: playerId,
        defaults: defaultCfg
    });

    // Preload config, if we use store.get turned out to be SLOOOW
    var entireConfig = store.get();
    history.matches = entireConfig['matches_index'];
    
    for (let i=0; i<history.matches.length; i++) {
        last_load = new Date();
        ipc_send("popup", {"text": "Reading history: "+i+" / "+history.matches.length, "time": 0});
        var id = history.matches[i];
        if (id != null) {
            var item = entireConfig[id];
            if (item != undefined) {
                history[id] = item;
                history[id].type = "match";
            }
        }
    }
    
    drafts.matches = store.get('draft_index');
    for (let i=0; i<drafts.matches.length; i++) {
        last_load = new Date();
        ipc_send("popup", {"text": "Reading drafts: "+i+" / "+drafts.matches.length, "time": 0});
        var id = drafts.matches[i];

        if (id != null) {
            var item = entireConfig[id];
            if (item != undefined) {
                history.matches.push(id);
                history[id] = item;
                history[id].type = "draft";
            }
        }
    }

    events.courses = store.get('courses_index');
    for (let i=0; i<events.courses.length; i++) {
        last_load = new Date();
        ipc_send("popup", {"text": "Reading events: "+i+" / "+events.courses.length, "time": 0});
        var id = events.courses[i];

        if (id != null) {
            var item = entireConfig[id];
            if (item != undefined) {
                events[id] = item;
                events[id].type = "Event";
            }
        }
    }

    economy.changes = store.get('economy_index');
    for (let i=0; i<economy.changes.length; i++) {
        last_load = new Date();
        ipc_send("popup", {"text": "Reading economy: "+i+" / "+economy.changes.length, "time": 0});
        var id = economy.changes[i];

        if (id != null) {
            var item = entireConfig[id];
            if (item != undefined) {
                economy[id] = item;
            }
        }
    }

    deck_changes_index = entireConfig["deck_changes_index"];
    deck_changes = entireConfig["deck_changes"];

    var obj = store.get('overlayBounds');
    ipc_send("overlay_set_bounds", obj);

    loadSettings();
    requestHistorySend(0);
}


// Updates the settings variables , sends to overlay if 'relay' is set
function updateSettings(_settings, relay) {
	//console.log(_settings);
    const exeName = path.basename(process.execPath);

    if (_settings.overlay_top   == undefined) _settings.overlay_top   = true;
    if (_settings.overlay_title == undefined) _settings.overlay_title = true;
    if (_settings.overlay_deck  == undefined) _settings.overlay_deck  = true;
    if (_settings.overlay_clock == undefined) _settings.overlay_clock = true;
    if (_settings.overlay_ontop == undefined) _settings.overlay_ontop = true;

    ipc_send("overlay_set_ontop", _settings.overlay_ontop);

    if (_settings.export_format == undefined) {
        _settings.export_format = "$Name,$Count,$Rarity,$SetName,$Collector";
    }

    if (_settings.show_overlay == false) {
    	ipc_send("overlay_close", 1);
    }
    else if (duringMatch || _settings.show_overlay_always) {
        ipc_send("overlay_show", 1);
    }
    
    if (relay) {
	    ipc_send("set_settings", _settings);
    }
}

//
function get_deck_changes(deckId) {
    // sends to renderer the selected deck's data
    var changes = [];
    deck_changes_index.forEach(function(changeId) {
        var change = deck_changes[changeId];
        if (change.deckId == deckId) {
            changes.push(change);
        }
    });
    
    ipc_send("set_deck_changes", JSON.stringify(changes));
}


// Read the log
// Set variables to default first
var prevLogSize = 0;
var logSize = 0;
var logDiff = 0;
var file;
var logLoopTimer = null;
var logLoopMode = 0;

if (process.platform === 'win32') {
    var logUri = process.env.APPDATA;
    logUri = logUri.replace('Roaming','LocalLow\\Wizards Of The Coast\\MTGA\\output_log.txt');
}
else {
    // Path for Wine, could change depending on installation method
    var logUri = process.env.HOME+'/.wine/drive_c/user/'+process.env.USER+'/AppData/LocalLow/Wizards of the Coast/MTGA/output_log.txt';
    // Fall back to using log file from the current directory if default logUri does not exist but one from CWD does.
    if (!fs.existsSync(logUri) && fs.existsSync('output_log.txt')) {
        logUri = 'output_log.txt';
    }
}
console.log(logUri);

resetLogLoop(100);

// Resets the log loop timeout to trigger in 'time' ms
function resetLogLoop(time) {
    if (logLoopTimer != null) {
        window.clearTimeout(logLoopTimer);
    }
    logLoopTimer = setTimeout(logLoop, time);
}

last_load = new Date();

// Basic logic for reading the log file
function logLoop() {
    //console.log("logLoop() start");
    //ipc_send("ipc_log", "logLoop() start");
    if (firstPass) {
        var now = new Date();
        var timeDiff = (now - last_load)/1000;
        ipc_send("ipc_log", timeDiff);
        if (timeDiff > 5) {
            ipc_send("too_slow", "");
        }
    }
    fs.open(logUri, 'r', function(err, fd) {
        file = fd;
        if (err) {
            ipc_send("no_log", logUri);
            ipc_send("popup", {"text": "No log file found.", "time": 1000});
            resetLogLoop(500);
        } else {
            try {
                readLog();
            }
            catch (e) {
                resetLogLoop(500);
            }
        }
    });
}

// Begin reading the log 
function readLog() {
	//console.log("readLog()");
    
    if (!firstPass)  {
        ipc_send("log_read", 1);
    }
    if (debugLog) {
        firstPass = false;
    }

    // If the renderer process is running, we can start reading
    if (renderer_state == 1) {
        var stats = fs.fstatSync(file);
        logSize = stats.size;
        logDiff = logSize - prevLogSize;
        if (logDiff > 268435440)  logDiff = 268435440;
        //ipc_send("ipc_log", "readLog logloopmode: "+logLoopMode+", renderer state:"+renderer_state+", logSize: "+logSize+", prevLogSize: "+prevLogSize);

        // Something went wrong obtaining the file size, try again later
        if (logSize == undefined) {
            fs.close(file);
            resetLogLoop(500);
        }
        else {
            // If the log was cleared, we default and start reading from position zero
            if (logSize < prevLogSize) {
                prevLogSize = 0;
                logDiff = logSize;
            }

            // If the log has changed since we last checked (or if this is the first time we read it)
            if (logSize > prevLogSize+1) {
                // We are looping only to get user data (processLogUser)
                if (logLoopMode == 0) {
                    fs.read(file, new Buffer(logDiff), 0, logDiff, prevLogSize, processLogUser);
                }
                // We are looking to read the whole log (processLog)
                else {
                    fs.read(file, new Buffer(logDiff), 0, logDiff, prevLogSize, processLog);
                }
            }
            else {
                fs.close(file);
                resetLogLoop(500);
            }
        }
    }
    // The renderer process is not ready, postpose reading the log
    else {
        //ipc_send("ipc_log", "readLog logloopmode: "+logLoopMode+", renderer state:"+renderer_state+", logSize: "+logSize+", prevLogSize: "+prevLogSize);
        fs.close(file);
        resetLogLoop(500);
    }
}

// We are reading the whole log
function processLog(err, bytecount, buff) {
    // rawstring contains the ENTIRE log as a single text
    let rawString = buff.toString('utf-8', 0, bytecount);
    // Increase position read
    //var splitString = rawString.split('[UnityCrossThread');

    // We split it into smaller chunks to read it 
    var splitString = rawString.split(/(\[UnityCrossThread|\[Client GRE\])+/);

    //console.log('Reading:', bytecount, 'bytes, ',splitString.length, ' chunks');
    //ipc_send("ipc_log", 'Reading: '+bytecount+' bytes, '+splitString.length+' chunks');

    prevLogSize+=bytecount;

    // If this is happening while the app is loading, tell the async series to finish loading at the end
    if (firstPass) {
        splitString.push("%END%");
    }

    // Also tell the async series to close the file
    splitString.push("%CLOSE%");

    async.forEachOfSeries(splitString, function (value, index, callback) {
        //ipc_send("ipc_log", "Async: ("+index+")");
        /*
        if (value.indexOf("") > -1) {
            console.log(value);
        }
        */

        // If this is the last chunk, end reading and exit loading screen
        if (value == "%END%") {
            finishLoading();
            ipc_send("popup", {"text": "100%", "time": 3000});
        }
        // Close the file (release priority)
        else if (value == "%CLOSE%") {
            fs.close(file);
        }
        // Process the chunks
        else {
            processLogData(value);
            if (firstPass) {
                last_load = new Date();
                ipc_send("popup", {"text": "Processing log: "+Math.round(100/splitString.length*index)+"%", "time": 0});
            }
            
            if (debugLog) {
                _time = new Date();
                while (new Date() - _time < debugLogSpeed) {}
            }            
        }

        callback();

    }, function (err) {
        //console.log("Async end");
        resetLogLoop(500);
        if (err) {
            console.log("processLog err: "+err.message);
        }
    });
}

// Process only the user data for initial loading (prior to log in)
// Same logic as processLog() but without the processLogData() function
function processLogUser(err, bytecount, buff) {
    // Process the log only to find player name and id
    let rawString = buff.toString('utf-8', 0, bytecount);
    var splitString = rawString.split('[UnityCrossThread');

    //console.log('Reading user:', bytecount, 'bytes, ',splitString.length, ' chunks');
    //ipc_send("ipc_log", 'Reading: '+bytecount+' bytes, '+splitString.length+' chunks');
    prevLogSize+=bytecount;

    if (firstPass) {
        splitString.push("%END%");
    }
    splitString.push("%CLOSE%");

    async.forEachOfSeries(splitString, function (value, index, callback) {
        //ipc_send("ipc_log", "Async: ("+index+")");
        if (value == "%END%") {
            if (playerName == null) {
                ipc_send("popup", {"text": "output_log contains no player data", "time": 0});
                resetLogLoop(500);
            }
        }
        else if (value == "%CLOSE%") {
            fs.close(file);
        }
        else {
            // Get player Id
            strCheck = '"PlayerId":"';
            if (value.indexOf(strCheck) > -1) {
                playerId = dataChop(value, strCheck, '"');
            }

            // Get User name
            strCheck = '"PlayerScreenName":"';
            if (value.indexOf(strCheck) > -1) {
                playerName = dataChop(value, strCheck, '"');
                ipc_send("init_login", playerName);
                ipc_send("ipc_log", 'Arena screen name: '+playerName);
            }

            // Get Client Version
            strCheck = '"ClientVersion":"';
            if (value.indexOf(strCheck) > -1) {
                arenaVersion = dataChop(value, strCheck, '"');
                ipc_send("ipc_log", 'Arena version: '+arenaVersion);
            }
            /*
            if (firstPass) {
                ipc_send("popup", {"text": "Reading: "+Math.round(100/splitString.length*index)+"%", "time": 1000});
            }
            */
        }
        callback();

    }, function (err) {
        if (err) {
            console.log("processLog err: "+err.message);
        }
    });

}

// Check if the string contains a JSON object, return it parsed as JS object
// If its not found, return false
function checkJson(str, check, chop) {
    if (str.indexOf(check) > -1) {
        try {
            str = dataChop(str, check, chop);
            str = findFirstJSON(str);
            return JSON.parse(str);
        } catch(e) {
            return false;
        }
    }
    return false;
}


// Cuts the string "data" between first ocurrences of the two selected words "startStr" and "endStr";
function dataChop(data, startStr, endStr) {
    var start = data.indexOf(startStr)+startStr.length;
    var end = data.length;
    data = data.substring(start, end);

    if (endStr != '') {
        var start = 0;
        var end = data.indexOf(endStr);
        data = data.substring(start, end);
    }

    return data;
}


// Cuts "str" if "check" exists, between "chop" and after "start", then returns the first JSON found.
// If "chop" is empty it will find the whole string, aka, from "check" and after "start" to end.
function checkJsonWithStart(str, check, chop, start) {
    if (str.indexOf(check) > -1) {
        try {
            str = dataChop(str, check, chop);
            str = dataChop(str, start, chop);
            str = findFirstJSON(str);
            return JSON.parse(str);
        } catch(e) {
            console.log(str);
            return false;
        }
    }
    return false;
}

// cuts "str" if "check" exists, between "chop" and after "start", then returns the JSON as a string
function checkJsonWithStartNoParse(str, check, chop, start) {
    if (str.indexOf(check) > -1) {
		str = dataChop(str, check, chop);
		str = dataChop(str, start, chop);
        str = findFirstJSON(str);
		return str;
    }
    return false;
}


// Finds the first JSON object inside "str", then returns it as a string
function findFirstJSON(str) {
    //str.replace("Logger]", "");
    var _br = 0;
    var _cu = 0;
    var endpos = 0;
    for (var i = 0, len = str.length; i < len; i++) {
        let c = str.charAt(i);
        if (c == '[')   _br++;
        else if (c == ']')   _br--;
        else if (c == '{')   _cu++;
        else if (c == '}')   _cu--;
        if (_br == 0 && _cu == 0 && i > 10) {
            endpos = i+1;
            break;
        }
    }

    //console.log("STR >> ", str);
    //console.log("ENDPOS >> ", endpos);
    //console.log("JSON >> ", str.slice(0, endpos));
    return str.slice(0, endpos);
}


/*

    unnecessarily long text to mark a point in the code that is fairly important because I cant remember the line number \^.^/

*/

// In testing
function client_to_gre(json) {
    const messages = require('./messages_pb');

    const msgType = json.clientToMatchServiceMessageType.split('_')[1],
    binaryMsg = new Buffer(json.payload, 'base64');

    try {
        let msgDeserialiser;
    if (msgType === 'ClientToGREMessage' || msgType === 'ClientToGREUIMessage') {
        msgDeserialiser = messages.ClientToGREMessage;
    } else if (msgType === 'ClientToMatchDoorConnectRequest') {
        msgDeserialiser = messages.ClientToMatchDoorConnectRequest;
    } else if (msgType === 'AuthenticateRequest') {
        msgDeserialiser = messages.AuthenticateRequest;
    } else if (msgType === 'CreateMatchGameRoomRequest') {
        msgDeserialiser = messages.CreateMatchGameRoomRequest;
    } else if (msgType === 'EchoRequest') {
        msgDeserialiser = messages.EchoRequest;
    } else {
        console.warn(`${msgType} - unknown message type`);
        return;
    }
    const msg = msgDeserialiser.deserializeBinary(binaryMsg);
    console.log(json.payload);
    console.log(msg.toObject());
    console.log("");
    } catch (e) {
        console.log(e.message);
    }
}

// Main function for processing log chunks
function processLogData(data) {
    data = data.replace(/[\r\n]/g, "");
    var strCheck, json;
    //console.log(data);

    /*

    Using a combination of the previous functions we can extract almost any data from the chunks extracted from the log
    In almost every case we are returned with a parsed JSON object, from there it depends on the data how we read it
    For example, to read all decks we need to locate '<== Deck.GetDeckLists(9)' inside the log;

[UnityCrossThreadLogger]11/1/2018 6:50:07 PM
<== Deck.GetDeckLists(9)
[
  {


    From here we know '<== Deck.GetDeckLists(' wont change, the date and the (9) after are variables, so we do;

        strCheck = '<== Deck.GetDeckLists(';
        json = checkJsonWithStart(data, strCheck, '', ')');

    We check if strCheck exists within this chunk, if it does we locate it and find a JSON object starting after ')'
    See below to how we handle the parsed json data

    */

    // Log info
    if (data.indexOf('==> Log.Info(') > -1) {
        if (data.indexOf('DuelScene.GameStop') > -1) {
            strCheck = '==> Log.Info(';
            json = checkJsonWithStart(data, strCheck, '', '):');
            if (json != false) {
                if (json.params.messageName == 'DuelScene.GameStop') {
                    var mid = json.params.payloadObject.matchId;
                    var time = json.params.payloadObject.secondsCount;
                    if (mid == currentMatchId) {
                        currentMatchTime = time;
                        saveMatch();
                    }
                }
                return;
            }
        }
        else {
            return;
        }
    }

    // Gre to Client Event
    // Gre to Client contains most data about in-progress games.
    strCheck = 'GreToClientEvent';
    json = checkJson(data, strCheck, '');
    if (json != false) {
        gre_to_client(json.greToClientEvent.greToClientMessages);
        return;
    }

    // Gre to Client Event
    // Obsolete now packets are decoded by the logger
    //strCheck = 'ClientToMatchServiceMessageType';
    //if (data.indexOf(strCheck) > -1) {
    //    let rawJson = data.substr(data.indexOf('{')).trim();
    //    if (rawJson.slice(-1) !== '}') rawJson = rawJson.replace(/}[^}]*/, '}');
        //client_to_gre(JSON.parse(rawJson));
    //    return;
    //}
    
    strCheck = 'ClientToMatchServiceMessageType_ClientToGREMessage';
    json = checkJson(data, strCheck, '');
    if (json != false) {
        if (json.payload.type !== undefined) {
            // Get sideboard changes
            if (json.payload.type == "ClientMessageType_SubmitDeckResp") {

                var tempMain = {};
                var tempSide = {};
                json.payload.submitDeckResp.deck.deckCards.forEach( function (grpId) {
                    if (tempMain[grpId] == undefined) {
                        tempMain[grpId] = 1
                    }
                    else {
                        tempMain[grpId] += 1;
                    }
                });
                if (json.payload.submitDeckResp.deck.sideboardCards !== undefined) {
                    json.payload.submitDeckResp.deck.sideboardCards.forEach( function (grpId) {
                        if (tempSide[grpId] == undefined) {
                            tempSide[grpId] = 1
                        }
                        else {
                            tempSide[grpId] += 1;
                        }
                    });
                }

                // Update on overlay
                var str = JSON.stringify(currentDeck);
                currentDeckUpdated = JSON.parse(str);
                ipc_send("set_deck", currentDeck);

                currentDeck.mainDeck = [];
                Object.keys(tempMain).forEach(function(key) {
                    var c = {"id": key, "quantity": tempMain[key]};
                    currentDeck.mainDeck.push(c);
                });

                currentDeck.sideboard = [];
                if (json.payload.submitDeckResp.deck.sideboardCards !== undefined) {
                    Object.keys(tempSide).forEach(function(key) {
                        var c = {"id": key, "quantity": tempSide[key]};
                        currentDeck.sideboard.push(c);
                    });
                }

                select_deck(currentDeck);
                //console.log(JSON.stringify(currentDeck));
                //console.log(currentDeck);
            }
        }
        return;
    }

    // Get courses
    strCheck = '<== Event.GetPlayerCourse(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        strCheck = 'Logger]';
        if (data.indexOf(strCheck) > -1) {
            var str = dataChop(data, strCheck, 'M')+'M';
            var logTime = parseWotcTime(str);
            json.date = logTime;
        }

        if (json.Id != "00000000-0000-0000-0000-000000000000") {
            json._id = json.Id;
            delete json.Id;

            select_deck(json);
            if (json.CourseDeck != null) {
                json.CourseDeck.colors = get_deck_colors(json.CourseDeck);
                console.log(json.CourseDeck, json.CourseDeck.colors)
                httpSubmitCourse(json);
                saveCourse(json);
            }
        }
        return;
    }

    // Get player Id
    strCheck = '"PlayerId":"';
    if (data.indexOf(strCheck) > -1) {
        playerId = dataChop(data, strCheck, '"');
    }

    // Get Client Version
    strCheck = '"ClientVersion":"';
    if (data.indexOf(strCheck) > -1) {
        arenaVersion = dataChop(data, strCheck, '"');
    }

    // Get User name
    strCheck = '"PlayerScreenName":"';
    if (data.indexOf(strCheck) > -1) {
        playerName = dataChop(data, strCheck, '"');
        ipc_send("set_username", playerName);
        return;
    }

    /*
    // Use this to get precon decklists
    strCheck = '<== Deck.GetPreconDecks(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        var str = "";
        var newline = '\n';
        json.forEach(function(_deck) {
            str += "**"_deck.name.replace("?=?Loc/Decks/Precon/", "")+newline;
            _deck.mainDeck.forEach(function(_card) {
                str += _card.quantity+" "+cardsDb.get(_card.id).name+newline;
            });
            str += newline+newline;
        });
        console.log(str);
        return;
    }
    */

    // Get Ranks
    strCheck = '<== Event.GetCombinedRankInfo(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
		playerRank = json.constructedClass;
		playerTier = json.constructedTier;

        let rank = get_rank_index(playerRank, playerTier);

        ipc_send("set_rank", {rank: rank, str: playerRank+" "+playerTier});
        return;
    }

    // Get Decks
    strCheck = '<== Deck.GetDeckLists(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        decks = json;
        requestHistorySend(0);
        ipc_send("set_decks", JSON.stringify(json));
        return;
    }

    // Get deck updated
    strCheck = '<== Deck.UpdateDeck(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        //
        strCheck = 'Logger]';
        if (data.indexOf(strCheck) > -1) {
            var str = dataChop(data, strCheck, 'M')+'M';
            var logTime = parseWotcTime(str);
        }

        decks.forEach(function(_deck, index) {
            if (_deck.id == json.id) {
                var changeId = sha1(_deck.id+"-"+logTime);
                var deltaDeck = {id: changeId, deckId: _deck.id, date: logTime, changesMain: [], changesSide: [], previousMain: _deck.mainDeck, previousSide: _deck.sideboard};

                // Check Mainboard
                _deck.mainDeck.forEach(function(card) {
                    var cardObj = cardsDb.get(card.id);

                    var diff = 0 - card.quantity;
                    json.mainDeck.forEach(function(cardB) {
                        var cardObjB = cardsDb.get(cardB.id);
                        if (cardObj.name == cardObjB.name) {
                            cardB.existed = true;
                            diff = cardB.quantity - card.quantity;
                        }
                    });

                    if (diff !== 0) {
                        deltaDeck.changesMain.push({id: card.id, quantity: diff});
                    }
                });

                json.mainDeck.forEach(function(card) {
                    if (card.existed == undefined) {
                        let cardObj = cardsDb.get(card.id);
                        deltaDeck.changesMain.push({id: card.id, quantity: card.quantity});
                    }
                });
                // Check sideboard
                _deck.sideboard.forEach(function(card) {
                    var cardObj = cardsDb.get(card.id);

                    var diff = 0 - card.quantity;
                    json.sideboard.forEach(function(cardB) {
                        var cardObjB = cardsDb.get(cardB.id);
                        if (cardObj.name == cardObjB.name) {
                            cardB.existed = true;
                            diff = cardB.quantity - card.quantity;
                        }
                    });

                    if (diff !== 0) {
                        deltaDeck.changesSide.push({id: card.id, quantity: diff});
                    }
                });

                json.sideboard.forEach(function(card) {
                    if (card.existed == undefined) {
                        let cardObj = cardsDb.get(card.id);
                        deltaDeck.changesSide.push({id: card.id, quantity: card.quantity});
                    }
                });

                if (!deck_changes_index.includes(changeId)) {
                    deck_changes_index.push(changeId);
                    deck_changes[changeId] = deltaDeck;

                    store.set("deck_changes_index", deck_changes_index);
                    store.set("deck_changes."+changeId, deltaDeck);
                }
            }
        });

        return;
    }

    // Get inventory changes
    strCheck = 'Incoming Inventory.Updated';
    json = checkJson(data, strCheck, '');
    if (json != false) {
        strCheck = 'Logger]';
        if (data.indexOf(strCheck) > -1) {
            var str = dataChop(data, strCheck, 'M')+'M';
            var logTime = parseWotcTime(str);
        }
        json.date = logTime;
        
        if (json.delta.boosterDelta.length == 0)        delete json.delta.boosterDelta;
        if (json.delta.cardsAdded.length == 0)          delete json.delta.cardsAdded;
        if (json.delta.decksAdded.length == 0)          delete json.delta.decksAdded;
        if (json.delta.vanityItemsAdded.length == 0)    delete json.delta.vanityItemsAdded;
        if (json.delta.vanityItemsRemoved.length == 0)  delete json.delta.vanityItemsRemoved;

        if (json.delta.gemsDelta == 0)           delete json.delta.gemsDelta;
        if (json.delta.draftTokensDelta == 0)    delete json.delta.draftTokensDelta;
        if (json.delta.goldDelta == 0)           delete json.delta.goldDelta;
        if (json.delta.sealedTokensDelta == 0)   delete json.delta.sealedTokensDelta;
        if (json.delta.vaultProgressDelta == 0)  delete json.delta.vaultProgressDelta;
        if (json.delta.wcCommonDelta == 0)       delete json.delta.wcCommonDelta;
        if (json.delta.wcMythicDelta == 0)       delete json.delta.wcMythicDelta;
        if (json.delta.wcRareDelta == 0)         delete json.delta.wcRareDelta;
        if (json.delta.wcUncommonDelta == 0)     delete json.delta.wcUncommonDelta;

        saveEconomy(json);
        return;
    }

    // Get inventory
    strCheck = '<== PlayerInventory.GetPlayerInventory(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        //This checks time, use with caution!
        strCheck = 'Logger]';
        if (data.indexOf(strCheck) > -1) {
            var str = dataChop(data, strCheck, 'M')+'M';
            var logTime = parseWotcTime(str);
        }

        gold = json.gold;
        gems = json.gems;
        vault = json.vaultProgress;
        wcTrack = json.wcTrackPosition;
        wcCommon = json.wcCommon;
        wcUncommon = json.wcUncommon;
        wcRare = json.wcRare;
        wcMythic = json.wcMythic;

        return;
    }

    // Get Cards
    strCheck = '<== PlayerInventory.GetPlayerCardsV3(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        var date = new Date(store.get('cards.cards_time'));
        var now = new Date();
        var diff = Math.abs(now.getTime() - date.getTime());
        var days = Math.floor(diff / (1000 * 3600 * 24));

        if (store.get('cards.cards_time') == 0) {
            store.set('cards.cards_time', now);
            store.set('cards.cards_before', json);
            store.set('cards.cards', json);
        }
        // If a day has passed since last update
        else if (days > 0) {
            var cardsPrev = store.get('cards.cards');
            store.set('cards.cards_time', now);
            store.set('cards.cards_before', cardsPrev);
            store.set('cards.cards', json);
        }

        var cardsPrevious = store.get('cards.cards_before');
        var cardsNewlyAdded = {};

        Object.keys(json).forEach(function(key) {
            // get differences
            if (cardsPrevious[key] == undefined) {
                cardsNewlyAdded[key] = json[key];
            }
            else if (cardsPrevious[key] < json[key]) {
                cardsNewlyAdded[key] = json[key] - cardsPrevious[key];
            }
        });

        ipc_send("set_cards", {cards: json, new: cardsNewlyAdded});
        return;
    }

    // Select deck
    strCheck = '<== Event.DeckSubmit(';
	json = checkJsonWithStart(data, strCheck, '', ')');
	if (json != false) {
        select_deck(json);
        return;
    }

    // Match created
    strCheck = ' Event.MatchCreated ';
    json = checkJson(data, strCheck, '');
    if (json != false) {
        strCheck = 'Logger]';
        if (data.indexOf(strCheck) > -1) {
            var logTime = dataChop(data, strCheck, ' (');
            matchBeginTime = parseWotcTime(logTime);
            ipc_send("ipc_log", "MATCH CREATED: "+logTime);
        }
        if (json.eventId != "NPE") {
            createMatch(json);
        }
        return;
    }

    // Direct Challenge
    strCheck = '==> DirectGame.Challenge(';
    json = checkJsonWithStart(data, strCheck, '', '):');
    if (json != false) {
        var deck = json.params.deck;
        
        deck = replaceAll(deck, '"Id"', '"id"');
        deck = replaceAll(deck, '"Quantity"', '"quantity"');
        deck = JSON.parse(deck);
        select_deck(deck);

        return;
    }

    // Draft status / draft start
    /*
    strCheck = '<== Event.Draft(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        console.log("Draft start");
        draftId = json.Id;
        return;
    }
    */

    //   
    strCheck = '<== Draft.DraftStatus(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        if (json.eventName != undefined) {
            for (var set in setsList) {
                var setCode = setsList[set]["code"];
                if (json.eventName.indexOf(setCode) !== -1) {
                    draftSet = set;
                }
            }
        }

        if (currentDraft == undefined || (json.packNumber == 0 && json.pickNumber <= 0)) {
            createDraft();
        }
        setDraftCards(json);
        currentDraftPack = json.draftPack.slice(0);
        return;
    }

    // make pick (get the whole action)
    strCheck = '<== Draft.MakePick(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        // store pack in recording
        if (json.eventName != undefined) {
            for (var set in setsList) {
                var setCode = setsList[set]["code"];
                if (json.eventName.indexOf(setCode) !== -1) {
                    draftSet = set;
                }
            }
        }

        if (json.draftPack != undefined) {
            if (currentDraft == undefined) {
                createDraft();
            }
            setDraftCards(json);
            currentDraftPack = json.draftPack.slice(0);
        }
        return;
    }

    // make pick (get just what we picked)
    strCheck = '==> Draft.MakePick(';
    json = checkJsonWithStart(data, strCheck, '', '):');
    if (json != false) {
        // store pick in recording
        var value = {};
        value.pick = json.params.cardId;
        value.pack = currentDraftPack;
        var key = "pack_"+json.params.packNumber+"pick_"+json.params.pickNumber;
        currentDraft[key] = value;
        debugLogSpeed = 200;
        return;
    }

    //end draft
    strCheck = '<== Event.CompleteDraft(';
    json = checkJsonWithStart(data, strCheck, '', ')');
    if (json != false) {
        ipc_send("save_overlay_pos", 1);
        clear_deck();
        if (!store.get('settings.show_overlay_always')) {
	        ipc_send("overlay_close", 1);
        }
        //ipc_send("renderer_show", 1);

        draftId = json.Id;
        console.log("Complete draft", json);
        saveDraft();
        return;
    }

    // Game Room State Changed
    strCheck = 'MatchGameRoomStateChangedEvent';
	json = checkJson(data, strCheck, '');
	if (json != false) {
        json = json.matchGameRoomStateChangedEvent.gameRoomInfo;

        if (json.gameRoomConfig != undefined) {
            currentMatchId = json.gameRoomConfig.matchId;
            eventId = json.gameRoomConfig.eventId;
            duringMatch = true;
        }

        if (json.stateType == "MatchGameRoomStateType_MatchCompleted" && eventId != "NPE") {
            playerWin = 0;
            oppWin = 0;
        	json.finalMatchResult.resultList.forEach(function(res) {
        		if (res.scope == "MatchScope_Game") {
            		if (res.winningTeamId == playerSeat) {
                        playerWin += 1;
            		}
            		if (res.winningTeamId == oppSeat) {
            			oppWin += 1;
            		}
            	}
                if (res.scope == "MatchScope_Match") {
                    duringMatch = false;
                }
        	});

            ipc_send("save_overlay_pos", 1);
            clear_deck();
            if (!store.get('settings.show_overlay_always')) {
            	ipc_send("overlay_close", 1);
            }
        	//ipc_send("renderer_show", 1);
            //saveMatch();
        }

        if (json.players != undefined) {
            json.players.forEach(function(player) {
                if (player.userId == playerId) {
                    playerSeat = player.systemSeatId;
                }
                else {
                	oppId = player.userId;
                	oppSeat = player.systemSeatId;
                }
            });
        }
        return;
    }
}


function setDraftCards(json) {
    ipc.send("set_draft_cards", json.draftPack, json.pickedCards, json.packNumber+1, json.pickNumber);
}

function actionLogGenerateLink(grpId) {
    var card = cardsDb.get(grpId);
    return '<a class="card_link click-on" href="'+grpId+'">'+card.name+'</a>';
}


var currentActionLog = "";

// Send action log data to overlay
function actionLog(seat, time, str, grpId = 0) {
    if (seat == -99) {
        currentActionLog = "";
    }
    else {
        var hh = ("0"+time.getHours()).slice(-2);
        var mm = ("0"+time.getMinutes()).slice(-2);
        var ss = ("0"+time.getSeconds()).slice(-2);
        currentActionLog += hh+':'+mm+':'+ss+' '+stripTags(str)+'\r\n';

        try { fs.writeFileSync(path.join(actionLogDir, currentMatchId+'.txt'), currentActionLog, 'utf-8'); }
        catch(e) {}
    }

    ipc_send("action_log", {seat: seat, time:time, str: str, grpId: grpId});

}

var attackersDetected = [];
var zoneTransfers = [];


// Process zone transfers
// Sometimes GreToClient sends data about transfers when they havent been reported elsewhere
// Here we check if the object ID the transfer refers to exists in the main objects array and process it if it does
function tryZoneTransfers() {
    zoneTransfers.forEach(function(obj) {
        var _orig, _new, _src, _dest, _cat = undefined;
        var cname = "";
        var grpid = 0;
        var removeFromListAnyway = false;
        var removeFromList = true;

        var owner = -1;
        try {
            owner = gameObjs[obj.affectorId].controllerSeatId;
        } catch (e) {
            try {
                owner = gameObjs[obj.aff].controllerSeatId;
            } catch (e) {
                owner = oppSeat;
            }
        }

        obj.details.forEach(function(detail) {
            if (detail.key == "zone_src") {
                _src = detail.valueInt32[0];
            }
            if (detail.key == "zone_dest") {
                _dest = detail.valueInt32[0];
            }
            if (detail.key == "category") {
                _cat = detail.valueString[0];
            }
        });

        // If the transfer is already in the gameObjs array..
        try {
            cname = gameObjs[obj.aff].name;
            grpid = gameObjs[obj.aff].grpId;
        } catch (e) {
            removeFromList = false;
        }

        // Try processing it
        try {
            //console.log("AnnotationType_ZoneTransfer", obj, obj.aff, gameObjs, _src, _dest, _cat);
            if (_cat == "CastSpell") {
                actionLog(owner, obj.time, getNameBySeat(owner)+" casted "+actionLogGenerateLink(grpid));
            }
            else if (_cat == "Resolve") {
                actionLog(owner, obj.time, getNameBySeat(owner)+" resolved "+actionLogGenerateLink(grpid));
            }
            else if (_cat == "PlayLand") {
                actionLog(owner, obj.time, getNameBySeat(owner)+" played "+actionLogGenerateLink(grpid));
            }
            else if (_cat == "Countered") {
                var affectorGrpid = gameObjs[obj.affectorId].grpId;
                if (affectorGrpid == undefined) {
                    removeFromList = false;
                }
                else {
                    actionLog(owner, obj.time, actionLogGenerateLink(affectorGrpid)+" countered "+actionLogGenerateLink(grpid));
                }
            }
            else if (_cat == "Destroy") {
                var affectorGrpid = gameObjs[obj.affectorId].grpId;
                if (affectorGrpid == undefined) {
                    removeFromList = false;
                }
                else {
                    actionLog(owner, obj.time, actionLogGenerateLink(affectorGrpid)+" destroyed "+actionLogGenerateLink(grpid));
                }
            }
            else if (_cat == "Draw") {
                actionLog(owner, obj.time, getNameBySeat(owner)+" drew a card");
                removeFromListAnyway = true;
            }
            else if (cname != "") {
                actionLog(owner, obj.time, actionLogGenerateLink(grpid)+" moved to "+zones[_dest].type);
            }
            gameObjs[obj.aff].zoneId = _dest;
            gameObjs[obj.aff].zoneName = zones[_dest].type;
        }
        catch (e) {
            removeFromList = false;
        }

        if (removeFromList || removeFromListAnyway) {
            obj.remove = true;
        }
    })
    if (zoneTransfers.length > 0) {
        zoneTransfers = zoneTransfers.filter(obj => obj.remove == false);
    }
}


function gre_to_client(data) {
    data.forEach(function(msg) {
        //console.log("Message: "+msg.msgId, msg);
        // Sometimes Gre messages have many bulked messages at once
        // Process each individually

        // Nothing here..
        if (msg.type == "GREMessageType_SubmitDeckReq") {
            gameObjs = {};
        }

        // Declare attackers message
        if (msg.type == "GREMessageType_DeclareAttackersReq") {
            msg.declareAttackersReq.attackers.forEach(function(obj) {
                var att = obj.attackerInstanceId;
                if (!attackersDetected.includes(att)) {
                    if (gameObjs[att] != undefined) {
                        var str = actionLogGenerateLink(gameObjs[att].grpId)+" attacked ";
                        if (obj.selectedDamageRecipient !== undefined) {
                            var rec = obj.selectedDamageRecipient;
                            if (rec.type == "DamageRecType_Player") {
                                actionLog(gameObjs[att].controllerSeatId, new Date(), str+getNameBySeat(rec.playerSystemSeatId));
                                //ipc_send("", str+getNameBySeat(rec.playerSystemSeatId));
                            }
                        }
                        if (obj.legalDamageRecipients !== undefined) {
                            var rec = obj.legalDamageRecipients.forEach(function(rec) {
                                if (rec.type == "DamageRecType_Player") {
                                    actionLog(gameObjs[att].controllerSeatId, new Date(), str+getNameBySeat(rec.playerSystemSeatId));
                                   //ipc_send("ipc_log", str+getNameBySeat(rec.playerSystemSeatId));
                                }
                            });
                        }
                        attackersDetected.push(att);
                    }
                }
            });
        }

        // An update about the game state, can either be;
        // - A change (diff)
        // - The entire board state (full)
        // - binary (we dont check that one)
        if (msg.type == "GREMessageType_GameStateMessage") {
            if (msg.gameStateMessage.type == "GameStateType_Full") {
                // For the full board state we only update the zones
                // We DO NOT update gameObjs array here, this is because sometimes cards become invisible for us
                // and updating the entire gameobjs array to what the server says we should be looking at will remove those from our view
                // This includes also cards and actions we STILL havent processed!

                if (msg.gameStateMessage.zones != undefined) {
                    msg.gameStateMessage.zones.forEach(function(zone) {
                        zones[zone.zoneId] = zone;
                    });
                }
            }
            else if (msg.gameStateMessage.type == "GameStateType_Diff") {
                // Most game updates happen here
                // Sometimes, especially with annotations, stuff gets sent to us repeatedly
                // Like if we recieve an object moved from zone A to B , we may recieve the same message many times
                // So we should be careful reading stuff as it may:
                // - not be unique
                // - reference changes we still havent recieved
                // - reference objects that may be deleted

                if (msg.gameStateMessage.turnInfo != undefined) {
                    prevTurn = turnNumber;
                    turnPhase = msg.gameStateMessage.turnInfo.phase;
                    turnStep  = msg.gameStateMessage.turnInfo.step;
                    turnNumber = msg.gameStateMessage.turnInfo.turnNumber;
                    turnActive = msg.gameStateMessage.turnInfo.activePlayer;
                    turnPriority = msg.gameStateMessage.turnInfo.priorityPlayer;
                    turnDecision = msg.gameStateMessage.turnInfo.decisionPlayer;
                    turnStorm = msg.gameStateMessage.turnInfo.stormCount;

                    if (prevTurn !== turnNumber && turnNumber != undefined) {
                        attackersDetected = [];
                        actionLog(-1, new Date(),  getNameBySeat(turnActive)+"'s turn begin. (#"+turnNumber+")");
                        //ipc_send("ipc_log", playerName+"'s turn begin. (#"+turnNumber+")");
                    }
                    if (!firstPass) {
                        ipc.send("set_turn", playerSeat, turnPhase, turnStep, turnNumber, turnActive, turnPriority, turnDecision);
                    }
                }

                if (msg.gameStateMessage.gameInfo != undefined) {
                    if (msg.gameStateMessage.gameInfo.matchState == "MatchState_GameComplete") {
                        let results = msg.gameStateMessage.gameInfo.results;
                        matchWincon = msg.gameStateMessage.gameInfo.matchWinCondition;
                        playerWin = 0;
                        oppWin = 0;
                        results.forEach(function(res) {
                            if (res.scope == "MatchScope_Game") {
                                actionLog(res.winningTeamId, new Date(), '');
                                actionLog(-1, new Date(), getNameBySeat(res.winningTeamId)+' Wins!');
                                if (res.winningTeamId == playerSeat) {
                                    playerWin += 1;
                                }
                                if (res.winningTeamId == oppSeat) {
                                    oppWin += 1;
                                }
                            }
                            if (res.scope == "MatchScope_Match") {
                                duringMatch = false;
                            }
                        });
                    }
                    if (msg.gameStateMessage.gameInfo.matchState == "MatchState_MatchComplete") {
                    	ipc_send("save_overlay_pos", 1);
                        clear_deck();
                        if (!store.get('settings.show_overlay_always')) {
                            ipc_send("overlay_close", 1);
                        }

                        saveMatch();
                    }
                }

                if (msg.gameStateMessage.annotations != undefined) {
                    msg.gameStateMessage.annotations.forEach(function(obj) {
                        let affector = obj.affectorId;
                        let affected = obj.affectedIds;

                        if (affected != undefined) {
                            affected.forEach(function(aff) {
                                // An object ID changed, create new object and move it
                                if (obj.type.includes("AnnotationType_ObjectIdChanged")) {
                                    var _orig = undefined;
                                    var _new = undefined;
                                    obj.details.forEach(function(detail) {
                                        if (detail.key == "orig_id") {
                                            _orig = detail.valueInt32[0];
                                        }
                                        if (detail.key == "new_id") {
                                            _new = detail.valueInt32[0];
                                        }
                                    });

                                    if (_orig == undefined || _new == undefined) {
                                        console.log("undefined value: ", obj)
                                    }
                                    else if (gameObjs[_orig] != undefined) {
                                        //console.log("AnnotationType_ObjectIdChanged", aff, _orig, _new, gameObjs[_orig], gameObjs);
                                        gameObjs[_new] = JSON.parse(JSON.stringify(gameObjs[_orig]));
                                        gameObjs[_orig] = undefined;
                                    }
                                }

                                // An object changed zone, here we only update the gameobjs array
                                if (obj.type.includes("AnnotationType_EnteredZoneThisTurn")) {
                                    if (gameObjs[aff] !== undefined) {
                                        //console.log("AnnotationType_EnteredZoneThisTurn", aff, affector, gameObjs[aff], zones[affector], gameObjs);
                                        gameObjs[aff].zoneId = affector;
                                        gameObjs[aff].zoneName = zones[affector].type;
                                    }
                                }

                                if (obj.type.includes("AnnotationType_ResolutionStart")) {
                                    var grpid = undefined;
                                    obj.details.forEach(function(detail) {
                                        if (detail.key == "grpid") {
                                            grpid = detail.valueInt32[0];
                                        }
                                    });
                                    if (grpid != undefined) {
                                        card = cardsDb.get(grpid);
                                        var aff = obj.affectorId;
                                        var pn = oppName;
                                        if (gameObjs[aff] != undefined) {
                                            // We ooly check for abilities here, since cards and spells are better processed with "AnnotationType_ZoneTransfer"
                                            if (gameObjs[aff].type == "GameObjectType_Ability") {
                                                var src = gameObjs[aff].objectSourceGrpId;
                                                var abId = gameObjs[aff].grpId;
                                                var ab = cardsDb.getAbility(abId);
                                                var cname = "";
                                                try {
                                                    ab = replaceAll(ab, "CARDNAME", cardsDb.get(src).name);
                                                }
                                                catch (e) {}
                                        
                                                actionLog(gameObjs[aff].controllerSeatId, new Date(), actionLogGenerateLink(src)+'\'s <a class="card_ability click-on" title="'+ab+'">ability</a>');
                                                //ipc_send("ipc_log", cardsDb.get(src).name+"'s ability");
                                                //console.log(cardsDb.get(src).name+"'s ability", gameObjs[aff]);
                                            }
                                            else {
                                                //actionLog(gameObjs[aff].controllerSeatId, new Date(), getNameBySeat(gameObjs[aff].controllerSeatId)+" cast "+card.name);
                                                //ipc_send("ipc_log", gameObjs[aff].controllerSeatId+" cast "+card.name);
                                                //console.log(getNameBySeat(gameObjs[aff].controllerSeatId)+" cast "+card.name, gameObjs[aff]);
                                            }
                                        }
                                    }
                                }

                                /*
                                // Life total changed, see below (msg.gameStateMessage.players) 
                                // Not optimal, this triggers too many times
                                if (obj.type.includes("AnnotationType_ModifiedLife")) {
                                    obj.details.forEach(function(detail) {
                                        if (detail.key == "life") {
                                            var change = detail.valueInt32[0];
                                            if (change < 0) {
                                                actionLog(aff, new Date(), getNameBySeat(aff)+' lost '+Math.abs(change)+' life');
                                            }
                                            else {
                                                actionLog(aff, new Date(), getNameBySeat(aff)+' gained '+Math.abs(change)+' life');
                                            }
                                        }
                                    });
                                }
                                */

                                // Something moved between zones
                                // This requires some "async" work, as data referenced by annotations sometimes has future data
                                // That is , data we have already recieved and still havent processed (particularly, game objects)
                                if (obj.type.includes("AnnotationType_ZoneTransfer")) {
                                    obj.remove = false;
                                    obj.aff = aff;
                                    obj.time = new Date();
                                    zoneTransfers.push(obj);
                                }

                                if (obj.type.includes("AnnotationType_DamageDealt")) {
                                    var aff = obj.affectorId;
                                    var affected = obj.affectedIds;
                                    var damage = 0;
                                    obj.details.forEach(function(detail) {
                                        if (detail.key == "damage") {
                                            damage = detail.valueInt32[0];
                                        }
                                    });

                                    affected.forEach(function(affd) {
                                        if (gameObjs[aff] !== undefined) {
                                            try {
                                                if (affd == playerSeat || affd == oppSeat) {
                                                    actionLog(gameObjs[aff].controllerSeatId, new Date(), actionLogGenerateLink(gameObjs[aff].grpId)+" dealt "+damage+" damage to "+getNameBySeat(affd));
                                                    //ipc_send("ipc_log", gameObjs[aff].name+" dealt "+damage+" damage to "+getNameBySeat(affd));
                                                }
                                                else {
                                                    actionLog(gameObjs[aff].controllerSeatId, new Date(), actionLogGenerateLink(gameObjs[aff].grpId)+" dealt "+damage+" damage to "+actionLogGenerateLink(gameObjs[affd].grpId));
                                                    //ipc_send("ipc_log", gameObjs[aff].name+" dealt "+damage+" damage to "+gameObjs[affd]);
                                                }
                                            }
                                            catch (e) {

                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }

                // Update the zones
                // Each zone has every object ID that lives inside that zone
                // Sometimes object IDs we dont have any data from are here
                // So, for example, a card in the opp library HAS an ID in its zone, but we just dont have any data about it
                if (msg.gameStateMessage.zones != undefined) {
                    //ipc_send("ipc_log", "Zones updated");
                    msg.gameStateMessage.zones.forEach(function(zone) {
                        zones[zone.zoneId] = zone;
                        if (zone.objectInstanceIds != undefined) {
                            zone.objectInstanceIds.forEach(function(objId) {
                                if (gameObjs[objId] != undefined) {
                                    gameObjs[objId].zoneId = zone.zoneId;
                                    gameObjs[objId].zoneName = zone.type;
                                }
                            });
                        }
                    });
                }

                // Update the game objects
                if (msg.gameStateMessage.gameObjects != undefined) {
                    msg.gameStateMessage.gameObjects.forEach(function(obj) {
                        name = cardsDb.get(obj.grpId).name;
                        if (name) {
                            obj.name = name;
                        }

                        // This should be a delayed check
                        try {
                            obj.zoneName = zones[obj.zoneId].type;
                            gameObjs[obj.instanceId] = obj;
                        }
                        catch (e) {}

                        //ipc_send("ipc_log", "Message: "+msg.msgId+" > ("+obj.instanceId+") created at "+zones[obj.zoneId].type);
                    });
                }
                
                // An object has been deleted
                // Removing this caused some objects to end up duplicated , unfortunately
                if (msg.gameStateMessage.diffDeletedInstanceIds != undefined) {
                    msg.gameStateMessage.diffDeletedInstanceIds.forEach(function(obj) {
                        gameObjs[obj] = undefined;
                    });
                }

                // Players data update
                // We only read life totals at the moment, but we also get timers and such
                if (msg.gameStateMessage.players != undefined) {
                    msg.gameStateMessage.players.forEach(function(obj) {
                        var sign = '';
                        if (playerSeat == obj.controllerSeatId) {
                            var diff = obj.lifeTotal - playerLife;
                            if (diff > 0) sign = '+'

                            if (diff != 0) {
                                actionLog(obj.controllerSeatId, new Date(), getNameBySeat(obj.controllerSeatId)+'\'s life changed to '+obj.lifeTotal+' ('+sign+diff+")");
                            }
                            
                            playerLife = obj.lifeTotal;
                        }
                        else {
                            var diff = obj.lifeTotal - opponentLife;
                            if (diff > 0) sign = '+';
                            if (diff != 0) {
                                actionLog(obj.controllerSeatId, new Date(), getNameBySeat(obj.controllerSeatId)+'\'s life changed to '+obj.lifeTotal+' ('+sign+diff+")");
                            }

                            opponentLife = obj.lifeTotal;
                        }
                    });
                }
            }
        }
        //
    });
    tryZoneTransfers();

    var str = JSON.stringify(currentDeck);
    currentDeckUpdated = JSON.parse(str);
    forceDeckUpdate();
    update_deck(false);
}

// Get player name by seat in the game
function getNameBySeat(seat) {
    try {
        if (seat == playerSeat) {
            return playerName.slice(0, -6);
        }
        else {
            return oppName.slice(0, -6);
        }
    }
    catch (e) {
        return "???";
    }
}

//
function createMatch(arg) {
    actionLog(-99, new Date(), "");
    var obj = store.get('overlayBounds');

    annotationsRead = [];
    zones = {};
    gameObjs = {};
    attackersDetected = [];
    zoneTransfers = [];
    
    oppDeck = {mainDeck: [], sideboard: []};

    if (!firstPass && store.get("settings").show_overlay == true) {
        if (store.get("settings").close_on_match) {
            ipc_send("renderer_hide", 1);
        }
        ipc_send("overlay_show", 1);
        ipc_send("overlay_set_bounds", obj);
    }
    playerLife = 20;
    opponentLife = 20;
    oppName = arg.opponentScreenName;
    oppRank = arg.opponentRankingClass;
    oppTier = arg.opponentRankingTier;
    currentEventId = arg.eventId;
    currentMatchId = null;
    currentMatchTime = 0;
    playerWin = 0;
    oppWin = 0;

    ipc_send("ipc_log", "vs "+oppName);
    ipc_send("set_timer", matchBeginTime);
    ipc_send("set_opponent", oppName);
    ipc_send("set_opponent_rank", get_rank_index(oppRank, oppTier), oppRank+" "+oppTier);
}

//
function createDraft() {
    actionLog(-99, new Date(), "");
    var obj = store.get('overlayBounds');
    annotationsRead = [];
    zones = {};
    gameObjs = {};

    if (!firstPass && store.get("settings").show_overlay == true) {
        if (store.get("settings").close_on_match) {
            ipc_send("renderer_hide", 1);
        }

        ipc_send("overlay_show", 1);
        ipc_send("overlay_set_bounds", obj);
    }

    currentDraft = {};

    oppName = "";
    oppRank = "";
    oppTier = -1;
    currentMatchId = null;
    playerWin = 0;
    oppWin = 0;

    ipc_send("set_draft", true);
    ipc_send("set_timer", -1);
    ipc_send("set_opponent", oppName);
    ipc_send("set_opponent_rank", get_rank_index(oppRank, oppTier), oppRank+" "+oppTier);
}

//
function select_deck(arg) {
    if (arg.CourseDeck !== undefined) {
        currentDeck = arg.CourseDeck;
    }
    else {
        currentDeck = arg;
    }
    var str = JSON.stringify(currentDeck);
    currentDeckUpdated = JSON.parse(str);
    console.log(currentDeck, arg);
    ipc_send("set_deck", currentDeck);
}

//
function clear_deck() {
    var deck = {mainDeck: [], sideboard : [], name: ""};
    ipc_send("set_deck", deck);
}

//
function update_deck(force) {
    var nd = new Date()
    if (nd - lastDeckUpdate > 1000 || debugLog || !firstPass || force) {
        if (overlayDeckMode == 0) {
            ipc_send("set_deck", currentDeckUpdated);
        }
        if (overlayDeckMode == 1) {
            ipc_send("set_deck", currentDeck);
        }
        if (overlayDeckMode == 2) {
            ipc_send("set_deck", currentDeckUpdated);
        }
        if (overlayDeckMode == 3) {
            var currentOppDeck = getOppDeck();
            ipc_send("set_deck", currentOppDeck);
        }
        if (overlayDeckMode == 4) {
            ipc_send("set_deck", currentDeckUpdated);
        }
        lastDeckUpdate = nd;
    }
}

//
function get_rank_index(_rank, _tier) {
    var ii = 0;
    if (_rank == "Beginner")    ii = 0;
    if (_rank == "Bronze")      ii = 1  + _tier;
    if (_rank == "Silver")      ii = 6  + _tier;
    if (_rank == "Gold")        ii = 11 + _tier;
    if (_rank == "Diamond")     ii = 16 + _tier;
    if (_rank == "Master")      ii = 21;
    return ii;
}

//
function forceDeckUpdate() {
    var decksize = 0;
    var cardsleft = 0;
    var typeCre = 0;
    var typeIns = 0;
    var typeSor = 0;
    var typePla = 0;
    var typeArt = 0;
    var typeEnc = 0;
    var typeLan = 0;
    if ((debugLog || !firstPass) && currentDeckUpdated.mainDeck != undefined) {
        /*
        // DEBUG
        currentDeckUpdated.mainDeck = [];
        decksize = 0;
        cardsleft = 0;
        */
        currentDeckUpdated.mainDeck.forEach(function(card) {
            card.total = card.quantity;
            decksize += card.quantity;
            cardsleft += card.quantity;
        });
    }
    Object.keys(gameObjs).forEach(function(key) {
        if (gameObjs[key] != undefined) {
            if (zones[gameObjs[key].zoneId].type != "ZoneType_Limbo" && zones[gameObjs[key].zoneId].type != "ZoneType_Library") {
                if (gameObjs[key].ownerSeatId == playerSeat && gameObjs[key].type != "GameObjectType_Token" && gameObjs[key].type != "GameObjectType_Ability") {
                    /*
                    // DEBUG
                    if (gameObjs[key].grpId != 3) {
                        decksize += 1;
                        cardsleft += 1;
                        currentDeckUpdated.mainDeck.push({id: gameObjs[key].grpId, quantity: gameObjs[key].zoneId})
                    }
                    */
                    
                	cardsleft -= 1;
	                if (currentDeckUpdated.mainDeck != undefined) {
                        currentDeckUpdated.mainDeck.forEach(function(card) {
                            if (card.id == gameObjs[key].grpId) {
                                //console.log(gameObjs[key].instanceId, cardsDb.get(gameObjs[key].grpId).name, zones[gameObjs[key].zoneId].type);
                                card.quantity -= 1;
                            }
                        });
                    }
                }
            }
        }
    });

    if ((debugLog || !firstPass) && currentDeckUpdated.mainDeck != undefined) {
        currentDeckUpdated.mainDeck.forEach(function(card) {
            var c = cardsDb.get(card.id);
            if (c) {
                if (c.type.includes("Land", 0))                 typeLan += card.quantity;
                else if (c.type.includes("Creature", 0))        typeCre += card.quantity;
                else if (c.type.includes("Artifact", 0))        typeArt += card.quantity;
                else if (c.type.includes("Enchantment", 0))     typeEnc += card.quantity;
                else if (c.type.includes("Instant", 0))         typeIns += card.quantity;
                else if (c.type.includes("Sorcery", 0))         typeSor += card.quantity;
                else if (c.type.includes("Planeswalker", 0))    typePla += card.quantity;
            }
            card.chance = Math.round(hypergeometric(1, cardsleft, 1, card.quantity)*100);
        });

        currentDeckUpdated.chanceCre = Math.round(hypergeometric(1, cardsleft, 1, typeCre) * 1000)/10;
        currentDeckUpdated.chanceIns = Math.round(hypergeometric(1, cardsleft, 1, typeIns) * 1000)/10;
        currentDeckUpdated.chanceSor = Math.round(hypergeometric(1, cardsleft, 1, typeSor) * 1000)/10;
        currentDeckUpdated.chancePla = Math.round(hypergeometric(1, cardsleft, 1, typePla) * 1000)/10;
        currentDeckUpdated.chanceArt = Math.round(hypergeometric(1, cardsleft, 1, typeArt) * 1000)/10;
        currentDeckUpdated.chanceEnc = Math.round(hypergeometric(1, cardsleft, 1, typeEnc) * 1000)/10;
        currentDeckUpdated.chanceLan = Math.round(hypergeometric(1, cardsleft, 1, typeLan) * 1000)/10;
        currentDeckUpdated.deckSize  = decksize;
        currentDeckUpdated.cardsLeft = cardsleft;
    }
}

//
function getOppDeck() {
	//var oppDeck = {mainDeck: [], sideboard : []};
	var doAdd = true;
    oppDeck.name = oppName;
    console.log("Deck "+oppName);
    Object.keys(gameObjs).forEach(function(key) {
        if (gameObjs[key] != undefined) {
            if (zones[gameObjs[key].zoneId].type != "ZoneType_Limbo") {
	        	//console.log(cardsDb.get(gameObjs[key].grpId), cardsDb.get(gameObjs[key].grpId).name, zones[gameObjs[key].zoneId].type, gameObjs[key]);
                if (gameObjs[key].ownerSeatId == oppSeat && gameObjs[key].type != "GameObjectType_SplitLeft" && gameObjs[key].type != "GameObjectType_SplitRight" && gameObjs[key].type != "GameObjectType_Token" && gameObjs[key].type != "GameObjectType_Ability") {
                    
                	doAdd = true;
                    oppDeck.mainDeck.forEach(function(card) {
                        if (card.id == gameObjs[key].grpId) {
                            doAdd = false;
                            //card.quantity += 1;
                        }
                    });
                    if (doAdd) {
                        if (cardsDb.get(gameObjs[key].grpId) != false) {
    						oppDeck.mainDeck.push( {id: gameObjs[key].grpId, quantity: 9999} );
                        }
                    }
                }
            }
        }
    }); 
    
    return oppDeck;
}

//
function saveEconomy(json) {
    var ctx = json.context;
    json.id = sha1(json.date.getTime()+ctx);
    
    if (ctx.indexOf("Quest.Completed") !== -1) {
        json.context = "Quest Completed";
    }
    if (ctx.indexOf("Booster.Open") !== -1) {
        json.context = "Booster Open";
    }
    if (ctx.indexOf("PlayerReward") !== -1) {
        json.context = "Player Rewards";
    }
    if (ctx.indexOf("WildCard.Redeem") !== -1) {
        json.context = "Redeem Wilcard";
    }
    if (ctx.indexOf("Store.Fulfillment") !== -1) {
        json.context = "Store";
    }
    if (ctx.indexOf("Event.Prize") !== -1) {
        json.context = "Event Prize";
    }
    if (ctx.indexOf("Event.PayEntry") !== -1) {
        json.context = "Pay Event Entry";
    }
    if (ctx.indexOf("Event.GrantCardPool") !== -1) {
        json.context = "Event Card Pool";
    }

    var economy_index = store.get('economy_index');

    if (!economy_index.includes(json.id)) {
        economy_index.push(json.id);
    }

    httpSetEconomy(json);
    
    economy[json.id] = json;
    economy.changes = economy_index;
    store.set('economy_index', economy_index);
    store.set(json.id, json);
}

//
function saveCourse(json) {
    json.id = json._id;
    json.date = new Date();;
    delete json._id;
    
    var courses_index = store.get('courses_index');

    if (!courses_index.includes(json.id)) {
        courses_index.push(json.id);
    }
    else {
        json.date = store.get(json.id).date;
    }

    // add locally
    if (!events.courses.includes(json.id)) {
        events.courses.push(json.id);
    }

    json.type = "Event";
    events[json.id] = json;
    store.set('courses_index', courses_index);
    store.set(json.id, json);
}

//
function saveMatch() {
	if (currentMatchTime == 0) {
		return;
	}
    var match = {};
    match.id = currentMatchId;
    match.duration = currentMatchTime;
    match.opponent = {
        name: oppName,
        rank: oppRank,
        tier: oppTier,
        userid: oppId,
        seat: oppSeat,
        win: oppWin
    }
    match.player = {
        name: playerName,
        rank: playerRank,
        tier: playerTier,
        userid: playerId,
        seat: playerSeat, 
        win: playerWin
    }

    match.eventId = currentEventId;
    match.playerDeck = currentDeck;
    match.oppDeck = getOppDeck();
    match.date = new Date();

    console.log("Save match:", match);
    var matches_index = store.get('matches_index');

    if (!matches_index.includes(currentMatchId)) {
        matches_index.push(currentMatchId);
    }
    else {
        match.date = store.get(currentMatchId).date;
    }

	// add locally
    if (!history.matches.includes(currentMatchId)) {
        history.matches.push(currentMatchId);
    }

    store.set('matches_index', matches_index);
    store.set(currentMatchId, match);

    history[currentMatchId] = match;
    history[currentMatchId].type = "match";
    httpSetMatch(match);
    requestHistorySend(0);
    ipc_send("popup", {"text": "Match saved!", "time": 3000});
}

//
function saveDraft() {
    if (draftId != undefined) {
        var draft = currentDraft;
        draft.id = draftId;
        draft.date = new Date();
        draft.set = draftSet; 
        draft.owner = playerName; 

        console.log("Save draft:", draft);
        
    	var draft_index = store.get('draft_index');
    	// add to config
        if (!draft_index.includes(draftId)) {
            draft_index.push(draftId);
        }
        else {
            draft.date = store.get(draftId).date;
        }

        // add locally
        if (!history.matches.includes(draftId)) {
            history.matches.push(draftId);
        }
     
        store.set('draft_index', draft_index);
        store.set(draftId, draft);
        history[draftId] = draft;
        history[draftId].type = "draft";
        httpSetDraft(draft);
        requestHistorySend(0);
        ipc_send("popup", {"text": "Draft saved!", "time": 3000});        
    }
    else {
        console.log("Couldnt save draft with undefined ID:", draft);
    }
}

//
function finishLoading() {
	firstPass = false;

    if (duringMatch) {
        ipc_send("renderer_hide", 1);
        ipc_send("overlay_show", 1);
        update_deck(false);
    }
    var obj = store.get('overlayBounds');
    ipc_send("overlay_set_bounds", obj);

    requestHistorySend(0);
	ipc_send("initialize", 1);

    var obj = store.get('windowBounds');
    ipc_send("renderer_set_bounds", obj);

    if (playerName != null) {
        httpSetPlayer(playerName, playerRank, playerTier);  
    }
}

// HTTP stuff starts here
var httpAsync = [];
httpBasic();
httpGetDatabase();
htttpGetStatus();

// 
function httpBasic() {
    var httpAsyncNew = httpAsync.slice(0);
    //var str = ""; httpAsync.forEach( function(h) {str += h.reqId+", "; }); console.log("httpAsync: ", str);
    async.forEachOfSeries(httpAsyncNew, function (value, index, callback) {
        var _headers = value;

        if (store.get("settings").send_data == false && _headers.method != 'auth' && _headers.method != 'delete_data' && _headers.method != 'get_database' && _headers.method != 'get_status' && debugLog == false) {
            callback({message: "Settings dont allow sending data! > "+_headers.method});
            removeFromHttp(_headers.reqId);
        }
        else if (tokenAuth == undefined) {
            //callback({message: "Undefined token"});
            //removeFromHttp(_headers.reqId);
            _headers.token = "";
        }
        else {
            _headers.token = tokenAuth;
        }
        
        var http = require('https');
        if (_headers.method == 'get_database') {
            var options = { protocol: 'https:', port: 443, hostname: serverAddress, path: '/database/database.json', method: 'GET'};
        }
        else if (_headers.method == 'get_status') {
            http = require('https');
            var options = { protocol: 'https:', port: 443, hostname: 'magicthegatheringarena.statuspage.io', path: '/index.json', method: 'GET'};
        }
        else if (_headers.method_path !== undefined) {
            var options = { protocol: 'https:', port: 443, hostname: serverAddress, path: _headers.method_path, method: 'POST'};
        }
        else {
            var options = { protocol: 'https:', port: 443, hostname: serverAddress, path: '/api.php', method: 'POST'};
        }

        if (debugNet) {
            console.log("SEND >> "+index+", "+_headers.method, _headers, options);
            ipc_send("ipc_log", "SEND >> "+index+", "+_headers.method+", "+_headers.reqId+", "+_headers.token);
        }

        console.log("POST", _headers);
        var post_data = qs.stringify(_headers);
        options.headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': post_data.length};

        var results = ''; 
        var req = http.request(options, function(res) {
            res.on('data', function (chunk) {
                results = results + chunk;
            }); 
            res.on('end', function () {
                if (debugNet) {
    				ipc_send("ipc_log", "RECV << "+index+", "+_headers.method+", "+_headers.reqId+", "+_headers.token);
                    ipc_send("ipc_log", "RECV << "+index+", "+_headers.method+", "+results.slice(0, 100));
                    console.log("RECV << "+index, _headers.method, results.slice(0, 500));
                }
                try {
                    var parsedResult = JSON.parse(results);
                    if (_headers.method == 'get_status') {
                        delete parsedResult.page; delete parsedResult.incidents;
                        parsedResult.components.forEach(function(ob) {
                            delete ob.id; delete ob.page_id; delete ob.group_id; delete ob.showcase; delete ob.description; delete ob.position; delete ob.created_at;
                        });
                        ipc_send("set_status", parsedResult);
                    }
                    if (parsedResult.ok) {
                        if (_headers.method == 'auth') {
                            tokenAuth = parsedResult.token;

                            //ipc_send("auth", parsedResult.arenaids);

                            if (rememberMe) {
                                rstore.set("token", tokenAuth);
                                rstore.set("email", playerUsername);
                            }

                            ipc_send("auth", parsedResult);
                            loadPlayerConfig(playerId);
                        }
                        if (_headers.method == 'get_top_decks') {
                            ipc_send("set_explore", parsedResult.result);
                        }
                        if (_headers.method == 'get_course') {
                            ipc_send("open_course_deck", parsedResult.result);
                        }
                        if (_headers.method == 'share_draft') {
                            ipc_send("set_draft_link", parsedResult.url);
                        }
                        
                        if (_headers.method == 'get_database') {
                            //resetLogLoop(100);
                            delete parsedResult.ok;
                            setsList = parsedResult.sets;
                            eventsList = parsedResult.events;
                            ipc_send("set_db", parsedResult);
                            cardsDb.set(parsedResult);
                            ipc_send("popup", {"text": "Metadata: Ok", "time": 1000});
                        }
                        
                    }
                    else if (parsedResult.ok == false && parsedResult.error != undefined) {
                        if (_headers.method == 'share_draft') {
                            ipc_send("popup", {"text": parsedResult.error, "time": 3000});
                        }
                        if (_headers.method == 'auth') {
                            if (parsedResult.error == "Invalid credentials.") {
                                tokenAuth = undefined;
                                rstore.set("email", "");
                                rstore.set("token", "");
                                ipc_send("clear_pwd", 1);
                                ipc_send("set_remember", false);
                            }
                        }
                        // errors here 
                    }
                    if (_headers.method == 'auth') {
                        ipc_send("auth", parsedResult);
                    }
                } catch (e) {
                    console.error(e.message);
                }
                /*
                if (_headers.token != "") {
                }
                */
                try {
                    callback();
                }
                catch (e) {}
                

                removeFromHttp(_headers.reqId);
                if (debugNet) {
                    var str = ""; httpAsync.forEach( function(h) { str += h.reqId+", "; });
                    ipc_send("ipc_log", "httpAsync: "+str);
                }
            }); 
        });
        req.on('error', function(e) {
            callback(e);
            removeFromHttp(_headers.reqId);
            ipc_send("ipc_log", e.message);
        });
        req.write(post_data);
        console.log(req);
        req.end();

    }, function (err) {
        if (err) {
            ipc_send("ipc_log", "httpBasic() Error: "+err.message);
        }
        // do it again
        setTimeout( function() {
            httpBasic();
        }, 250);
    });
}

function removeFromHttp(req) {
    httpAsync.forEach( function(h, i) {
        if (h.reqId == req) {
            httpAsync.splice(i, 1);
        }
    });
}

function httpAuth(user, pass) {
    var _id = makeId(6);
    playerUsername = user;
	httpAsync.push({'reqId': _id, 'method': 'auth', 'method_path': '/login.php', 'email': user, 'password': pass, 'playerid': playerId, 'playername': playerName, 'mtgaversion': arenaVersion, 'version': window.electron.remote.app.getVersion()});
}

function httpSubmitCourse(course) {
    var _id = makeId(6);
    if (store.get("settings").anon_explore == true) {
        course.PlayerId = "000000000000000";
        course.PlayerName = "Anonymous";
    }
    course = JSON.stringify(course);
    httpAsync.push({'reqId': _id, 'method': 'submit_course', 'method_path': '/send_course.php', 'course': course});
}

function httpSetPlayer(name, rank, tier) {
    // useless I think
    //var _id = makeId(6);
	//httpAsync.push({'reqId': _id, 'method': 'set_player', 'name': name, 'rank': rank, 'tier': tier});
}

function httpGetTopDecks(query) {
    var _id = makeId(6);
	httpAsync.push({'reqId': _id, 'method': 'get_top_decks', 'method_path': '/get_courses_list.php', 'query': query});
}

function httpGetCourse(courseId) {
    var _id = makeId(6);
    httpAsync.push({'reqId': _id, 'method': 'get_course', 'method_path': '/get_course.php', 'courseid': courseId});
}

function httpSetMatch(match) {
    var _id = makeId(6);
    match = JSON.stringify(match);
    httpAsync.push({'reqId': _id, 'method': 'set_match', 'method_path': '/send_match.php', 'match': match});
}

function httpSetDraft(draft) {
    var _id = makeId(6);
    draft = JSON.stringify(draft);
    httpAsync.push({'reqId': _id, 'method': 'set_draft', 'method_path': '/send_draft.php', 'draft': draft});
}

function httpSetEconomy(change) {
    var _id = makeId(6);
    change = JSON.stringify(change);
    httpAsync.push({'reqId': _id, 'method': 'set_economy', 'method_path': '/send_economy.php', 'change': change});
}

function httpSendError(error) {
    var _id = makeId(6);
    error = JSON.stringify(error);
    httpAsync.push({'reqId': _id, 'method': 'send_error', 'method_path': '/send_error.php', 'error': error});
}

function httpDeleteData(courseId) {
    var _id = makeId(6);
    httpAsync.push({'reqId': _id, 'method': 'delete_data', 'method_path': '/delete_data.php'});
}

function httpGetDatabase() {
    var _id = makeId(6);
    ipc_send("popup", {"text": "Downloading metadata", "time": 0});
    httpAsync.push({'reqId': _id, 'method': 'get_database'});
}

function htttpGetStatus() {
    var _id = makeId(6);
    httpAsync.push({'reqId': _id, 'method': 'get_status'});
}

function httpDraftShareLink(did, exp) {
    var _id = makeId(6);
    httpAsync.push({'reqId': _id, 'method': 'share_draft', 'method_path': '/get_share_draft.php', 'id': did, 'expire': exp});
}


// Utility functions that belong only to background

//
function parseWotcTime(str) {
    try {
        let datePart = str.split(" ")[0];
        let timePart = str.split(" ")[1];
        let midnight = str.split(" ")[2];

        datePart = datePart.split("/");
        timePart = timePart.split(":");

        timePart.forEach(function(s, index) {timePart[index] = parseInt(s)});
        datePart.forEach(function(s, index) {datePart[index] = parseInt(s)});

        if (midnight == "PM" && timePart[0] != 12) {
            timePart[0] += 12;
        }
        if (midnight == "AM" && timePart[0] == 12) {
            timePart[0] = 0;
        }

        var date = new Date(datePart[2], datePart[0]-1, datePart[1], timePart[0], timePart[1], timePart[2]);
        return date;
    }
    catch (e) {
        return new Date();
    }

}

//
function fact(arg0) {
    let _f = 1;
    let _i = 1;
    for (_i=1; _i<=arg0; _i++) {
        _f = _f * _i;
    }

    return _f;
}

//
function comb(arg0, arg1) {
    let ret = fact(arg0) / fact(arg0-arg1) / fact(arg1);
    
    return ret;
}

//
function hypergeometric(arg0, arg1, arg2, arg3) {
    if (arg0 > arg3) {
        return 0;
    }

    let _x, _N, _n, _k;

    _x = arg0;// Number of successes in sample (x) <= 
    _N = arg1;// Population size
    _n = arg2;// Sample size
    _k = arg3;// Number of successes in population  

    let _a = comb(_k, _x)
    let _b = comb(_N-_k, _n-_x);
    let _c = comb(_N, _n);

    return _a * _b / _c;
}

//
function debugStart() {
    timeStart = new Date();
}

//
function debugEnd(str) {
    timeEnd = new Date();
    console.log(timeEnd - timeStart, str);
    timeStart = new Date();
}

