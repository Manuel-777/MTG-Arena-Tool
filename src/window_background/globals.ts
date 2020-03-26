/* eslint-disable prefer-const */
import Deck from "../shared/deck";
import { ZoneData } from "../types/greInterpreter";
import {
  MatchData,
  matchDataDefault,
  MatchGameStats
} from "../types/currentMatch";
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

let currentDeck = new Deck();

const debugLog = false;

const debugNet = true;

let duringDraft = false;

let duringMatch = false;

let firstPass = true;

let gameNumberCompleted = 0;

let idChanges: any = {};

let initialLibraryInstanceIds: number[] = [];

let instanceToCardIdMap: any = {};

let logReadStart: Date = new Date();

let logTime = new Date();

let matchCompletedOnGameNumber = 0;

let matchGameStats: MatchGameStats[] = [];

let originalDeck: Deck = new Deck();

let oddsSampleSize = 1;

let toolVersion = 0;

let watchingLog = false;

let stopWatchingLog: any;

let cardTypesByZone: ZoneData = {};

let currentMatch: MatchData = matchDataDefault;

export default {
  store,
  actionLogDir,
  currentDraft,
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
  oddsSampleSize,
  cardTypesByZone,
  originalDeck,
  stopWatchingLog,
  toolVersion,
  watchingLog
};
