/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
import async from "async";

import makeId from "../shared/utils/makeId";
import isEpochTimestamp from "../shared/utils/isEpochTimestamp";
import database, { updateCache } from "../shared/database-wrapper";
import { playerDb } from "../shared/db/LocalDatabase";

import { ipcSend } from "./backgroundUtil";
import { loadPlayerConfig, syncSettings } from "./loadPlayerConfig";
import {
  asyncWorker,
  handleError,
  ipcLog,
  ipcPop,
  makeSimpleResponseHandler,
} from "./httpWorker";
import globals from "./globals";
import globalStore, {
  matchExists,
  eventExists,
  transactionExists,
  seasonalList,
  getEvent,
  getDraft,
  getTransaction,
  getMatch,
  getSeasonal,
  draftExists,
} from "../shared/store";
import { reduxAction } from "../shared/redux/sharedRedux";
import debugLog from "../shared/debugLog";
import {
  constants,
  InternalMatch,
  HttpTask,
  InternalEvent,
  InternalDraftv2,
  InternalEconomyTransaction,
  SeasonalRankData,
  SyncRequestData,
  BulkSeasonal,
  BulkEconomy,
  BulkDrafts,
  BulkMatches,
  BulkCourses,
  SyncIds,
  ExploreQuery,
  SettingsData,
  InternalDeck,
} from "mtgatool-shared";

const {
  SYNC_CHECK,
  SYNC_OK,
  SYNC_IDLE,
  SYNC_FETCH,
  IPC_RENDERER,
  IPC_ALL,
} = constants;

export function initHttpQueue(): async.AsyncQueue<HttpTask> {
  globals.httpQueue = async.queue(asyncWorker);
  if (globals.debugNet) {
    globals.httpQueue.drain(() => {
      ipcLog("httpQueue empty, asyncWorker now idle");
    });
  }
  return globals.httpQueue;
}

export function isIdle(): boolean {
  return globals.httpQueue ? globals.httpQueue.idle() : false;
}

export function setSyncState(state: number): void {
  reduxAction(
    globals.store.dispatch,
    { type: "SET_SYNC_STATE", arg: state },
    IPC_RENDERER
  );
}

export function finishSync(): void {
  const toPush = globals.store.getState().renderer.syncToPush;
  if (
    toPush.courses.length == 0 &&
    toPush.matches.length == 0 &&
    toPush.drafts.length == 0 &&
    toPush.economy.length == 0 &&
    toPush.seasonal.length == 0
  ) {
    setSyncState(SYNC_OK);
  } else {
    setSyncState(SYNC_CHECK);
  }
}

function saveCourses(data: InternalEvent[]): void {
  const courses_index = [...globals.store.getState().events.eventsIndex];
  data
    .filter((doc: InternalEvent) => !eventExists(doc.id))
    .map((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      if (isEpochTimestamp(doc.date)) doc.date *= 1000;
      playerDb.upsert("", id, doc);
      courses_index.push(id);
      return doc;
    });
  reduxAction(
    globals.store.dispatch,
    { type: "SET_MANY_EVENTS", arg: data },
    IPC_RENDERER
  );
  playerDb.upsert("", "courses_index", courses_index);
}

function saveMatches(data: InternalMatch[]): void {
  // Sync Matches (updated)
  const matches_index = [...globals.store.getState().matches.matchesIndex];
  data
    .filter((doc: any) => !matchExists(doc.id))
    .map((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      playerDb.upsert("", id, doc);
      matches_index.push(id);
      return doc;
    });
  reduxAction(
    globals.store.dispatch,
    { type: "SET_MANY_MATCHES", arg: data },
    IPC_RENDERER
  );
  playerDb.upsert("", "matches_index", matches_index);
}

function saveDrafts(data: InternalDraftv2[]): void {
  const draft_index = [...globals.store.getState().drafts.draftsIndex];
  data
    .filter((doc: any) => !draftExists(doc._id))
    .map((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      playerDb.upsert("", id, doc);
      draft_index.push(id);
      return doc;
    });

  reduxAction(
    globals.store.dispatch,
    { type: "SET_MANY_DRAFT", arg: data },
    IPC_RENDERER
  );
  playerDb.upsert("", "draftv2_index", draft_index);
}

