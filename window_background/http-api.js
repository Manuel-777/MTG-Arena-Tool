/*
global
  tokenAuth
  rstore
  loadPlayerConfig
  db
  playerData
  debugNet
  debugLog
  syncUserData
*/

const electron = require("electron");
const async = require("async");
const qs = require("qs");

const { makeId } = require("../shared/util");
const { ipc_send, setData } = require("./background-util");

let metadataState = false;

var httpAsync = [];

const serverAddress = "mtgatool.com";

function httpBasic() {
  var httpAsyncNew = httpAsync.slice(0);
  //var str = ""; httpAsync.forEach( function(h) {str += h.reqId+", "; }); console.log("httpAsync: ", str);
  async.forEachOfSeries(
    httpAsyncNew,
    function(value, index, callback) {
      var _headers = value;

      if (
        (playerData.settings.send_data == false ||
          playerData.offline == true) &&
        _headers.method != "auth" &&
        _headers.method != "delete_data" &&
        _headers.method != "get_database" &&
        debugLog == false
      ) {
        if (!playerData.offline) setData({ offline: true });
        callback({
          message: "Settings dont allow sending data! > " + _headers.method
        });
        removeFromHttp(_headers.reqId);
        return;
      }

      _headers.token = tokenAuth;

      var http = require("https");
      var options;
      if (_headers.method == "get_database") {
        options = {
          protocol: "https:",
          port: 443,
          hostname: serverAddress,
          path: "/database/" + _headers.lang,
          method: "GET"
        };
        ipc_send("popup", {
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

      if (debugNet && _headers.method !== "notifications") {
        console.log(
          "SEND >> " + index + ", " + _headers.method,
          _headers,
          options
        );
        ipc_send(
          "ipc_log",
          "SEND >> " +
            index +
            ", " +
            _headers.method +
            ", " +
            _headers.reqId +
            ", " +
            _headers.token
        );
      }

      // console.log("POST", _headers);
      var post_data = qs.stringify(_headers);
      options.headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": post_data.length
      };

      var results = "";
      var req = http.request(options, function(res) {
        if (res.statusCode < 200 || res.statusCode > 299) {
          ipc_send("popup", {
            text: `Error with request. (${_headers.method}: ${res.statusCode})`,
            time: 2000,
            progress: -1
          });
        } else {
          res.on("data", function(chunk) {
            results = results + chunk;
          });
          res.on("end", function() {
            if (debugNet) {
              if (_headers.method !== "notifications") {
                ipc_send(
                  "ipc_log",
                  "RECV << " +
                    index +
                    ", " +
                    _headers.method +
                    ", " +
                    results.slice(0, 100)
                );
                console.log(
                  "RECV << " + index,
                  _headers.method,
                  _headers.method == "auth" ? results : results.slice(0, 500)
                );
              }
            }
            if (_headers.method == "notifications") {
              notificationSetTimeout();
            }
            try {
              var parsedResult = null;
              try {
                parsedResult = JSON.parse(results);
              } catch (e) {
                if (debugNet) {
                  console.log(results);
                }
                ipc_send("popup", {
                  text: `Error parsing response. (${_headers.method})`,
                  time: 2000,
                  progress: -1
                });
              }

              if (_headers.method == "discord_unlink") {
                ipc_send("popup", {
                  text: "Unlink Ok",
                  time: 1000,
                  progress: -1
                });
                ipc_send("set_discord_tag", "");
              }
              if (_headers.method == "get_database_version") {
                let lang = playerData.settings.metadata_lang;
                if (
                  db.data.language &&
                  parsedResult.lang.toLowerCase() !==
                    db.data.language.toLowerCase()
                ) {
                  // compare language
                  console.log(
                    `Downloading database (had lang ${
                      db.data.language
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
                ipc_send("set_explore_decks", parsedResult);
              }
              if (_headers.method == "get_ladder_decks") {
                ipc_send("set_ladder_decks", parsedResult);
              }
              if (_headers.method == "get_ladder_traditional_decks") {
                ipc_send("set_ladder_traditional_decks", parsedResult);
              }
              if (parsedResult && parsedResult.ok) {
                if (_headers.method == "auth") {
                  tokenAuth = parsedResult.token;

                  ipc_send("auth", parsedResult);
                  //ipc_send("auth", parsedResult.arenaids);
                  if (playerData.settings.remember_me) {
                    rstore.set("token", tokenAuth);
                    rstore.set("email", playerData.userName);
                  }
                  const data = {};
                  data.patreon = parsedResult.patreon;
                  data.patreon_tier = parsedResult.patreon_tier;

                  let serverData = {
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
                  loadPlayerConfig(playerData.arenaId, serverData);
                  ipc_send("set_discord_tag", parsedResult.discord_tag);
                  httpNotificationsPull();
                }
                if (
                  _headers.method == "tou_join" ||
                  _headers.method == "tou_drop"
                ) {
                  httpTournamentGet(parsedResult.id);
                }
                if (_headers.method == "get_top_decks") {
                  ipc_send("set_explore", parsedResult.result);
                }
                if (_headers.method == "get_course") {
                  ipc_send("open_course_deck", parsedResult.result);
                }
                if (_headers.method == "share_draft") {
                  ipc_send("set_draft_link", parsedResult.url);
                }
                if (_headers.method == "share_log") {
                  ipc_send("set_log_link", parsedResult.url);
                }
                if (_headers.method == "share_deck") {
                  ipc_send("set_deck_link", parsedResult.url);
                }
                if (_headers.method == "home_get") {
                  ipc_send("set_home", parsedResult);
                }
                if (_headers.method == "tou_get") {
                  ipc_send("tou_set", parsedResult.result);
                }
                if (_headers.method == "tou_check") {
                  //ipc_send("tou_set_game", parsedResult.result);
                }
                if (_headers.method == "get_sync") {
                  syncUserData(parsedResult.data);
                }

                if (_headers.method == "get_database") {
                  //resetLogLoop(100);
                  metadataState = true;
                  delete parsedResult.ok;
                  ipc_send("popup", {
                    text: "Metadata: Ok",
                    time: 1000,
                    progress: -1
                  });
                  db.handleSetDb(null, results);
                  db.updateCache(results);
                  ipc_send("set_db", results);
                  // autologin users may beat the metadata request
                  // manually trigger a UI refresh just in case
                  ipc_send("player_data_refresh");
                }
              } else if (_headers.method == "tou_join") {
                ipc_send("popup", {
                  text: parsedResult.error,
                  time: 10000
                });
              } else if (_headers.method == "tou_check") {
                let notif = new Notification("MTG Arena Tool", {
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
                  ipc_send("popup", {
                    text: parsedResult.error,
                    time: 3000
                  });
                }
                if (_headers.method == "auth") {
                  tokenAuth = undefined;
                  rstore.set("email", "");
                  rstore.set("token", "");
                  ipc_send("auth", {});
                  ipc_send("toggle_login", true);
                  ipc_send("clear_pwd", 1);
                  ipc_send("popup", {
                    text: `Error: ${parsedResult.error}`,
                    time: 3000,
                    progress: -1
                  });
                }
                // errors here
              } else if (!parsedResult && _headers.method == "auth") {
                ipc_send("auth", {});
                ipc_send("popup", {
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

            removeFromHttp(_headers.reqId);
            if (debugNet && _headers.method !== "notifications") {
              var str = "";
              httpAsync.forEach(function(h) {
                str += h.reqId + ", ";
              });
              ipc_send("ipc_log", "httpAsync: " + str);
            }
          });
        }
      });
      req.on("error", function(e) {
        console.error(`problem with request ${_headers.method}: ${e.message}`);
        console.log(req);
        ipc_send("popup", {
          text: `Request error. (${e.message})`,
          time: 0,
          progress: -1
        });

        callback(e);
        removeFromHttp(_headers.reqId);
        ipc_send("ipc_log", e.message);
      });
      req.write(post_data);
      // console.log(req);
      req.end();
    },
    function(err) {
      if (err) {
        ipc_send("ipc_log", "httpBasic() Error: " + err.message);
      }
      // do it again
      setTimeout(function() {
        httpBasic();
      }, 250);
    }
  );
}

function removeFromHttp(req) {
  httpAsync.forEach(function(h, i) {
    if (h.reqId == req) {
      httpAsync.splice(i, 1);
    }
  });
}

function httpNotificationsPull() {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "notifications",
    method_path: "/api/pull.php"
  });
}

function notificationProcess(data) {
  if (!data) return;
  data.notifications.forEach(str => {
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
          ipc_send(str.task, str.value);
        }
      }
    }
  });
}

function notificationSetTimeout() {
  // Here we should probably do some "smarter" pull
  // Like, check if arena is open at all, if we are in a tourney, if we
  // just submitted some data that requires notification pull, etc
  // Based on that adjust the timeout for the next pull or call
  // this function again if no pull is required.
  setTimeout(httpNotificationsPull, 10000);
}

function httpAuth(userName, pass) {
  var _id = makeId(6);
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

function httpSubmitCourse(course) {
  var _id = makeId(6);
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

function httpSetPlayer() {
  // useless I think
  //var _id = makeId(6);
  //httpAsync.push({'reqId': _id, 'method': 'set_player', 'name': name, 'rank': rank, 'tier': tier});
}

function httpGetExplore(query) {
  var _id = makeId(6);
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

function httpGetTopLadderDecks() {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "get_ladder_decks",
    method_path: "/top_ladder.json"
  });
}

function httpGetTopLadderTraditionalDecks() {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "get_ladder_traditional_decks",
    method_path: "/top_ladder_traditional.json"
  });
}

function httpGetCourse(courseId) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "get_course",
    method_path: "/api/get_course.php",
    courseid: courseId
  });
}

function httpSetMatch(match) {
  var _id = makeId(6);
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

function httpSetDraft(draft) {
  var _id = makeId(6);
  draft = JSON.stringify(draft);
  httpAsync.push({
    reqId: _id,
    method: "set_draft",
    method_path: "/api/send_draft.php",
    draft: draft
  });
}

function httpSetEconomy(change) {
  var _id = makeId(6);
  change = JSON.stringify(change);
  httpAsync.push({
    reqId: _id,
    method: "set_economy",
    method_path: "/api/send_economy.php",
    change: change
  });
}

function httpSetSeasonal(change) {
  var _id = makeId(6);
  change = JSON.stringify(change);
  httpAsync.push({
    reqId: _id,
    method: "set_seasonal",
    method_path: "/api/send_seasonal.php",
    change: change
  });
}

function httpSetSettings(settings) {
  var _id = makeId(6);
  settings = JSON.stringify(settings);
  httpAsync.push({
    reqId: _id,
    method: "set_settings",
    method_path: "/api/send_settings.php",
    settings: settings
  });
}

function httpDeleteData() {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "delete_data",
    method_path: "/api/delete_data.php"
  });
}

function httpGetDatabase(lang) {
  var _id = makeId(6);
  httpAsync.push({ reqId: _id, method: "get_database", lang: lang });
}

function httpGetDatabaseVersion(lang) {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "get_database_version",
    method_path: "/database/latest/" + lang
  });
}

function httpDraftShareLink(did, exp, draftData) {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "share_draft",
    method_path: "/api/get_share_draft.php",
    id: did,
    draft: draftData,
    expire: exp
  });
}

function httpLogShareLink(lid, log, exp) {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "share_log",
    method_path: "/api/get_share_log.php",
    id: lid,
    log: log,
    expire: exp
  });
}

function httpDeckShareLink(deck, exp) {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "share_deck",
    method_path: "/api/get_share_deck.php",
    deck: deck,
    expire: exp
  });
}

function httpHomeGet(set) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "home_get",
    set: set,
    method_path: "/api/get_home.php"
  });
}

function httpTournamentGet(tid) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_get",
    method_path: "/api/tournament_get.php",
    id: tid
  });
}

function httpTournamentJoin(tid, _deck, pass) {
  let _id = makeId(6);
  let deck = JSON.stringify(playerData.deck(_deck));
  httpAsync.unshift({
    reqId: _id,
    method: "tou_join",
    method_path: "/api/tournament_join.php",
    id: tid,
    deck: deck,
    pass: pass
  });
}

function httpTournamentDrop(tid) {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_drop",
    method_path: "/api/tournament_drop.php",
    id: tid
  });
}

function httpTournamentCheck(deck, opp, setCheck, bo3 = "", playFirst = "") {
  var _id = makeId(6);
  deck = JSON.stringify(deck);
  httpAsync.unshift({
    reqId: _id,
    method: "tou_check",
    method_path: "/api/check_match.php",
    deck: deck,
    opp: opp,
    setcheck: setCheck,
    bo3: bo3,
    play_first: playFirst
  });
}

function httpSetMythicRank(opp, rank) {
  var _id = makeId(6);
  httpAsync.push({
    reqId: _id,
    method: "mythicrank",
    method_path: "/api/send_mythic_rank.php",
    opp: opp,
    rank: rank
  });
}

function httpSetDeckTag(tag, cards, format) {
  var _id = makeId(6);
  cards.forEach(card => {
    card.quantity = 1;
  });
  cards = JSON.stringify(cards);
  httpAsync.push({
    reqId: _id,
    method: "set_deck_tag",
    method_path: "/api/send_deck_tag.php",
    tag: tag,
    cards: cards,
    format: format
  });
}

function httpSyncRequest(data) {
  var _id = makeId(6);
  data = JSON.stringify(data);
  httpAsync.push({
    reqId: _id,
    method: "get_sync",
    method_path: "/api/get_sync.php",
    data: data
  });
}

function httpDiscordUnlink() {
  var _id = makeId(6);
  httpAsync.unshift({
    reqId: _id,
    method: "discord_unlink",
    method_path: "/api/discord_unlink.php"
  });
}

module.exports = {
  httpAuth,
  httpBasic,
  httpDiscordUnlink,
  httpSubmitCourse,
  httpSetPlayer,
  httpGetExplore,
  httpGetTopLadderDecks,
  httpGetTopLadderTraditionalDecks,
  httpGetCourse,
  httpSetMatch,
  httpSetDraft,
  httpSetEconomy,
  httpSetSeasonal,
  httpSetSettings,
  httpDeleteData,
  httpGetDatabase,
  httpGetDatabaseVersion,
  httpHomeGet,
  httpDraftShareLink,
  httpLogShareLink,
  httpDeckShareLink,
  httpTournamentGet,
  httpTournamentJoin,
  httpTournamentDrop,
  httpTournamentCheck,
  httpSetMythicRank,
  httpSetDeckTag,
  httpSyncRequest
};
