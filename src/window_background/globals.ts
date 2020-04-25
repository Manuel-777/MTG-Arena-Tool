/* eslint-disable prefer-const */
import { ZoneData } from "../types/greInterpreter";
import { InternalDraft } from "../types/draft";
import store from "../shared-redux/stores/backgroundStore";

export const InternalDraftDefault: InternalDraft = {
  PlayerId: null,
  InternalEventName: "",
  eventId: "",
  id: "",
  draftId: "",
  set: "",
  owner: "",
  player: "",
  pickedCards: [],
  packNumber: 0,
  pickNumber: 0,
  currentPack: [],
  CardPool: [],
  CourseDeck: null,
  date: "",
  type: "draft"
};

// Hey! If you're here, you might be thinking of adding stuff to this file.
// Don't. This is a shadowy place. You must never go here.
// Hopefully we'll be able to get rid of all of the ones that can change,
// and put them into stores or better structures than a giant export list.
let actionLogDir = "";

let currentDraft = InternalDraftDefault;

const debugLog = false;

const debugNet = true;

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

export default {
  store,
  actionLogDir,
  currentDraft,
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
  watchingLog
};
