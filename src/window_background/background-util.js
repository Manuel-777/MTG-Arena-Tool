// Utility functions that belong only to background
import { ipcRenderer as ipc } from "electron";

import _ from "lodash";
import parse from "date-fns/parse";
import isValid from "date-fns/isValid";
import { IPC_BACKGROUND, IPC_MAIN, IPC_OVERLAY } from "../shared/constants.js";
import playerData from "../shared/player-data.js";
import globals from "./globals";

// These were tested briefly
// They are all taken from logs
// Some format from date-fns could be wrong;
// https://date-fns.org/v2.2.1/docs/parse
const dateFormats = [
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

export function parseWotcTime(dateStr) {
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
export function parseWotcTimeFallback(dateStr) {
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

export function updateLoading(entry) {
  if (globals.firstPass) {
    const completion = entry.position / entry.size;
    ipc_send("popup", {
      text: `Reading log: ${Math.round(100 * completion)}%`,
      time: 0,
      progress: completion
    });
  }
}

function isValidDate(date) {
  return isValid(date) && !isNaN(date.getTime());
}

export function getDateFormat(dateStr) {
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

export function normaliseFields(iterator) {
  if (typeof iterator == "object") {
    return _.transform(iterator, function(result, value, key) {
      const nkey =
        typeof key == "string" ? key.replace(/List$/, "").toLowerCase() : key;
      result[nkey] = normaliseFields(value);
    });
  }
  return iterator;
}

export function unleakString(s) {
  return (" " + s).substr(1);
}

// Begin of IPC messages recievers
export function ipc_send(method, arg, to = IPC_MAIN) {
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
export function setData(
  data,
  refresh = globals.debugLog || !globals.firstPass
) {
  const cleanData = _.omit(data, dataBlacklist);
  playerData.handleSetData(null, JSON.stringify(cleanData));
  ipc_send("set_player_data", JSON.stringify(cleanData), IPC_MAIN);
  const overlayData = _.pick(cleanData, overlayWhitelist);
  ipc_send("set_player_data", JSON.stringify(overlayData), IPC_OVERLAY);
  if (refresh) ipc_send("player_data_refresh");
}
