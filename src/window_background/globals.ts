import Deck from "../shared/deck";

// Hey! If you're here, you might be thinking of adding stuff to this file.
// Don't. This is a shadowy place. You must never go here.
// Hopefully we'll be able to get rid of all of the ones that can change,
// and put them into stores or better structures than a giant export list.

let actionLogDir = "";

let currentDeck = new Deck();

let currentMatch: any = null;

const debugLog = false;

const debugNet = false;

let duringDraft = false;

let duringMatch = false;

let firstPass = true;

let gameNumberCompleted = 0;

let idChanges: any = {};

let initialLibraryInstanceIds: any[] = [];

let instanceToCardIdMap: any = {};

let logReadStart: any = null;

let logTime = new Date();

let matchCompletedOnGameNumber = 0;

let matchGameStats: any[] = [];

let originalDeck: Deck = new Deck();

let odds_sample_size = 1;

let toolVersion: any = null;

let watchingLog = false;

let stopWatchingLog: any;

export default {
  actionLogDir,
  currentDeck,
  currentMatch,
  debugLog,
  debugNet,
  duringDraft,
  duringMatch,
  firstPass,
  gameNumberCompleted,
  idChanges,
  initialLibraryInstanceIds,
  instanceToCardIdMap,
  logReadStart,
  logTime,
  matchCompletedOnGameNumber,
  matchGameStats,
  odds_sample_size,
  originalDeck,
  stopWatchingLog,
  toolVersion,
  watchingLog
};
