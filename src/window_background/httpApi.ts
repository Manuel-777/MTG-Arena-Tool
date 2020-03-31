/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
import electron from "electron";
import async from "async";

import { makeId } from "../shared/util";
import db from "../shared/database";
import { playerDb } from "../shared/db/LocalDatabase";

import { ipcSend, setData } from "./backgroundUtil";
import { loadPlayerConfig, syncSettings } from "./loadPlayerConfig";
import {
  asyncWorker,
  HttpTask,
  handleError,
  ipcLog,
  ipcPop,
  makeSimpleResponseHandler
} from "./httpWorker";
import globals from "./globals";
import globalStore, {
  matchExists,
  eventExists,
  transactionExists,
  draftExists
} from "../shared-store";
import { IPC_RENDERER, IPC_ALL } from "../shared/constants";
import { reduxAction } from "../shared-redux/sharedRedux";
import { InternalRankUpdate } from "../types/rank";

let httpQueue: async.AsyncQueue<HttpTask>;

export function initHttpQueue(): void {
  httpQueue = async.queue(asyncWorker);
  if (globals.debugNet) {
    httpQueue.drain(() => {
      ipcLog("httpQueue empty, asyncWorker now idle");
    });
  }
}

export function isIdle(): boolean {
  return httpQueue ? httpQueue.idle() : false;
}

function syncUserData(data: any): void {
  // console.log(data);
  // Sync Events
  const courses_index = [...globals.store.getState().events.eventsIndex];
  const coursesList = data.courses
    .filter((doc: any) => !eventExists(doc._id))
    .map((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      playerDb.upsert("", id, doc);
      courses_index.push(id);
      return doc;
    });
  reduxAction(
    globals.store.dispatch,
    "SET_MANY_EVENTS",
    coursesList,
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
    "SET_MANY_MATCHES",
    matchesList,
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
      playerDb.upsert("", id, doc);
      economy_index.push(id);
      return doc;
    });
  reduxAction(
    globals.store.dispatch,
    "SET_MANY_ECONOMY",
    transactionsList,
    IPC_RENDERER
  );
  playerDb.upsert("", "economy_index", economy_index);

  // Sync Drafts
  const draft_index = [...globals.store.getState().drafts.draftsIndex];
  const draftsList = data.drafts
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
    "SET_MANY_DRAFTS",
    draftsList,
    IPC_RENDERER
  );
  playerDb.upsert("", "draft_index", draft_index);

  // Sync seasonal
  const seasonalAdd = data.seasonal.map((doc: any) => {
    const id = doc._id;
    doc.id = id;
    delete doc._id;
    playerDb.upsert("seasonal", id, doc);
    return doc;
  });
  const newSeasonalRank: Record<string, string[]> = {
    ...globals.store.getState().seasonal.seasonal
  };
  seasonalAdd.map((update: InternalRankUpdate) => {
    const season = `${update.rankUpdateType.toLowerCase()}_${
      update.seasonOrdinal
    }`;
    newSeasonalRank[season] = [...(newSeasonalRank[season] || []), update.id];
  });
  playerDb.upsert("", "seasonal_rank", newSeasonalRank);

  reduxAction(
    globals.store.dispatch,
    "SET_MANY_SEASONAL",
    seasonalAdd,
    IPC_RENDERER
  );

  if (data.settings.tags_colors) {
    const newTags = data.settings.tags_colors;
    reduxAction(
      globals.store.dispatch,
      "SET_TAG_COLORS",
      newTags,
      IPC_RENDERER
    );
    playerDb.upsert("", "tags_colors", newTags);
  }
}

export function httpNotificationsPull(): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "notifications",
      method_path: "/api/pull.php"
    },
    handleNotificationsResponse
  );
}