function saveEconomy(data: InternalEconomyTransaction[]): void {
  const economy_index = [...globals.store.getState().economy.economyIndex];
  data
    .filter((doc: any) => !transactionExists(doc._id))
    .map((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      // For some reason this is not needed here
      // Maybe it was patched somehwere else
      //doc.timestamp = doc.timestamp * 1000;
      playerDb.upsert("", id, doc);
      economy_index.push(id);
      return doc;
    });
  reduxAction(
    globals.store.dispatch,
    { type: "SET_MANY_ECONOMY", arg: data },
    IPC_RENDERER
  );
  playerDb.upsert("", "economy_index", economy_index);
}

function saveSeasonal(data: SeasonalRankData[]): void {
  const newSeasonal = [...seasonalList()];
  const seasonalAdd = data.map((doc: SeasonalRankData) => {
    // This was my problem!
    if (!isEpochTimestamp(doc.timestamp)) {
      doc.timestamp = doc.timestamp * 1000;
    }
    newSeasonal.push(doc);
    playerDb.upsert("seasonal", doc.id, doc);
    return doc;
  });

  playerDb.upsert("", "seasonal", newSeasonal);

  reduxAction(
    globals.store.dispatch,
    {
      type: "SET_MANY_SEASONAL",
      arg: seasonalAdd,
    },
    IPC_RENDERER
  );
}

/*
function syncUserData(data: any): void {
  if (data.settings.tags_colors) {
    const newTags = data.settings.tags_colors;
    reduxAction(
      globals.store.dispatch,
      { type: "SET_TAG_COLORS", arg: newTags },
      IPC_RENDERER
    );
    playerDb.upsert("", "tags_colors", newTags);
  }

  finishSync();
}
*/

function handlePush(toPush: SyncIds): void {
  reduxAction(
    globals.store.dispatch,
    { type: "SET_TO_PUSH", arg: toPush },
    IPC_RENDERER
  );
  if (
    toPush.courses.length == 0 &&
    toPush.matches.length == 0 &&
    toPush.drafts.length == 0 &&
    toPush.economy.length == 0 &&
    toPush.seasonal.length == 0
  ) {
    setSyncState(SYNC_OK);
  } else {
    setSyncState(SYNC_IDLE);
  }
}

function httpGetCoursesBulk(page: number, ids: string[]): void {
  setSyncState(SYNC_FETCH);
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getBulkCourse",
      method_path: `/courses/bulk?page=${page}&id=${ids.join("&id=")}`,
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: BulkCourses) => {
      saveCourses(parsedResult.result);
      if (parsedResult.result.length == 20) {
        httpGetCoursesBulk(parsedResult.page + 1, parsedResult.ids);
      }
    })
  );
}

function httpGetMatchesBulk(page: number, ids: string[]): void {
  setSyncState(SYNC_FETCH);
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getBulkMatch",
      method_path: `/matches/bulk?page=${page}&id=${ids.join("&id=")}`,
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: BulkMatches) => {
      saveMatches(parsedResult.result);
      if (parsedResult.result.length == 20) {
        httpGetMatchesBulk(parsedResult.page + 1, parsedResult.ids);
      }
    })
  );
}

function httpGetDraftsBulk(page: number, ids: string[]): void {
  setSyncState(SYNC_FETCH);
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getBulkDraft",
      method_path: `/drafts/bulk?page=${page}&id=${ids.join("&id=")}`,
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: BulkDrafts) => {
      saveDrafts(parsedResult.result);
      if (parsedResult.result.length == 20) {
        httpGetDraftsBulk(parsedResult.page + 1, parsedResult.ids);
      }
    })
  );
}

