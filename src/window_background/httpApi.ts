import electron from "electron";
import async from "async";
import qs from "qs";
import http from "https";

import { makeId } from "../shared/util";
import pd from "../shared/player-data";
import db from "../shared/database";
import { appDb, playerDb } from "../shared/db/LocalDatabase";

import globals from "./globals";
import { ipc_send as ipcSend, setData } from "./background-util";
import { loadPlayerConfig, syncSettings } from "./loadPlayerConfig";
import { DeckData } from "./data";

const serverAddress = "mtgatool.com";
const playerData = pd as any;
let httpAsync: async.AsyncQueue<HttpTask>;

interface HttpTask {
  reqId: string;
  method: string;
  method_path: string;
  [key: string]: string;
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

function asyncWorker(task: HttpTask, callback: any): void {
  const _headers: any = { ...task };

  if (
    (playerData.settings.send_data == false || playerData.offline == true) &&
    _headers.method != "auth" &&
    _headers.method != "delete_data" &&
    _headers.method != "get_database" &&
    globals.debugLog == false
  ) {
    if (!playerData.offline) setData({ offline: true });
    callback({
      name: "Error",
      message: "Settings dont allow sending data! > " + _headers.method
    });
    return;
  }

  _headers.token = playerData.settings.token;

  let options: any;
  if (_headers.method == "get_database") {
    options = {
      protocol: "https:",
      port: 443,
      hostname: serverAddress,
      path: "/database/" + _headers.lang,
      method: "GET"
    };
    ipcSend("popup", {
      text: "Downloading metadata...",
      time: 0,
      progress: 2
    });
  } else if (_headers.method == "get_ladder_decks") {
    options = {
      protocol: "https:",
      port: 443,
      hostname: serverAddress,
      path: "/top_ladder.json",
      method: "GET"
    };
  } else if (_headers.method == "get_ladder_traditional_decks") {
    options = {
      protocol: "https:",
      port: 443,
      hostname: serverAddress,
      path: "/top_ladder_traditional.json",
      method: "GET"
    };
  } else if (_headers.method_path !== undefined) {
    options = {
      protocol: "https:",
      port: 443,
      hostname: serverAddress,
      path: _headers.method_path,
      method: "POST"
    };
  } else {
    options = {
      protocol: "https:",
      port: 443,
      hostname: serverAddress,
      path: "/api.php",
      method: "POST"
    };
  }

  if (globals.debugNet && _headers.method !== "notifications") {
    console.log("SEND >> " + _headers.method, _headers, options);
    ipcSend(
      "ipc_log",
      "SEND >> " +
        _headers.method +
        ", " +
        _headers.reqId +
        ", " +
        _headers.token
    );
  }

  // console.log("POST", _headers);
  const postData = qs.stringify(_headers);
  options.headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": postData.length
  };

