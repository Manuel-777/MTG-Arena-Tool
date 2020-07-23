/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
import electron from "electron";
import async from "async";

import makeId from "../shared/utils/makeId";
import isEpochTimestamp from "../shared/utils/isEpochTimestamp";
import db from "../shared/database";
import { playerDb } from "../shared/db/LocalDatabase";

import { ipcSend } from "./backgroundUtil";
import { loadPlayerConfig, syncSettings } from "./loadPlayerConfig";
import {
  asyncWorker,
  HttpTask,
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
} from "../shared/store";
import {
  SYNC_CHECK,
  SYNC_OK,
  SYNC_IDLE,
  SYNC_FETCH,
  IPC_RENDERER,
  IPC_ALL,
} from "../shared/constants";
import { reduxAction } from "../shared/redux/sharedRedux";
import { InternalMatch } from "../types/match";
import debugLog from "../shared/debugLog";

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

function syncUserData(data: any): void {
  //debugLog("syncUserData: ", data);
  // Sync Events
  const courses_index = [...globals.store.getState().events.eventsIndex];
  const coursesList = data.courses
    .filter((doc: any) => !eventExists(doc._id))
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
    { type: "SET_MANY_EVENTS", arg: coursesList },
    IPC_RENDERER
  );
  playerDb.upsert("", "courses_index", courses_index);

  // Sync Matches (updated)
  const matches_index = [...globals.store.getState().matches.matchesIndex];
  const matchesList = data.matches
    .filter((doc: any) => !matchExists(doc._id))
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
    { type: "SET_MANY_MATCHES", arg: matchesList },
    IPC_RENDERER
  );
  playerDb.upsert("", "matches_index", matches_index);

  // Sync Economy
  const economy_index = [...globals.store.getState().economy.economyIndex];
  const transactionsList = data.economy
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
    { type: "SET_MANY_ECONOMY", arg: transactionsList },
    IPC_RENDERER
  );
  playerDb.upsert("", "economy_index", economy_index);

  // Sync Drafts
  // Disabled until new api lands
  /*
  const draftv2_index = [...globals.store.getState().drafts.draftsIndex];
  const draftsList = data.drafts
    .filter((doc: any) => !draftExists(doc._id))
    .map((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      playerDb.upsert("", id, doc);
      draftv2_index.push(id);
      return doc;
    });

  reduxAction(
    globals.store.dispatch,
    { type: "SET_MANY_DRAFT", arg: draftsList },
    IPC_RENDERER
  );
  playerDb.upsert("", "draftv2_index", draftv2_index);
  */

  // Sync seasonal
  const newSeasonal = [...seasonalList()];
  const seasonalAdd = data.seasonal.map((doc: any) => {
    const id = doc._id;
    doc.id = id;
    delete doc._id;
    // This was my problem!
    if (!isEpochTimestamp(doc.timestamp)) {
      doc.timestamp = doc.timestamp * 1000;
    }
    newSeasonal.push(doc);
    playerDb.upsert("seasonal", id, doc);
    return doc;
  });

  playerDb.upsert("", "seasonal", newSeasonal);

  reduxAction(
    globals.store.dispatch,
    { type: "SET_MANY_SEASONAL", arg: seasonalAdd },
    IPC_RENDERER
  );

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

function handleNotificationsResponse(
  error?: Error | null,
  _task?: HttpTask,
  _results?: string,
  parsedResult?: any
): void {
  // TODO Here we should probably do some "smarter" pull
  // Like, check if arena is open at all, if we are in a tourney, if we
  // just submitted some data that requires notification pull, etc
  // Based on that adjust the timeout for the next pull.
  //setTimeout(httpNotificationsPull, 10000);

  if (error) {
    handleError(error);
    return;
  }

  if (!parsedResult || !parsedResult.notifications) return;
  parsedResult.notifications.forEach((str: any) => {
    debugLog("notifications message: " + str);
    if (typeof str == "string") {
      //debugLog("Notification string:", str);
      new Notification("MTG Arena Tool", {
        body: str,
      });
    } else if (typeof str == "object") {
      if (str.task) {
        if (str.task == "sync") {
          syncUserData(str.value);
        } else {
          ipcSend(str.task, str.value);
        }
      }
    }
  });
}

export function httpNotificationsPull(): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "notifications",
      method_path: "/api/pull.php",
    },
    handleNotificationsResponse
  );
}

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

