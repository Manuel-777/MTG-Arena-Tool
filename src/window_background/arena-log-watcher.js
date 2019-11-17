import fs from "fs";
import { promisify } from "util";
import { StringDecoder } from "string_decoder";
import queue from "queue";
import ArenaLogDecoder from "./arena-log-decoder/arena-log-decoder";
import playerData from "../shared/player-data";
import {
  onLabelOutLogInfo,
  onLabelGreToClient,
  onLabelClientToMatchServiceMessageTypeClientToGREMessage,
  onLabelInEventGetPlayerCourse,
  onLabelInEventGetPlayerCourseV2,
  onLabelInEventJoin,
  onLabelInEventGetCombinedRankInfo,
  onLabelInDeckGetDeckLists,
  onLabelInDeckGetDeckListsV3,
  onLabelInDeckGetPreconDecks,
  onLabelInEventGetPlayerCourses,
  onLabelInEventGetPlayerCoursesV2,
  onLabelInDeckUpdateDeck,
  onLabelInDeckUpdateDeckV3,
  onLabelInventoryUpdatedV4,
  onLabelPostMatchUpdate,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
  onLabelInProgressionGetPlayerProgress,
  onLabelInEventDeckSubmit,
  onLabelInEventDeckSubmitV3,
  onLabelInEventGetActiveEvents,
  onLabelEventMatchCreated,
  onLabelOutDirectGameChallenge,
  onLabelOutEventAIPractice,
  onLabelInDraftDraftStatus,
  onLabelInDraftMakePick,
  onLabelOutDraftMakePick,
  onLabelInEventCompleteDraft,
  onLabelMatchGameRoomStateChangedEvent,
  onLabelInEventGetSeasonAndRankDetail,
  onLabelGetPlayerInventoryGetRewardSchedule,
  onLabelRankUpdated,
  onLabelMythicRatingUpdated,
  onLabelTrackProgressUpdated,
  onLabelTrackRewardTierUpdated
} from "./labels";
import {
  ipc_send,
  getDateFormat,
  setData,
  updateLoading
} from "./background-util";
import {
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  ARENA_MODE_IDLE
} from "../shared/constants";
import update_deck from "./updateDeck";
import globals from "./globals";

var debugLogSpeed = 0.001;
let logReadEnd = null;

const fsAsync = {
  close: promisify(fs.close),
  open: promisify(fs.open),
  read: promisify(fs.read),
  stat: promisify(fs.stat)
};

export function start({ path, chunkSize, onLogEntry, onError, onFinish }) {
  const q = queue({ concurrency: 1 });
  let position = 0;
  let stringDecoder = new StringDecoder();
  let logDecoder = ArenaLogDecoder();

  schedule();
  const stopWatching = fsWatch(path, schedule, 250);
  return stop;

  function stop() {
    stopWatching();
    q.end();
  }

  function schedule() {
    q.push(attempt);
    q.start();
  }

  async function attempt() {
    try {
      await read();
    } catch (err) {
      onError(err);
    }
  }

  async function read() {
    const { size } = await fsAsync.stat(path);
    if (position > size) {
      // the file has been recreated, we must reset our state
      stringDecoder = new StringDecoder();
      logDecoder = ArenaLogDecoder();
      position = 0;
    }
    while (position < size) {
      if (!playerData.settings.skip_firstpass) {
        const buffer = await readChunk(
          path,
          position,
          Math.min(size - position, chunkSize)
        );
        const text = stringDecoder.write(buffer);
        logDecoder.append(text, entry => onLogEntry({ ...entry, size }));
        position += buffer.length;
      } else {
        position = size;
      }
    }
    onFinish();
  }
}

function fsWatch(path, onChanged, interval) {
  let lastSize;
  let handle;
  start();
  return stop;

  async function start() {
    lastSize = await attemptSize();
    handle = setInterval(checkFile, interval);
  }

  async function checkFile() {
    const size = await attemptSize();
    if (lastSize === size) return;
    lastSize = size;
    onChanged();
  }

  async function attemptSize() {
    try {
      const stats = await fsAsync.stat(path);
      return stats.size;
    } catch (err) {
      if (err.code === "ENOENT") return 0;
      throw err;
    }
  }

  function stop() {
    if (handle) clearInterval(handle);
  }
}