  let results = "";
  const req = http.request(options, function(res: any) {
    if (res.statusCode < 200 || res.statusCode > 299) {
      ipcSend("popup", {
        text: `Error with request. (${_headers.method}: ${res.statusCode})`,
        time: 2000,
        progress: -1
      });
    } else {
      res.on("data", function(chunk: any) {
        results = results + chunk;
      });
      /* eslint-disable-next-line complexity */
      res.on("end", function() {
        if (globals.debugNet) {
          if (_headers.method !== "notifications") {
            ipcSend(
              "ipc_log",
              "RECV << " + _headers.method + ", " + results.slice(0, 100)
            );
            console.log(
              "RECV << " + _headers.method,
              _headers.method,
              _headers.method == "auth" ? results : results.slice(0, 500)
            );
          }
        }
        if (_headers.method == "notifications") {
          notificationSetTimeout();
        }
        try {
          let parsedResult = null;
          try {
            parsedResult = JSON.parse(results);
          } catch (e) {
            if (globals.debugNet) {
              console.log(results);
            }
            ipcSend("popup", {
              text: `Error parsing response. (${_headers.method})`,
              time: 2000,
              progress: -1
            });
          }

          if (_headers.method == "discord_unlink") {
            ipcSend("popup", {
              text: "Unlink Ok",
              time: 1000,
              progress: -1
            });
            ipcSend("set_discord_tag", "");
          }
          if (_headers.method == "get_database_version") {
            const lang = playerData.settings.metadata_lang;
            if (
              db.metadata &&
              db.metadata.language &&
              parsedResult.lang.toLowerCase() !==
                db.metadata.language.toLowerCase()
            ) {
              // compare language
              console.log(
                `Downloading database (had lang ${
                  db.metadata.language
                }, needed ${parsedResult.lang})`
              );
              httpGetDatabase(lang);
            } else if (parsedResult.latest > db.version) {
              // Compare parsedResult.version with stored version
              console.log(
                `Downloading latest database (had v${db.version}, found v${
                  parsedResult.latest
                })`
              );
              httpGetDatabase(lang);
            } else {
              console.log(
                `Database up to date (${db.version}), skipping download.`
              );
            }
          }
          if (_headers.method == "notifications") {
            notificationProcess(parsedResult);
          }
          if (_headers.method == "get_explore") {
            ipcSend("set_explore_decks", parsedResult);
          }
          if (_headers.method == "get_ladder_decks") {
            ipcSend("set_ladder_decks", parsedResult);
          }
          if (_headers.method == "get_ladder_traditional_decks") {
            ipcSend("set_ladder_traditional_decks", parsedResult);
          }
          if (parsedResult && parsedResult.ok) {
            if (_headers.method == "auth") {
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
                ipcSend("ipc_log", "...called back to http-api.");
                ipcSend("ipc_log", "Checking for sync requests...");
                const requestSync = {
                  courses: serverData.courses.filter(id => !(id in playerData)),
                  matches: serverData.matches.filter(id => !(id in playerData)),
                  drafts: serverData.drafts.filter(id => !(id in playerData)),
                  economy: serverData.economy.filter(id => !(id in playerData)),
                  seasonal: serverData.seasonal.filter(
                    id => !(id in playerData.seasonal)
                  )
                };

                if (requestSync) {
                  ipcSend("ipc_log", "Fetch remote player items");
                  console.log(requestSync);
                  httpSyncRequest(requestSync);
                } else {
                  ipcSend("ipc_log", "No need to fetch remote player items.");
                }
                httpNotificationsPull();
              });
              ipcSend("set_discord_tag", parsedResult.discord_tag);
            }
            if (
              _headers.method == "tou_join" ||
              _headers.method == "tou_drop"
            ) {
              httpTournamentGet(parsedResult.id);
            }
            if (_headers.method == "get_top_decks") {
              ipcSend("set_explore", parsedResult.result);
            }
            if (_headers.method == "get_course") {
              ipcSend("open_course_deck", parsedResult.result);
            }
            if (_headers.method == "share_draft") {
              ipcSend("set_draft_link", parsedResult.url);
            }
            if (_headers.method == "share_log") {
              ipcSend("set_log_link", parsedResult.url);
            }
            if (_headers.method == "share_deck") {
              ipcSend("set_deck_link", parsedResult.url);
            }
            if (_headers.method == "home_get") {
              ipcSend("set_home", parsedResult);
            }
            if (_headers.method == "tou_get") {
              ipcSend("tou_set", parsedResult.result);
            }
            if (_headers.method == "tou_check") {
              //ipc_send("tou_set_game", parsedResult.result);
            }
            if (_headers.method == "get_sync") {
              syncUserData(parsedResult.data);
            }

            if (_headers.method == "get_database") {
              //resetLogLoop(100);
              delete parsedResult.ok;
              ipcSend("ipc_log", "Metadata: Ok");
              db.handleSetDb(null, results);
              db.updateCache(results);
              ipcSend("set_db", results);
              // autologin users may beat the metadata request
              // manually trigger a UI refresh just in case
              ipcSend("player_data_refresh");
            }
          } else if (_headers.method == "tou_join") {
            ipcSend("popup", {
              text: parsedResult.error,
              time: 10000
            });
          } else if (_headers.method == "tou_check") {
            new Notification("MTG Arena Tool", {
              body: parsedResult.state
            });
            //ipc_send("popup", {"text": parsedResult.state, "time": 10000});
          } else if (
            parsedResult &&
            parsedResult.ok == false &&
            parsedResult.error != undefined
          ) {
            if (
              _headers.method == "share_draft" ||
              _headers.method == "share_log" ||
              _headers.method == "share_deck"
            ) {
              ipcSend("popup", {
                text: parsedResult.error,
                time: 3000
              });
            }
            if (_headers.method == "auth") {
              syncSettings({ token: "" }, false);
              appDb.upsert("", "email", "");
              appDb.upsert("", "token", "");
              ipcSend("auth", {});
              ipcSend("toggle_login", true);
              ipcSend("clear_pwd", 1);
              ipcSend("popup", {
                text: `Error: ${parsedResult.error}`,
                time: 3000,
                progress: -1
              });
            }
            // errors here
          } else if (!parsedResult && _headers.method == "auth") {
            ipcSend("auth", {});
            ipcSend("popup", {
              text: "Something went wrong, please try again",
              time: 5000,
              progress: -1
            });
          }
        } catch (e) {
          console.error(e);
        }
        try {
          callback();
        } catch (e) {
          //
        }

        if (globals.debugNet && _headers.method !== "notifications") {
          ipcSend("ipc_log", "httpAsync: " + _headers.method);
        }
      });
    }
  });
  req.on("error", function(e: Error) {
    console.error(`problem with request ${_headers.method}: ${e.message}`);
    console.log(req);
    ipcSend("popup", {
      text: `Request error. (${e.message})`,
      time: 20000,
      progress: -1
    });

    callback(e);
    ipcSend("ipc_log", e.message);
  });
  req.write(postData);
  // console.log(req);
  req.end();
}

