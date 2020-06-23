/* eslint-disable @typescript-eslint/no-explicit-any */
// Utility functions that belong only to background
import { ipcRenderer as ipc } from "electron";

import _ from "lodash";
import parse from "date-fns/parse";
import isValid from "date-fns/isValid";
import { IPC_BACKGROUND, IPC_RENDERER } from "../shared/constants";
import globals from "./globals";

import { create, all, MathJsStatic } from "mathjs";
const config = { precision: 2000 };
const math: MathJsStatic = create(all, config) as MathJsStatic;

// Begin of IPC messages recievers
export function ipcSend(method: string, arg?: any, to = IPC_RENDERER): void {
  if (method == "ipc_log") {
    //
  }
  //console.log("IPC SEND", method, arg, to);
  ipc.send("ipc_switch", method, IPC_BACKGROUND, arg, to);
}

export function normalizeISOString(date: number | string | undefined): string {
  // Send it to the beginning of time if no proper date is found
  try {
    return new Date(date ?? 0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

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
  "yyyy/MM/dd HH:mm:ss",
];

class DateParseError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "DateParseError";
  }
}

function isValidDate(date: Date): boolean {
  return isValid(date) && !isNaN(date.getTime());
}

export function getDateFormat(dateStr: string): string | undefined {
  const localeFormat = globals.store.getState().appsettings.logLocaleFormat;
  if (localeFormat) {
    // return the players setting
    return localeFormat;
  } else {
    // return the first date format which parses
    // the string returning a valid date
    return dateFormats.find((dateFormat) => {
      return isValidDate(parse(dateStr, dateFormat, new Date()));
    });
  }
}

// Parse the localised date string using local format
// or attempted detection
// This must throw an error if it fails
// Calling code should notify user or fallback as requested.
// The original date string should always be kept as backup.
// Use parseWotcTimeFallback for non-important dates.
export function parseWotcTime(dateStr: string): Date {
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
export function parseWotcTimeFallback(dateStr: string): Date {
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

export function parseLogTimestamp(numb: string | number): Date {
  const normalEpoch: any = math.divide(
    math.subtract(
      math.bignumber(parseInt(numb + "")),
      math.bignumber(621355968000000000)
    ),
    math.bignumber(10 * 1000)
  );

  const date = new Date(math.floor(math.number(normalEpoch) as any));
  return date;
}

export function updateLoading(entry: any): void {
  if (globals.firstPass) {
    const completion = entry.position / entry.size;
    ipcSend("popup", {
      text: `Reading log: ${Math.round(100 * completion)}%`,
      time: 0,
      progress: completion,
    });
  }
}

export function normaliseFields(object: any): any {
  if (typeof object == "object") {
    if (Array.isArray(object)) {
      return _.transform(object, (result: any, value: any, key: number) => {
        result[key] = normaliseFields(value);
      });
    }
    return _.transform(object, (result: any, value: any, key: string) => {
      result[key.replace(/List$/, "")] = normaliseFields(value);
    });
  }
  return object;
}

export function unleakString(s: string): string {
  return (" " + s).substr(1);
}
