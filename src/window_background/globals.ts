import Deck from "../shared/deck";
import * as mtgaLog from "./mtga-log";

// Hey! If you're here, you might be thinking of adding stuff to this file.
// Don't. This is a shadowy place. You must never go here.
// Hopefully we'll be able to get rid of all of the ones that can change,
// and put them into stores or better structures than a giant export list.

const actionLogDir = "";

const logUri = mtgaLog.defaultLogUri();

const currentDeck = new Deck();

const currentMatch: any = null;

const debugLog = false;

const debugNet = true;

const duringDraft = false;

const duringMatch = false;

const firstPass = true;

const gameNumberCompleted = 0;

const idChanges: any = {};

const initialLibraryInstanceIds: any[] = [];

const instanceToCardIdMap: any = {};

const logReadStart: any = null;

const logTime = false;

const matchCompletedOnGameNumber = 0;

const matchGameStats: any[] = [];

const originalDeck: any = undefined;

const odds_sample_size = 1;

const toolVersion: any = null;

const rememberCfg = {
  email: "",
  token: "",
  settings: {
    toolVersion: toolVersion,
    auto_login: false,
    launch_to_tray: false,
    remember_me: true,
    beta_channel: false,
    metadata_lang: "en",
    log_locale_format: ""
  }
};

const rStore: any = null;

const store: any = null;

const tokenAuth: any = undefined;

const watchingLog = false;

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
  logUri,
  matchCompletedOnGameNumber,
  matchGameStats,
  odds_sample_size,
  originalDeck,
  rememberCfg,
  rStore,
  stopWatchingLog,
  store,
  tokenAuth,
  toolVersion,
  watchingLog
};