function httpGetEconomyBulk(page: number, ids: string[]): void {
  setSyncState(SYNC_FETCH);
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getBulkEconomy",
      method_path: `/economies/bulk?page=${page}&id=${ids.join("&id=")}`,
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: BulkEconomy) => {
      saveEconomy(parsedResult.result);
      if (parsedResult.result.length == 20) {
        httpGetEconomyBulk(parsedResult.page + 1, parsedResult.ids);
      }
    })
  );
}

function httpGetSeasonalBulk(page: number, ids: string[]): void {
  setSyncState(SYNC_FETCH);
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getBulkSeasonal",
      method_path: `/seasonals/bulk?page=${page}&id=${ids.join("&id=")}`,
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: BulkSeasonal) => {
      saveSeasonal(parsedResult.result);
      if (parsedResult.result.length == 20) {
        httpGetSeasonalBulk(parsedResult.page + 1, parsedResult.ids);
      }
    })
  );
}

function handlePushSync(syncIds: SyncIds): void {
  const { privateDecks } = globals.store.getState().decks;
  const toPush: SyncIds = {
    courses: Object.keys(globalStore.events).filter(
      (id) => syncIds.courses.indexOf(id) == -1
    ),
    matches: Object.keys(globalStore.matches).filter(
      (id) =>
        syncIds.matches.indexOf(id) == -1 &&
        globalStore.matches[id] &&
        privateDecks.indexOf(globalStore.matches[id].id) == -1
    ),
    drafts: Object.keys(globalStore.draftsv2).filter(
      (id) => syncIds.drafts.indexOf(id) == -1
    ),
    economy: Object.keys(globalStore.transactions).filter(
      (id) => syncIds.economy.indexOf(id) == -1
    ),
    seasonal: Object.keys(globalStore.seasonal).filter(
      (id) => syncIds.seasonal.indexOf(id) == -1
    ),
  };
  handlePush(toPush);
}
/*
function handleRePushLostMatchData(): void {
  // Server issues lost match records for roughly this time span.
  const shufflerDataCollectionStart = "2019-01-28T00:00:00.000Z";
  const dataLostEnd = "2019-05-01T00:00:00.000Z";
  // A bug introduced in 4.0.11 and fixed in 5.4.2 made bo3 matches only get
  // uploaded if they ended after only a single game.
  const bo3SkippedStartVersion = 4 * 256 * 256 + 11;
  const bo3SkipFixedVersion = (5 * 256 + 4) * 256 + 2;
  const toPush: SyncIds = {
    courses: [],
    matches: Object.keys(globalStore.matches).filter((id) => {
      const match = globalStore.matches[id];
      return (
        (!match.lastPushedDate &&
          shufflerDataCollectionStart < match.date &&
          match.date < dataLostEnd) ||
        (!match.lastPushedByVersion &&
          match.bestOf === 3 &&
          bo3SkippedStartVersion <= match.toolVersion &&
          match.toolVersion < bo3SkipFixedVersion &&
          (match.player.win === 2 || match.opponent.win === 2))
      );
    }),
    drafts: [],
    economy: [],
    seasonal: [],
  };
  handlePush(toPush);
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  httpSyncPush();
}
*/

function handleSyncRequest(sync: SyncRequestData): void {
  ipcLog("Handle Sync request response");

  const gs = globalStore;
  const toGetSync = {
    courses: sync.courses.filter((id) => !(id in gs.events)) || [],
    matches: sync.matches.filter((id) => !(id in gs.matches)) || [],
    drafts: sync.drafts.filter((id) => !(id in gs.draftsv2)) || [],
    economy: sync.economy.filter((id) => !(id in gs.transactions)) || [],
    seasonal: sync.seasonal.filter((id) => !(id in gs.seasonal)) || [],
  };

  const total =
    toGetSync.courses.length +
    toGetSync.matches.length +
    toGetSync.drafts.length +
    toGetSync.economy.length +
    toGetSync.seasonal.length;
  ipcLog(`Got ${total} remote documents to pull.`);

  toGetSync.courses.length > 0 && httpGetCoursesBulk(0, toGetSync.courses);
  toGetSync.matches.length > 0 && httpGetMatchesBulk(0, toGetSync.matches);
  toGetSync.drafts.length > 0 && httpGetDraftsBulk(0, toGetSync.drafts);
  toGetSync.economy.length > 0 && httpGetEconomyBulk(0, toGetSync.economy);
  toGetSync.seasonal.length > 0 && httpGetSeasonalBulk(0, toGetSync.seasonal);

  handlePushSync(sync);
}