function handleNotificationsResponse(
  error?: Error | null,
  task?: HttpTask,
  results?: string,
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
    console.log("notifications message:", str);
    if (typeof str == "string") {
      //console.log("Notification string:", str);
      new Notification("MTG Arena Tool", {
        body: str
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

export function httpAuth(userName: string, pass: string): void {
  const _id = makeId(6);
  const playerData = globals.store.getState().playerdata;
  httpQueue.push(
    {
      reqId: _id,
      method: "auth",
      method_path: "/api/login.php",
      email: userName,
      password: pass,
      playerid: playerData.arenaId,
      playername: encodeURIComponent(playerData.playerName),
      mtgaversion: playerData.arenaVersion,
      version: electron.remote.app.getVersion()
    },
    handleAuthResponse
  );
}

function handleAuthResponse(
  error?: Error | null,
  task?: HttpTask,
  results?: string,
  parsedResult?: any
): void {
  if (error || !parsedResult) {
    reduxAction(
      globals.store.dispatch,
      "SET_APP_SETTINGS",
      {
        token: "",
        email: ""
      },
      IPC_ALL
    );
    ipcSend("auth", {});
    ipcSend("toggle_login", true);
    ipcSend("login_failed", true);
    ipcSend("clear_pwd", 1);
    ipcPop({
      text: error?.message,
      time: 3000,
      progress: -1
    });
    return;
  }

  syncSettings({ token: parsedResult.token }, false);

  ipcSend("auth", parsedResult);
  //ipcSend("auth", parsedResult.arenaids);
  const appSettings = globals.store.getState().appsettings;
  if (appSettings.rememberMe) {
    reduxAction(
      globals.store.dispatch,
      "SET_APP_SETTINGS",
      {
        token: parsedResult.token,
        email: appSettings.email
      },
      IPC_ALL
    );
  }
  const data: any = {};
  data.patreon = parsedResult.patreon;
  data.patreon_tier = parsedResult.patreon_tier;

  const serverData = {
    matches: [],
    courses: [],
    drafts: [],
    economy: [],
    seasonal: []
  };
  if (data.patreon) {
    serverData.matches = parsedResult.matches;
    serverData.courses = parsedResult.courses;
    serverData.drafts = parsedResult.drafts;
    serverData.economy = parsedResult.economy;
    serverData.seasonal = parsedResult.seasonal;
  }
  setData(data, false);
  loadPlayerConfig().then(() => {
    ipcLog("...called back to http-api.");
    ipcLog("Checking for sync requests...");
    const requestSync = {
      courses: serverData.courses.filter(id => !(id in globalStore.events)),
      matches: serverData.matches.filter(id => !(id in globalStore.matches)),
      drafts: serverData.drafts.filter(id => !(id in globalStore.drafts)),
      economy: serverData.economy.filter(
        id => !(id in globalStore.transactions)
      ),
      seasonal: serverData.seasonal.filter(id => !(id in globalStore.seasonal))
    };

    if (requestSync) {
      ipcLog("Fetch remote player items");
      // console.log(requestSync);
      httpSyncRequest(requestSync);
    } else {
      ipcLog("No need to fetch remote player items.");
    }
    //httpNotificationsPull();
  });
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
  httpQueue.push(
    {
      reqId: _id,
      method: "submit_course",
      method_path: "/api/send_course.php",
      course: course
    },
    handleSetDataResponse
  );
}

export function httpGetExplore(query: any): void {
  const _id = makeId(6);
  const playerData = globals.store.getState().playerdata;
  httpQueue.unshift(
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
      collection: JSON.stringify(playerData.cards.cards)
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_explore_decks", parsedResult);
    })
  );
}

export function httpGetTopLadderDecks(): void {
  const _id = makeId(6);
  httpQueue.unshift(
    {
      reqId: _id,
      method: "get_ladder_decks",
      method_path: "/top_ladder.json"
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_ladder_decks", parsedResult);
    })
  );
}

export function httpGetTopLadderTraditionalDecks(): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "get_ladder_traditional_decks",
      method_path: "/top_ladder_traditional.json"
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_ladder_traditional_decks", parsedResult);
    })
  );
}

export function httpGetCourse(courseId: string): void {
  const _id = makeId(6);
  httpQueue.unshift(
    {
      reqId: _id,
      method: "get_course",
      method_path: "/api/get_course.php",
      courseid: courseId
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("open_course_deck", parsedResult.result);
    })
  );
}

function handleSetDataResponse(
  error?: Error | null,
  task?: HttpTask,
  results?: string,
  parsedResult?: any
): void {
  const mongoDbDuplicateKeyErrorCode = 11000;
  if (parsedResult && parsedResult.error === mongoDbDuplicateKeyErrorCode) {
    return; // idempotent success case, just return
  } else if (error) {
    // handle all other errors
    handleError(error);
  }
}

export function httpSetMatch(match: any): void {
  const _id = makeId(6);
  const anon = globals.store.getState().settings.anon_explore;
  if (anon == true) {
    match.player.userid = "000000000000000";
    match.player.name = "Anonymous";
  }
  match = JSON.stringify(match);
  httpQueue.push(
    {
      reqId: _id,
      method: "set_match",
      method_path: "/api/send_match.php",
      match: match
    },
    handleSetDataResponse
  );
}

