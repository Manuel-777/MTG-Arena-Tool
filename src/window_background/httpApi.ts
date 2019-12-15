import electron from "electron";
import async from "async";

import { makeId } from "../shared/util";
import pd from "../shared/player-data";
import db from "../shared/database";
import { appDb, playerDb } from "../shared/db/LocalDatabase";

import { ipc_send as ipcSend, setData } from "./background-util";
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
import { SerializedDeck } from "../shared/types/Deck";

export const playerData = pd as any;
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
  const courses_index = [...playerData.courses_index];
  data.courses
    .filter((doc: any) => !playerData.eventExists(doc._id))
    .forEach((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      courses_index.push(id);
      playerDb.upsert("", id, doc);
      setData({ [id]: doc }, false);
    });
  playerDb.upsert("", "courses_index", courses_index);

  // Sync Matches
  const matches_index = [...playerData.matches_index];
  data.matches
    .filter((doc: any) => !playerData.matchExists(doc._id))
    .forEach((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      matches_index.push(id);
      playerDb.upsert("", id, doc);
      setData({ [id]: doc }, false);
    });
  playerDb.upsert("", "matches_index", matches_index);

  // Sync Economy
  const economy_index = [...playerData.economy_index];
  data.economy
    .filter((doc: any) => !playerData.transactionExists(doc._id))
    .forEach((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      economy_index.push(id);
      playerDb.upsert("", id, doc);
      setData({ [id]: doc }, false);
    });
  playerDb.upsert("", "economy_index", economy_index);

  // Sync Drafts
  const draft_index = [...playerData.draft_index];
  data.drafts
    .filter((doc: any) => !playerData.draftExists(doc._id))
    .forEach((doc: any) => {
      const id = doc._id;
      doc.id = id;
      delete doc._id;
      draft_index.push(id);
      playerDb.upsert("", id, doc);
      setData({ [id]: doc }, false);
    });
  playerDb.upsert("", "draft_index", draft_index);

  // Sync seasonal
  data.seasonal.forEach((doc: any) => {
    const id = doc._id;
    doc.id = id;
    delete doc._id;

    const seasonal_rank = playerData.addSeasonalRank(
      doc,
      doc.seasonOrdinal,
      doc.rankUpdateType
    );
    setData({ seasonal_rank });

    const seasonal = { ...playerData.seasonal, [id]: doc };
    setData({ seasonal });

    playerDb.upsert("seasonal", id, doc);
    playerDb.upsert("", "seasonal_rank", seasonal_rank);
  });

  if (data.settings.tags_colors) {
    const newTags = data.settings.tags_colors;
    setData({ tags_colors: { ...newTags } });
    playerDb.upsert("", "tags_colors", newTags);
  }

  setData({ courses_index, draft_index, economy_index, matches_index });
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
  setTimeout(httpNotificationsPull, 10000);

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
  setData({ userName }, false);
  httpQueue.push(
    {
      reqId: _id,
      method: "auth",
      method_path: "/api/login.php",
      email: userName,
      password: pass,
      playerid: playerData.arenaId,
      playername: encodeURIComponent(playerData.name),
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
  if (error) {
    syncSettings({ token: "" }, false);
    appDb.upsert("", "email", "");
    appDb.upsert("", "token", "");
    ipcSend("auth", {});
    ipcSend("toggle_login", true);
    ipcSend("clear_pwd", 1);
    ipcPop({
      text: error.message,
      time: 3000,
      progress: -1
    });
    return;
  }

  syncSettings({ token: parsedResult.token }, false);

  ipcSend("auth", parsedResult);
  //ipc_send("auth", parsedResult.arenaids);
  if (playerData.settings.remember_me) {
    appDb.upsert("", "token", parsedResult.token);
    appDb.upsert("", "email", playerData.userName);
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
  loadPlayerConfig(playerData.arenaId).then(() => {
    ipcLog("...called back to http-api.");
    ipcLog("Checking for sync requests...");
    const requestSync = {
      courses: serverData.courses.filter(id => !(id in playerData)),
      matches: serverData.matches.filter(id => !(id in playerData)),
      drafts: serverData.drafts.filter(id => !(id in playerData)),
      economy: serverData.economy.filter(id => !(id in playerData)),
      seasonal: serverData.seasonal.filter(id => !(id in playerData.seasonal))
    };

    if (requestSync) {
      ipcLog("Fetch remote player items");
      // console.log(requestSync);
      httpSyncRequest(requestSync);
    } else {
      ipcLog("No need to fetch remote player items.");
    }
    httpNotificationsPull();
  });
  ipcSend("set_discord_tag", parsedResult.discord_tag);
}

export function httpSubmitCourse(course: any): void {
  const _id = makeId(6);
  if (playerData.settings.anon_explore == true) {
    course.PlayerId = "000000000000000";
    course.PlayerName = "Anonymous";
  }
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
      filter_ranks: query.filteredranks,
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
  if (playerData.settings.anon_explore == true) {
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
    // autologin users may beat the metadata request
    // manually trigger a UI refresh just in case
    ipcSend("player_data_refresh");
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
      const lang = playerData.settings.metadata_lang;
      if (
        db.metadata &&
        db.metadata.language &&
        parsedResult.lang.toLowerCase() !== db.metadata.language.toLowerCase()
      ) {
        // compare language
        ipcLog(
          `Downloading database (had lang ${db.metadata.language}, needed ${parsedResult.lang})`
        );
        httpGetDatabase(lang);
      } else if (parsedResult.latest > db.version) {
        // Compare parsedResult.version with stored version
        ipcLog(
          `Downloading latest database (had v${db.version}, found v${parsedResult.latest})`
        );
        httpGetDatabase(lang);
      } else {
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

export function httpTournamentGet(tid: string): void {
  const _id = makeId(6);
  httpQueue.unshift(
    {
      reqId: _id,
      method: "tou_get",
      method_path: "/api/tournament_get.php",
      id: tid
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      ipcSend("tou_set", parsedResult.result);
    })
  );
}

export function httpTournamentJoin(
  tid: string,
  deckId: string,
  pass: string
): void {
  const _id = makeId(6);
  const deck = JSON.stringify(playerData.deck(deckId));
  httpQueue.unshift(
    {
      reqId: _id,
      method: "tou_join",
      method_path: "/api/tournament_join.php",
      id: tid,
      deck: deck,
      pass: pass
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      httpTournamentGet(parsedResult.id);
    })
  );
}

export function httpTournamentDrop(tid: string): void {
  const _id = makeId(6);
  httpQueue.unshift(
    {
      reqId: _id,
      method: "tou_drop",
      method_path: "/api/tournament_drop.php",
      id: tid
    },
    makeSimpleResponseHandler((parsedResult: any) => {
      httpTournamentGet(parsedResult.id);
    })
  );
}

export function httpTournamentCheck(
  deck: SerializedDeck,
  opp: string,
  setCheck: boolean,
  playFirst = "",
  bo3 = ""
): void {
  const _id = makeId(6);
  httpQueue.unshift(
    {
      reqId: _id,
      method: "tou_check",
      method_path: "/api/check_match.php",
      deck: JSON.stringify(deck),
      opp: opp,
      setcheck: setCheck + "",
      bo3: bo3,
      play_first: playFirst
    },
    handleTournamentCheckResponse
  );
}

function handleTournamentCheckResponse(
  error?: Error | null,
  task?: HttpTask,
  results?: string,
  parsedResult?: any
): void {
  // TODO ask Manwe about this
  if (error && parsedResult && parsedResult.state) {
    new Notification("MTG Arena Tool", {
      body: parsedResult.state
    });
  }
  //ipc_send("tou_set_game", parsedResult.result);
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

export function httpDiscordUnlink(): void {
  const _id = makeId(6);
  httpQueue.unshift(
    {
      reqId: _id,
      method: "discord_unlink",
      method_path: "/api/discord_unlink.php"
    },
    makeSimpleResponseHandler(() => {
      ipcPop({
        text: "Unlink Ok",
        time: 1000,
        progress: -1
      });
      ipcSend("set_discord_tag", "");
    })
  );
}