export function httpSyncRequest(): void {
  setSyncState(SYNC_FETCH);
  const _id = makeId(6);
  const arenaId = globals.store.getState().playerdata.playerName;
  ipcLog("Begin Sync request");
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getSync",
      method_path: "/user/sync?arenaid=" + encodeURIComponent(arenaId),
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: SyncRequestData) => {
      handleSyncRequest(parsedResult);
    })
  );
}

function handleAuthResponse(
  error?: Error | null,
  _task?: HttpTask,
  _results?: string,
  parsedResult?: any
): void {
  if (error || !parsedResult) {
    ipcSend("auth", {});
    ipcSend("toggle_login", true);
    ipcSend("login_failed", true);
    debugLog(error?.message, "error");
    ipcPop({
      text: error?.message,
      time: 100000,
      progress: -1,
    });
    return;
  }

  syncSettings(
    { token: Buffer.from(parsedResult.token).toString("base64") },
    false
  );
  ipcSend("auth", parsedResult);
  //ipcSend("auth", parsedResult.arenaids);

  const appSettings = globals.store.getState().appsettings;
  if (appSettings.rememberMe) {
    reduxAction(
      globals.store.dispatch,
      {
        type: "SET_APP_SETTINGS",
        arg: {
          token: parsedResult.token,
          email: appSettings.email,
        },
      },
      IPC_ALL
    );
  }
  const data: any = {};
  data.patreon = parsedResult.patreon;
  data.patreonTier = parsedResult.patreonTier;

  loadPlayerConfig();
}

export function httpAuth(userName: string, pass: string): void {
  const _id = makeId(6);
  //const playerData = globals.store.getState().playerdata;
  setSyncState(SYNC_CHECK);
  debugLog("httpAuth", "debug");
  debugLog(globals.store.getState().appsettings.token, "debug");
  debugLog(globals.store.getState().appsettings.email, "debug");
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "authLogin",
      method_path: "/auth/login",
      data: {
        email: userName,
        password: pass,
      },
    },
    handleAuthResponse
  );
}

function handleSetDataResponse(
  error?: Error | null,
  task?: HttpTask,
  _results?: string,
  _parsedResult?: any
): void {
  finishSync();
  if (error) {
    handleError(error);
    return;
  }
  if (task && task.method == "postMatch") {
    const match: InternalMatch = task.data;
    match.lastPushedDate = new Date().toISOString();
    match.lastPushedByVersion = globals.toolVersion;
    reduxAction(
      globals.store.dispatch,
      { type: "SET_MATCH", arg: match },
      IPC_RENDERER
    );
    playerDb.upsert(match.id, "lastPushedDate", match.lastPushedDate);
    playerDb.upsert(match.id, "lastPushedByVersion", match.lastPushedByVersion);
  }
}

export function httpSubmitCourse(course: InternalEvent): void {
  const _id = makeId(6);
  const anon = globals.store.getState().settings.anon_explore;
  course.arenaId =
    anon == true
      ? "Anonymous"
      : course.arenaId || globals.store.getState().playerdata.playerName;

  //const playerData = globals.store.getState().playerdata;
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "postCourse",
      method_path: "/courses/" + course.id,
      data: course,
    },
    handleSetDataResponse
  );
}

export function httpGetExplore(query: ExploreQuery): void {
  const _id = makeId(6);
  const playerData = globals.store.getState().playerdata;
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "getExplore",
      method_path: "/explore/get",
      data: {
        ...query,
        collection: JSON.stringify(playerData.cards.cards),
      },
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_explore_decks", parsedResult);
    })
  );
}