export function initHttpQueue(): void {
  httpAsync = async.queue(asyncWorker);
  httpAsync.error(function(err, task) {
    if (err) {
      ipcSend("ipc_log", "httpBasic() Error: " + err.message);
    }
    // do it again
    setTimeout(function() {
      httpAsync.push(task);
    }, 250);
  });
}

export function httpNotificationsPull(): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "notifications",
    method_path: "/api/pull.php"
  });
}

function notificationProcess(data: any): void {
  if (!data || !data.notifications) return;
  data.notifications.forEach((str: any) => {
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

function notificationSetTimeout(): void {
  // Here we should probably do some "smarter" pull
  // Like, check if arena is open at all, if we are in a tourney, if we
  // just submitted some data that requires notification pull, etc
  // Based on that adjust the timeout for the next pull or call
  // this function again if no pull is required.
  setTimeout(httpNotificationsPull, 10000);
}

export function httpAuth(userName: string, pass: string): void {
  const _id = makeId(6);
  setData({ userName }, false);
  httpAsync.push({
    reqId: _id,
    method: "auth",
    method_path: "/api/login.php",
    email: userName,
    password: pass,
    playerid: playerData.arenaId,
    playername: encodeURIComponent(playerData.name),
    mtgaversion: playerData.arenaVersion,
    version: electron.remote.app.getVersion()
  });
}

export function httpSubmitCourse(course: any): void {
  const _id = makeId(6);
  if (playerData.settings.anon_explore == true) {
    course.PlayerId = "000000000000000";
    course.PlayerName = "Anonymous";
  }
  course.playerRank = playerData.rank.limited.rank;
  course = JSON.stringify(course);
  httpAsync.push({
    reqId: _id,
    method: "submit_course",
    method_path: "/api/send_course.php",
    course: course
  });
}

export function httpGetExplore(query: any): void {
  const _id = makeId(6);
  httpAsync.unshift({
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
  });
}

export function httpGetTopLadderDecks(): void {
  const _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "get_ladder_decks",
    method_path: "/top_ladder.json"
  });
}

export function httpGetTopLadderTraditionalDecks(): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "get_ladder_traditional_decks",
    method_path: "/top_ladder_traditional.json"
  });
}

export function httpGetCourse(courseId: string): void {
  const _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "get_course",
    method_path: "/api/get_course.php",
    courseid: courseId
  });
}

export function httpSetMatch(match: any): void {
  const _id = makeId(6);
  if (playerData.settings.anon_explore == true) {
    match.player.userid = "000000000000000";
    match.player.name = "Anonymous";
  }
  match = JSON.stringify(match);
  httpAsync.push({
    reqId: _id,
    method: "set_match",
    method_path: "/api/send_match.php",
    match: match
  });
}

