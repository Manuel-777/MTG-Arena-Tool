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

const playerData = require("../shared/player-data.js");

// These were tested briefly
// They are all taken from logs
// Some format from date-fns could be wrong;
// https://date-fns.org/v2.0.0-alpha.27/docs/parse
let dateFormats = [
  "dd.MM.yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm:ss",
  "M/dd/yyyy hh:mm:ss aa",
  "dd/MM/yyyy hh:mm:ss aa",
  "yyyy-MM-dd A HH:mm:ss",
  "yyyy/MM/dd HH:mm:ss"
];

class DateParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "DateParseError";
  }
}

// Parse the localised date string using local format
// or attempted detection
// This must throw an error if it fails
// Calling code should notify user or fallback as requested.
// The original date string should always be kept as backup.
// Use parseWotcTimeFallback for non-important dates.

function parseWotcTime(dateStr) {
  // This must throw an error if it fails

  const dateFormat = getDateFormat(dateStr);

  if (!dateFormat) {
    throw new DateParseError(
      `Invalid date or format ('${dateFormat}', '${dateStr}')`
    );
  }

  const date = parse(dateStr, dateFormat, new Date());

  if (!isValidDate(date)) {
    throw new DateParseError(
      `Invalid date or format ('${dateFormat}', '${dateStr}')`
    );
  }

  // This must throw an error if it fails
  return date;
}

// Ignore date parsing errors and return `new Date()`
// All other errors should still be passed upwards.
// New code should preferentially use parseWotcTime and handle their own errors.
function parseWotcTimeFallback(dateStr) {
  try {
    return parseWotcTime(dateStr);
  } catch (e) {
    if (e instanceof DateParseError) {
      console.error(
        "DateParseError: using new Date() fallback. Retain original date string.",
        e
      );
      return new Date();
    } else {
      throw e;
    }
  }
}

function isValidDate(date) {
  return isValid(date) && !isNaN(date.getTime());
}

function getDateFormat(dateStr) {
  if (playerData.settings.log_locale_format) {
    // return the players setting
    return playerData.settings.log_locale_format;
  } else {
    // return the first date format which parses
    // the string returning a valid date
    return dateFormats.find(dateFormat => {
      return isValidDate(parse(dateStr, dateFormat, new Date()));
    });
  }
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
  playerData.handleSetData(null, cleanData);
  ipc_send("set_player_data", cleanData, IPC_MAIN);
  const overlayData = _.pick(cleanData, overlayWhitelist);
  ipc_send("set_player_data", overlayData, IPC_OVERLAY);
  if (refresh) ipc_send("player_data_refresh");
}

module.exports = {
  ipc_send,
  normaliseFields,
  parseWotcTime,
  parseWotcTimeFallback,
  setData,
  unleakString
};
