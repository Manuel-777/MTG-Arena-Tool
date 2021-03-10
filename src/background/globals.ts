/* eslint-disable prefer-const */
import { ZoneData } from "../types/greInterpreter";
import store from "../shared/redux/stores/backgroundStore";
import async from "async";
import { HttpTask } from "mtgatool-shared";

// Hey! If you're here, you might be thinking of adding stuff to this file.
// Don't. This is a shadowy place. You must never go here.
// Hopefully we'll be able to get rid of all of the ones that can change,
// and put them into stores or better structures than a giant export list.
let actionLogDir = "";

const debugLog = false;

const debugNet = false;

let duringDraft = false;

let duringMatch = false;

let firstPass = true;

let logReadStart: Date = new Date();

let logTime = new Date();

let logTimestamp = 0;

let matchCompletedOnGameNumber = 0;

let oddsSampleSize = 1;

let toolVersion = 0;

let watchingLog = false;

let stopWatchingLog: any;

let cardTypesByZone: ZoneData = {};

let httpQueue: async.AsyncQueue<HttpTask> | undefined;

let lastDeckUpdate = new Date();

export default {
  httpQueue,
  store,
  actionLogDir,
  debugLog,
  debugNet,
  duringDraft,
  duringMatch,
  firstPass,
  logReadStart,
  logTime,
  logTimestamp,
  matchCompletedOnGameNumber,
  oddsSampleSize,
  cardTypesByZone,
  stopWatchingLog,
  toolVersion,
  watchingLog,
  lastDeckUpdate,
};