export function httpSetDraft(draft: any): void {
  const _id = makeId(6);
  draft = JSON.stringify(draft);
  httpAsync.push({
    reqId: _id,
    method: "set_draft",
    method_path: "/api/send_draft.php",
    draft: draft
  });
}

export function httpSetEconomy(change: any): void {
  const _id = makeId(6);
  change = JSON.stringify(change);
  httpAsync.push({
    reqId: _id,
    method: "set_economy",
    method_path: "/api/send_economy.php",
    change: change
  });
}

export function httpSetSeasonal(change: any): void {
  const _id = makeId(6);
  change = JSON.stringify(change);
  httpAsync.push({
    reqId: _id,
    method: "set_seasonal",
    method_path: "/api/send_seasonal.php",
    change: change
  });
}

export function httpSetSettings(settings: any): void {
  const _id = makeId(6);
  settings = JSON.stringify(settings);
  httpAsync.push({
    reqId: _id,
    method: "set_settings",
    method_path: "/api/send_settings.php",
    settings: settings
  });
}

export function httpDeleteData(): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "delete_data",
    method_path: "/api/delete_data.php"
  });
}

export function httpGetDatabase(lang: string): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "get_database",
    method_path: "/database/" + lang,
    lang: lang
  });
}

export function httpGetDatabaseVersion(lang: string): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "get_database_version",
    method_path: "/database/latest/" + lang
  });
}

export function httpDraftShareLink(
  did: string,
  exp: any,
  draftData: any
): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "share_draft",
    method_path: "/api/get_share_draft.php",
    id: did,
    draft: draftData,
    expire: exp
  });
}

export function httpLogShareLink(lid: string, log: any, exp: any): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "share_log",
    method_path: "/api/get_share_log.php",
    id: lid,
    log: log,
    expire: exp
  });
}

export function httpDeckShareLink(deck: any, exp: any): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "share_deck",
    method_path: "/api/get_share_deck.php",
    deck: deck,
    expire: exp
  });
}

export function httpHomeGet(set: string): void {
  const _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "home_get",
    set: set,
    method_path: "/api/get_home.php"
  });
}

export function httpTournamentGet(tid: string): void {
  const _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_get",
    method_path: "/api/tournament_get.php",
    id: tid
  });
}

export function httpTournamentJoin(
  tid: string,
  deckId: string,
  pass: string
): void {
  const _id = makeId(6);
  const deck = JSON.stringify(playerData.deck(deckId));
  httpAsync.unshift({
    reqId: _id,
    method: "tou_join",
    method_path: "/api/tournament_join.php",
    id: tid,
    deck: deck,
    pass: pass
  });
}

export function httpTournamentDrop(tid: string): void {
  const _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_drop",
    method_path: "/api/tournament_drop.php",
    id: tid
  });
}

export function httpTournamentCheck(
  deck: DeckData,
  opp: string,
  setCheck: boolean,
  playFirst = "",
  bo3 = ""
): void {
  const _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_check",
    method_path: "/api/check_match.php",
    deck: JSON.stringify(deck),
    opp: opp,
    setcheck: setCheck + "",
    bo3: bo3,
    play_first: playFirst
  });
}

export function httpSetMythicRank(opp: string, rank: string): void {
  const _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "mythicrank",
    method_path: "/api/send_mythic_rank.php",
    opp: opp,
    rank: rank
  });
}

export function httpSetDeckTag(
  tag: string,
  deck: DeckData,
  format: string
): void {
  const _id = makeId(6);
  const cards = deck.mainDeck.map((card: any) => {
    return {
      ...card,
      quantity: 1
    };
  });
  httpAsync.push({
    reqId: _id,
    method: "set_deck_tag",
    method_path: "/api/send_deck_tag.php",
    tag: tag,
    cards: JSON.stringify(cards),
    format: format
  });
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
  httpAsync.push({
    reqId: _id,
    method: "get_sync",
    method_path: "/api/get_sync.php",
    data: JSON.stringify(data)
  });
}

export function httpDiscordUnlink(): void {
  const _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "discord_unlink",
    method_path: "/api/discord_unlink.php"
  });
}