export function httpGetCards(eventId: string): void {
  const _id = makeId(6);
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "getCards",
      method_path: "/api/get_cards.php",
      eventId: eventId,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_cards", parsedResult);
    })
  );
}

export function httpGetTopLadderDecks(): void {
  const _id = makeId(6);
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "getLadderDecks",
      method_path: "/top_ladder.json",
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_ladder_decks", parsedResult);
    })
  );
}

export function httpGetTopLadderTraditionalDecks(): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getLadderTraditionalDecks",
      method_path: "/top_ladder_traditional.json",
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_ladder_traditional_decks", parsedResult);
    })
  );
}

export function httpGetCourse(courseId: string): void {
  const _id = makeId(6);
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "getCourse",
      method_path: "/courses/" + courseId,
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("open_course_deck", parsedResult.result);
    })
  );
}

export function httpSetMatch(match: InternalMatch): void {
  const _id = makeId(6);
  const privateDecks = globals.store.getState().decks.privateDecks;
  const anon = globals.store.getState().settings.anon_explore;
  match.arenaId =
    anon == true
      ? "Anonymous"
      : match.arenaId || globals.store.getState().playerdata.playerName;
  if (privateDecks.indexOf(match.playerDeck.id) == -1) {
    globals.httpQueue?.push(
      {
        reqId: _id,
        method: "postMatch",
        method_path: "/matches/" + match.id,
        data: match,
      },
      handleSetDataResponse
    );
  }
}

export function httpSetDraft(draft: InternalDraftv2): void {
  const _id = makeId(6);
  const anon = globals.store.getState().settings.anon_explore;
  draft.arenaId =
    anon == true
      ? "Anonymous"
      : draft.arenaId || globals.store.getState().playerdata.playerName;
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "postDraft",
      method_path: "/drafts/" + draft.id,
      data: draft,
    },
    handleSetDataResponse
  );
}

export function httpSetEconomy(change: InternalEconomyTransaction): void {
  const _id = makeId(6);
  const anon = globals.store.getState().settings.anon_explore;
  change.arenaId =
    anon == true
      ? "Anonymous"
      : change.arenaId || globals.store.getState().playerdata.playerName;
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "postEconomy",
      method_path: "/economies/" + change.id,
      data: change,
    },
    handleSetDataResponse
  );
}

export function httpSetSeasonal(change: SeasonalRankData): void {
  const _id = makeId(6);
  const anon = globals.store.getState().settings.anon_explore;
  change.arenaId =
    anon == true
      ? "Anonymous"
      : change.arenaId || globals.store.getState().playerdata.playerName;
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "postSeasonal",
      method_path: "/seasonals/" + change.id,
      data: change,
    },
    handleSetDataResponse
  );
}

export function httpSetSettings(settings: SettingsData): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "postSettings",
      method_path: "/user/settings",
      data: settings,
    },
    handleSetDataResponse
  );
}

export function httpDeleteData(): void {
  const _id = makeId(6);
  const arenaId = globals.store.getState().playerdata.playerName;
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "clearData",
      method_path: "/user/clear?arenaid=" + encodeURIComponent(arenaId),
      options: {
        method: "DELETE",
      },
    },
    makeSimpleResponseHandler()
  );
}

function handleGetDatabaseResponse(
  error?: Error | null,
  _task?: HttpTask,
  results?: string
): void {
  if (error) {
    handleError(error);
    return;
  }
  if (results) {
    //resetLogLoop(100);
    // delete parsedResult.ok;
    ipcLog("Metadata: Ok");
    database.setDatabase(results);
    updateCache(results);
    ipcSend("set_db", results);
  }
  ipcPop({
    text: "Metadata OK",
    time: 1000,
    progress: -1,
  });
}

export function httpGetDatabase(lang: string): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getDatabase",
      method_path: "/database/" + lang,
      lang: lang,
      options: {
        method: "GET",
      },
    },
    handleGetDatabaseResponse
  );
}