export function httpSetDraft(draft: any): void {
  const _id = makeId(6);
  draft = JSON.stringify(draft);
  httpQueue.push(
    {
      reqId: _id,
      method: "set_draft",
      method_path: "/api/send_draft.php",
      draft: draft
    },
    handleSetDataResponse
  );
}

export function httpSetEconomy(change: any): void {
  const _id = makeId(6);
  change = JSON.stringify(change);
  httpQueue.push(
    {
      reqId: _id,
      method: "set_economy",
      method_path: "/api/send_economy.php",
      change: change
    },
    handleSetDataResponse
  );
}

export function httpSetSeasonal(change: any): void {
  const _id = makeId(6);
  change = JSON.stringify(change);
  httpQueue.push(
    {
      reqId: _id,
      method: "set_seasonal",
      method_path: "/api/send_seasonal.php",
      change: change
    },
    handleSetDataResponse
  );
}

export function httpSetSettings(settings: any): void {
  const _id = makeId(6);
  settings = JSON.stringify(settings);
  httpQueue.push(
    {
      reqId: _id,
      method: "set_settings",
      method_path: "/api/send_settings.php",
      settings: settings
    },
    handleSetDataResponse
  );
}

export function httpDeleteData(): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "delete_data",
      method_path: "/api/delete_data.php"
    },
    makeSimpleResponseHandler()
  );
}

export function httpGetDatabase(lang: string): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "get_database",
      method_path: "/database/" + lang,
      lang: lang
    },
    handleGetDatabaseResponse
  );
}

function handleGetDatabaseResponse(
  error?: Error | null,
  task?: HttpTask,
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
}

export function httpGetDatabaseVersion(lang: string): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "get_database_version",
      method_path: "/database/latest/" + lang
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
          time: 5000
        });
        ipcLog(
          `Downloading database (had lang ${db.metadata.language}, needed ${parsedResult.lang})`
        );
        httpGetDatabase(lang);
      } else if (parsedResult.latest > db.version) {
        // Compare parsedResult.version with stored version
        ipcSend("popup", {
          text: `Downloading latest Database (v${parsedResult.latest})`,
          time: 5000
        });
        ipcLog(
          `Downloading latest database (had v${db.version}, found v${parsedResult.latest})`
        );
        httpGetDatabase(lang);
      } else {
        ipcSend("popup", {
          text: `Database up to date (v${db.version})`,
          time: 5000
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
  httpQueue.push(
    {
      reqId: _id,
      method: "share_draft",
      method_path: "/api/get_share_draft.php",
      id: did,
      draft: draftData,
      expire: exp
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_draft_link", parsedResult.url);
    })
  );
}

export function httpLogShareLink(lid: string, log: any, exp: any): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "share_log",
      method_path: "/api/get_share_log.php",
      id: lid,
      log: log,
      expire: exp
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_log_link", parsedResult.url);
    })
  );
}

export function httpDeckShareLink(deck: any, exp: any): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "share_deck",
      method_path: "/api/get_share_deck.php",
      deck: deck,
      expire: exp
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_deck_link", parsedResult.url);
    })
  );
}

export function httpHomeGet(set: string): void {
  const _id = makeId(6);
  httpQueue.unshift(
    {
      reqId: _id,
      method: "home_get",
      set: set,
      method_path: "/api/get_home.php"
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("set_home", parsedResult);
    })
  );
}

export function httpSetMythicRank(opp: string, rank: string): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "mythicrank",
      method_path: "/api/send_mythic_rank.php",
      opp: opp,
      rank: rank
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
      quantity: 1
    };
  });
  httpQueue.push(
    {
      reqId: _id,
      method: "set_deck_tag",
      method_path: "/api/send_deck_tag.php",
      tag: tag,
      cards: JSON.stringify(cards),
      format: format
    },
    handleSetDataResponse
  );
}

export interface SyncRequestData {
  courses?: any[];
  matches?: any[];
  drafts?: any[];
  economy?: any[];
  seasonal?: any[];
}

export function httpSyncRequest(data: SyncRequestData): void {
  const _id = makeId(6);
  httpQueue.push(
    {
      reqId: _id,
      method: "get_sync",
      method_path: "/api/get_sync.php",
      data: JSON.stringify(data)
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      syncUserData(parsedResult.data);
    })
  );
}