function handleSync(syncIds: SyncIds): void {
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
        !match.lastPushedDate &&
        shufflerDataCollectionStart < match.date &&
        match.date < dataLostEnd
      ) || (
        !match.lastPushedByVersion &&
        match.bestOf === 3 &&
        bo3SkippedStartVersion <= match.toolVersion &&
        match.toolVersion < bo3SkipFixedVersion &&
        (match.player.win === 2 || match.opponent.win === 2)
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

export interface SyncRequestData {
  courses?: any[];
  matches?: any[];
  drafts?: any[];
  economy?: any[];
  seasonal?: any[];
}

interface SyncIds {
  courses: string[];
  matches: string[];
  drafts: string[];
  economy: string[];
  seasonal: string[];
}

export function httpSyncRequest(data: SyncRequestData): void {
  setSyncState(SYNC_FETCH);
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "get_sync",
      method_path: "/api/get_sync.php",
      data: JSON.stringify(data),
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      syncUserData(parsedResult.data);
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
  data.patreon_tier = parsedResult.patreon_tier;

  const serverData: SyncIds = {
    matches: [],
    courses: [],
    drafts: [],
    economy: [],
    seasonal: [],
  };

  if (parsedResult && data.patreon) {
    serverData.matches = parsedResult.matches;
    serverData.courses = parsedResult.courses;
    serverData.drafts = parsedResult.drafts;
    serverData.economy = parsedResult.economy;
    serverData.seasonal = parsedResult.seasonal;
  }

  loadPlayerConfig().then(() => {
    ipcLog("...called back to http-api.");
    ipcLog("Checking local data without remote copies");
    if (parsedResult && data.patreon) {
      handleSync(parsedResult);
    } else {
      handleRePushLostMatchData();
    }
    ipcLog("Checking for sync requests...");
    const requestSync = {
      courses: serverData.courses.filter((id) => !(id in globalStore.events)),
      matches: serverData.matches.filter((id) => !(id in globalStore.matches)),
      drafts: serverData.drafts.filter((id) => !(id in globalStore.draftsv2)),
      economy: serverData.economy.filter(
        (id) => !(id in globalStore.transactions)
      ),
      seasonal: serverData.seasonal.filter(
        (id) => !(id in globalStore.seasonal)
      ),
    };

    if (requestSync) {
      ipcLog("Fetch remote player items");
      // debugLog(requestSync);
      httpSyncRequest(requestSync);
    } else {
      ipcLog("No need to fetch remote player items.");
    }
    //httpNotificationsPull();
  });
}

export function httpAuth(userName: string, pass: string): void {
  const _id = makeId(6);
  const playerData = globals.store.getState().playerdata;
  setSyncState(SYNC_CHECK);
  debugLog("httpAuth", "debug");
  debugLog(globals.store.getState().appsettings.token, "debug");
  debugLog(globals.store.getState().appsettings.email, "debug");
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "auth",
      method_path: "/api/login.php",
      email: userName,
      password: pass,
      playerid: playerData.arenaId,
      playername: encodeURIComponent(playerData.playerName),
      mtgaversion: playerData.arenaVersion,
      version: electron.remote.app.getVersion(),
    },
    handleAuthResponse
  );
}

function handleSetDataResponse(
  error?: Error | null,
  task?: HttpTask,
  _results?: string,
  parsedResult?: any
): void {
  const mongoDbDuplicateKeyErrorCode = 11000;
  finishSync();
  // duplicate key is idempotent success case, don't count it as error
  if (parsedResult?.error !== mongoDbDuplicateKeyErrorCode && error) {
    // handle all other errors
    handleError(error);
    return;
  }
  if (task && task.match) {
    const match: InternalMatch = JSON.parse(task.match);
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

export function httpSubmitCourse(course: any): void {
  const _id = makeId(6);
  const anon = globals.store.getState().settings.anon_explore;
  if (anon == true) {
    course.PlayerId = "000000000000000";
    course.PlayerName = "Anonymous";
  }

  const playerData = globals.store.getState().playerdata;
  course.playerRank = playerData.rank.limited.rank;
  course = JSON.stringify(course);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "submit_course",
      method_path: "/api/send_course.php",
      course: course,
    },
    handleSetDataResponse
  );
}

export function httpGetExplore(query: any): void {
  const _id = makeId(6);
  const playerData = globals.store.getState().playerdata;
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "get_explore",
      method_path: "/api/get_explore_v2.php",
      filter_wcc: query.filterWCC,
      filter_wcu: query.filterWCU,
      filter_wcr: query.filterWCR,
      filter_wcm: query.filterWCM,
      filter_owned: query.onlyOwned,
      filter_type: query.filterType,
      filter_event: query.filterEvent,
      filter_sort: query.filterSort,
      filter_sortdir: query.filterSortDir,
      filter_mana: query.filteredMana,
      filter_ranks: query.filteredRanks,
      filter_skip: query.filterSkip,
      collection: JSON.stringify(playerData.cards.cards),
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_explore_decks", parsedResult);
    })
  );
}

export function httpGetTopLadderDecks(): void {
  const _id = makeId(6);
  globals.httpQueue?.unshift(
    {
      reqId: _id,
      method: "get_ladder_decks",
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
      method: "get_ladder_traditional_decks",
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
      method: "get_course",
      method_path: "/api/get_course.php",
      courseid: courseId,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("open_course_deck", parsedResult.result);
    })
  );
}