export function httpGetDatabaseVersion(lang: string): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "getDatabaseVersion",
      method_path: "/database/latest/" + lang,
      options: {
        method: "GET",
      },
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      const lang = globals.store.getState().appsettings.metadataLang;
      if (
        database.metadata &&
        database.metadata.language &&
        parsedResult.lang.toLowerCase() !==
          database.metadata.language.toLowerCase()
      ) {
        // compare language
        ipcSend("popup", {
          text: `Downloading latest Database (v${parsedResult.latest})`,
          time: 5000,
        });
        ipcLog(
          `Downloading database (had lang ${database.metadata.language}, needed ${parsedResult.lang})`
        );
        httpGetDatabase(lang);
      } else if (parsedResult.latest > database.version) {
        // Compare parsedResult.version with stored version
        ipcSend("popup", {
          text: `Downloading latest Database (v${parsedResult.latest})`,
          time: 5000,
        });
        ipcLog(
          `Downloading latest database (had v${database.version}, found v${parsedResult.latest})`
        );
        httpGetDatabase(lang);
      } else {
        ipcSend("popup", {
          text: `Database up to date (v${database.version})`,
          time: 5000,
        });
        ipcLog(`Database up to date (${database.version}), skipping download.`);
      }
    })
  );
}

export function httpDraftShareLink(
  id: string,
  draftData: InternalDraftv2,
  exp: number
): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "shareDraft",
      method_path: "/draft/share/" + id + "?expires=" + exp,
      data: draftData,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_draft_link", parsedResult.url);
    })
  );
}

export function httpMatchShareLink(
  id: string,
  matchData: InternalMatch,
  exp: number
): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "shareMatch",
      method_path: "/match/share/" + id + "?expires=" + exp,
      data: matchData,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_log_link", parsedResult.url);
    })
  );
}

export function httpDeckShareLink(
  id: string,
  deckData: InternalDeck,
  exp: number
): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "shareDeck",
      method_path: "/deck/share/" + id + "?expires=" + exp,
      data: deckData,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_deck_link", parsedResult.url);
    })
  );
}

export function httpHomeGet(set: string): void {
  const _id = makeId(6);
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "getHome",
      method_path: "/home",
      set: set,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_home", parsedResult);
    })
  );
}

export function httpSetMythicRank(opp: string, rank: string): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "postMythicRank",
      method_path: "/api/send_mythic_rank.php",
      data: {
        opp: opp,
        rank: rank,
      },
    },
    handleSetDataResponse
  );
}

export function httpSyncPush(): void {
  const syncIds: SyncIds = globals.store.getState().renderer.syncToPush;
  syncIds.courses.map((id: string) => {
    const obj = getEvent(id);
    if (obj) httpSubmitCourse(obj);
  });

  syncIds.drafts.map((id: string) => {
    const obj = getDraft(id);
    if (obj) httpSetDraft(obj);
  });

  syncIds.economy.map((id: string) => {
    const obj = getTransaction(id);
    if (obj) httpSetEconomy(obj);
  });

  syncIds.matches.map((id: string) => {
    const obj = getMatch(id);
    if (obj) httpSetMatch(obj);
  });

  syncIds.seasonal.map((id: string) => {
    const obj = getSeasonal(id);
    if (obj) httpSetSeasonal(obj);
  });

  reduxAction(
    globals.store.dispatch,
    {
      type: "SET_TO_PUSH",
      arg: {
        matches: [],
        courses: [],
        drafts: [],
        economy: [],
        seasonal: [],
      },
    },
    IPC_RENDERER
  );
}

export function httpAdminUpdateExplore(eventId: string): void {
  const _id = makeId(6);
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "updateExplore",
      method_path: "/explore/update?eventId=" + eventId,
      options: {
        method: "POST",
      },
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      console.log(parsedResult);
      debugLog(parsedResult, "debug");
    })
  );
}

export function httpGetActiveEvents(): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "activeEvents",
      method_path: "/api/active_events.php",
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      const events = parsedResult.events.map((r: any) => r.event);
      console.log("Fetched active events:", events);
      ipcSend("set_active_events", JSON.stringify(events));
    })
  );
}