async function readChunk(path, position, length) {
  const buffer = Buffer.alloc(length);
  const fd = await fsAsync.open(path, "r");
  try {
    await fsAsync.read(fd, buffer, 0, length, position);
  } finally {
    await fsAsync.close(fd);
  }
  return buffer;
}

function startWatchingLog() {
  globals.logReadStart = new Date();
  return start({
    path: globals.logUri,
    chunkSize: 268435440,
    onLogEntry: onLogEntryFound,
    onError: err => console.error(err),
    onFinish: finishLoading
  });
}

function onLogEntryFound(entry) {
  if (globals.debugLog) {
    let currentTime = new Date().getTime();
    while (currentTime + debugLogSpeed >= new Date().getTime()) {
      // sleep
    }
  }
  let json;
  if (entry.type == "connection") {
    const data = {
      arenaId: entry.socket.PlayerId,
      arenaVersion: entry.socket.ClientVersion,
      name: entry.socket.PlayerScreenName
    };
    setData(data);
  } else if (entry.playerId && entry.playerId !== playerData.arenaId) {
    return;
  } else {
    //console.log("Entry:", entry.label, entry, entry.json());
    updateLoading(entry);
    if (!(globals.firstPass && playerData.settings.skip_firstpass)) {
      try {
        entrySwitch(entry, json);
        if (entry.timestamp) {
          setData({
            last_log_timestamp: entry.timestamp,
            last_log_format: getDateFormat(entry.timestamp)
          });
        }
      } catch (err) {
        console.log(entry.label, entry.position, entry.json());
        console.error(err);
      }
    }
  }
}