export function httpSetMatch(match: InternalMatch): void {
  const _id = makeId(6);
  const anon = globals.store.getState().settings.anon_explore;
  const privateDecks = globals.store.getState().decks.privateDecks;
  if (anon == true) {
    match.player.userid = "000000000000000";
    match.player.name = "Anonymous";
  }
  if (privateDecks.indexOf(match.playerDeck.id) == -1) {
    const matchStr = JSON.stringify(match);
    globals.httpQueue?.push(
      {
        reqId: _id,
        method: "set_match",
        method_path: "/api/send_match.php",
        match: matchStr,
      },
      handleSetDataResponse
    );
  }
}

export function httpSetDraft(draft: any): void {
  const _id = makeId(6);
  draft = JSON.stringify(draft);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "set_draft",
      method_path: "/api/send_draft.php",
      draft: draft,
    },
    handleSetDataResponse
  );
}

export function httpSetEconomy(change: any): void {
  const _id = makeId(6);
  change = JSON.stringify(change);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "set_economy",
      method_path: "/api/send_economy.php",
      change: change,
    },
    handleSetDataResponse
  );
}

export function httpSetSeasonal(change: any): void {
  const _id = makeId(6);
  change = JSON.stringify(change);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "set_seasonal",
      method_path: "/api/send_seasonal.php",
      change: change,
    },
    handleSetDataResponse
  );
}

export function httpSetSettings(settings: any): void {
  const _id = makeId(6);
  settings = JSON.stringify(settings);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "set_settings",
      method_path: "/api/send_settings.php",
      settings: settings,
    },
    handleSetDataResponse
  );
}

export function httpDeleteData(): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "delete_data",
      method_path: "/api/delete_data.php",
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
    db.handleSetDb(null, results);
    db.updateCache(results);
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
      method: "get_database",
      method_path: "/database/" + lang,
      lang: lang,
    },
    handleGetDatabaseResponse
  );
}

export function httpGetDatabaseVersion(lang: string): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "get_database_version",
      method_path: "/database/latest/" + lang,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      const lang = globals.store.getState().appsettings.metadataLang;
      if (
        db.metadata &&
        db.metadata.language &&
        parsedResult.lang.toLowerCase() !== db.metadata.language.toLowerCase()
      ) {
        // compare language
        ipcSend("popup", {
          text: `Downloading latest Database (v${parsedResult.latest})`,
          time: 5000,
        });
        ipcLog(
          `Downloading database (had lang ${db.metadata.language}, needed ${parsedResult.lang})`
        );
        httpGetDatabase(lang);
      } else if (parsedResult.latest > db.version) {
        // Compare parsedResult.version with stored version
        ipcSend("popup", {
          text: `Downloading latest Database (v${parsedResult.latest})`,
          time: 5000,
        });
        ipcLog(
          `Downloading latest database (had v${db.version}, found v${parsedResult.latest})`
        );
        httpGetDatabase(lang);
      } else {
        ipcSend("popup", {
          text: `Database up to date (v${db.version})`,
          time: 5000,
        });
        ipcLog(`Database up to date (${db.version}), skipping download.`);
      }
    })
  );
}

export function httpDraftShareLink(
  did: string,
  exp: any,
  draftData: any
): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "share_draft",
      method_path: "/api/get_share_draft.php",
      id: did,
      draft: draftData,
      expire: exp,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_draft_link", parsedResult.url);
    })
  );
}

export function httpLogShareLink(lid: string, log: any, exp: any): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "share_log",
      method_path: "/api/get_share_log.php",
      id: lid,
      log: log,
      expire: exp,
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_log_link", parsedResult.url);
    })
  );
}

export function httpDeckShareLink(deck: any, exp: any): void {
  const _id = makeId(6);
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "share_deck",
      method_path: "/api/get_share_deck.php",
      deck: deck,
      expire: exp,
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
      method: "home_get",
      set: set,
      method_path: "/api/get_home.php",
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
      method: "mythicrank",
      method_path: "/api/send_mythic_rank.php",
      opp: opp,
      rank: rank,
    },
    handleSetDataResponse
  );
}

export function httpSetDeckTag(
  tag: string,
  deck: any, // TODO should be RawArenaDeck
  format: string
): void {
  const _id = makeId(6);
  // TODO what is this hack?
  const cards = deck.mainDeck.map((card: any) => {
    return {
      ...card,
      quantity: 1,
    };
  });
  globals.httpQueue?.push(
    {
      reqId: _id,
      method: "set_deck_tag",
      method_path: "/api/send_deck_tag.php",
      tag: tag,
      cards: JSON.stringify(cards),
      format: format,
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
