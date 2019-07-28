/*
global
  debugLog
  firstPass
*/
// Utility functions that belong only to background
const { ipcRenderer: ipc } = require("electron");
const _ = require("lodash");
const parse = require("date-fns/parse");
const isValid = require("date-fns/isValid");

const {
  IPC_BACKGROUND,
  IPC_MAIN,
  IPC_OVERLAY
} = require("../shared/constants.js");
const pd = require("../shared/player-data.js");

// These were tested briefly , but hey are all taken from actual logs
// At most some format from date-fns could be wrong;
// https://date-fns.org/v2.0.0-alpha.27/docs/parse
let dateLangs = [
  "dd.MM.yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm:ss",
  "M/dd/yyyy hh:mm:ss aa",
  "dd/MM/yyyy hh:mm:ss aa",
  "yyyy-MM-dd A HH:mm:ss",
  "yyyy/MM/dd HH:mm:ss"
];

// throws an error if it fails
function parseWotcTime(dateStr) {
  // Attempt parsing with custom app-level setting first
  if (pd.settings.log_locale_format) {
    const lang = pd.settings.log_locale_format;
    // console.log(`Log datetime custom language attempt: ${lang}`);
    const test = parse(dateStr, lang, new Date());
    if (isValid(test) && !isNaN(test.getTime())) {
      //console.log(`Log datetime language detected: ${lang}`, dateStr, test);
      setData({ last_log_format: lang });
      return test;
    }
  }

  // Try parsing input with each format (in order) and return first valid result
  dateLangs.forEach(lang => {
    const test = parse(dateStr, lang, new Date());
    if (isValid(test) && !isNaN(test.getTime())) {
      //console.log(`Log datetime language detected: ${lang}`, dateStr, test);
      setData({ last_log_format: lang });
      return test;
    }
  });

  // Defaults to current time if none matches
  // console.log(`Invalid date ('${dateStr}') - using current date as backup.`);
  return new Date();
}

function normaliseFields(iterator) {
  if (typeof iterator == "object") {
    return _.transform(iterator, function(result, value, key) {
      let nkey =
        typeof key == "string" ? key.replace(/List$/, "").toLowerCase() : key;
      result[nkey] = normaliseFields(value);
    });
  }
  return iterator;
}

function unleakString(s) {
  return (" " + s).substr(1);
}

// Begin of IPC messages recievers
function ipc_send(method, arg, to = IPC_MAIN) {
  if (method == "ipc_log") {
    //
  }
  //console.log("IPC SEND", method, arg, to);
  ipc.send("ipc_switch", method, IPC_BACKGROUND, arg, to);
}

const dataBlacklist = [
  "transactionList",
  "draftList",
  "eventList",
  "matchList"
];

const overlayWhitelist = [
  "name",
  "userName",
  "arenaId",
  "arenaVersion",
  "patreon",
  "patreon_tier",
  "rank",
  "cards",
  "cardsNew",
  "settings"
];

// convenience fn to update player data singletons in all processes
// (update is destructive, be sure to use spread syntax if necessary)
function setData(data, refresh = debugLog || !firstPass) {
  const cleanData = _.omit(data, dataBlacklist);
  pd.handleSetData(null, cleanData);
  ipc_send("set_player_data", cleanData, IPC_MAIN);
  const overlayData = _.pick(cleanData, overlayWhitelist);
  ipc_send("set_player_data", overlayData, IPC_OVERLAY);
  if (refresh) ipc_send("player_data_refresh");
}

module.exports = {
  ipc_send,
  normaliseFields,
  parseWotcTime,
  setData,
  unleakString
};