// I want to reduce the complexity for jsPrettier here
// But using strings to call functions is slower than a switch.
// (in my testing)
function entrySwitch(entry, json) {
  switch (entry.label) {
    case "Log.BI":
    case "Log.Info":
      if (entry.arrow == "==>") {
        json = entry.json();
        onLabelOutLogInfo(entry, json);
      }
      break;

    case "GreToClientEvent":
      json = entry.json();
      onLabelGreToClient(entry, json);
      break;

    case "ClientToMatchServiceMessageType_ClientToGREMessage":
      json = entry.json();
      onLabelClientToMatchServiceMessageTypeClientToGREMessage(entry, json);
      break;

    case "Event.GetPlayerCourse":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventGetPlayerCourse(entry, json);
      }
      break;

    case "Event.GetPlayerCourseV2":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventGetPlayerCourseV2(entry, json);
      }
      break;

    case "Event.Join":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventJoin(entry, json);
      }
      break;

    case "Event.GetCombinedRankInfo":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventGetCombinedRankInfo(entry, json);
      }
      break;

    case "Rank.Updated":
      {
        json = entry.json();
        onLabelRankUpdated(entry, json);
      }
      break;

    case "MythicRating.Updated":
      {
        json = entry.json();
        onLabelMythicRatingUpdated(entry, json);
      }
      break;

    case "Event.GetPlayerCourses":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventGetPlayerCourses(entry, json);
      }
      break;

    case "Event.GetPlayerCoursesV2":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventGetPlayerCoursesV2(entry, json);
      }
      break;

    case "Deck.GetDeckLists":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInDeckGetDeckLists(entry, json);
      }
      break;

    case "Deck.GetDeckListsV3":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInDeckGetDeckListsV3(entry, json);
      }
      break;

    case "Deck.GetPreconDecks":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInDeckGetPreconDecks(entry, json);
      }
      break;

    case "Deck.UpdateDeck":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInDeckUpdateDeck(entry, json);
      }
      break;

    case "Deck.UpdateDeckV3":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInDeckUpdateDeckV3(entry, json);
      }
      break;

    case "Inventory.Updated":
      json = entry.json();
      onLabelInventoryUpdatedV4(entry, json);
      break;

    case "PostMatch.Update":
      json = entry.json();
      onLabelPostMatchUpdate(entry, json);
      break;

    case "PlayerInventory.GetPlayerInventory":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInPlayerInventoryGetPlayerInventory(entry, json);
      }
      break;

    case "PlayerInventory.GetPlayerCardsV3":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInPlayerInventoryGetPlayerCardsV3(entry, json);
      }
      break;

    case "Progression.GetPlayerProgress":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInProgressionGetPlayerProgress(entry, json);
      }
      break;

    case "TrackProgress.Updated":
      json = entry.json();
      onLabelTrackProgressUpdated(entry, json);
      break;

    case "TrackRewardTier.Updated":
      json = entry.json();
      onLabelTrackRewardTierUpdated(entry, json);
      break;

    case "Event.DeckSubmit":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventDeckSubmit(entry, json);
      }
      break;

    case "Event.DeckSubmitV3":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventDeckSubmitV3(entry, json);
      }
      break;

    case "Event.MatchCreated":
      json = entry.json();
      onLabelEventMatchCreated(entry, json);
      break;

    case "Event.AIPractice":
      if (entry.arrow == "==>") {
        json = entry.json();
        onLabelOutEventAIPractice(entry, json);
      }
      break;

    case "DirectGame.Challenge":
      if (entry.arrow == "==>") {
        json = entry.json();
        onLabelOutDirectGameChallenge(entry, json);
      }
      break;

    case "Draft.DraftStatus":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInDraftDraftStatus(entry, json);
      }
      break;

    case "Draft.MakePick":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInDraftMakePick(entry, json);
      } else {
        json = entry.json();
        onLabelOutDraftMakePick(entry, json);
      }
      break;

    case "Event.CompleteDraft":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventCompleteDraft(entry, json);
      }
      break;

    case "Event.GetActiveEventsV2":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventGetActiveEvents(entry, json);
      }
      break;

    case "MatchGameRoomStateChangedEvent":
      json = entry.json();
      onLabelMatchGameRoomStateChangedEvent(entry, json);
      break;

    case "Event.GetSeasonAndRankDetail":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelInEventGetSeasonAndRankDetail(entry, json);
      }
      break;

    case "PlayerInventory.GetRewardSchedule":
      if (entry.arrow == "<==") {
        json = entry.json();
        onLabelGetPlayerInventoryGetRewardSchedule(entry, json);
      }
      break;

    default:
      break;
  }
}

function finishLoading() {
  if (globals.firstPass) {
    ipc_send("popup", {
      text: "Finishing initial log read...",
      time: 0,
      progress: 2
    });
    globals.firstPass = false;
    globals.store.set(playerData.data);
    logReadEnd = new Date();
    let logReadElapsed = (logReadEnd - globals.logReadStart) / 1000;
    ipc_send("ipc_log", `Log read in ${logReadElapsed}s`);

    ipc_send("popup", {
      text: "Initializing...",
      time: 0,
      progress: 2
    });

    if (globals.duringMatch) {
      ipc_send("set_arena_state", ARENA_MODE_MATCH);
      update_deck(false);
    } else if (globals.duringDraft) {
      ipc_send("set_arena_state", ARENA_MODE_DRAFT);
    } else {
      ipc_send("set_arena_state", ARENA_MODE_IDLE);
    }

    ipc_send("set_settings", JSON.stringify(playerData.settings));
    ipc_send("initialize");
    ipc_send("player_data_refresh");

    if (playerData.name) {
      // This needs to be triggered somewhere else
      const httpApi = require("./http-api");
      httpApi.httpSetPlayer(
        playerData.name,
        playerData.rank.constructed.rank,
        playerData.rank.constructed.tier,
        playerData.rank.limited.rank,
        playerData.rank.limited.tier
      );
    }

    ipc_send("popup", {
      text: "Initialized successfully!",
      time: 3000,
      progress: -1
    });
  }
}

export default { startWatchingLog };
