import fs from "fs";
import { promisify } from "util";
import { StringDecoder } from "string_decoder";
import queue from "queue";
import ArenaLogDecoder from "./arena-log-decoder/arena-log-decoder";
import playerData from "../shared/player-data";
import {
  onLabelClientToMatchServiceMessageTypeClientToGREMessage,
  onLabelEventMatchCreated,
  onLabelGetPlayerInventoryGetRewardSchedule,
  onLabelGreToClient,
  onLabelInEventGetCombinedRankInfo,
  onLabelInEventGetPlayerCourseV2,
  onLabelInEventGetPlayerCoursesV2,
  onLabelInEventJoin,
  onLabelInDeckGetDeckListsV3,
  onLabelInDeckGetPreconDecks,
  onLabelInDeckUpdateDeckV3,
  onLabelInventoryUpdated,
  onLabelInPlayerInventoryGetPlayerInventory,
  onLabelInPlayerInventoryGetPlayerCardsV3,
  onLabelInProgressionGetPlayerProgress,
  onLabelInEventDeckSubmitV3,
  onLabelInEventGetActiveEventsV2,
  onLabelInDraftDraftStatus,
  onLabelInDraftMakePick,
  onLabelOutDraftMakePick,
  onLabelInEventCompleteDraft,
  onLabelInEventGetSeasonAndRankDetail,
  onLabelMatchGameRoomStateChangedEvent,
  onLabelMythicRatingUpdated,
  onLabelOutLogInfo,
  onLabelOutDirectGameChallenge,
  onLabelOutEventAIPractice,
  onLabelPostMatchUpdate,
  onLabelRankUpdated,
  onLabelTrackRewardTierUpdated
} from "./labels";
import {
  ipc_send,
  getDateFormat,
  parseWotcTimeFallback,
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
    const currentTime = new Date().getTime();
    while (currentTime + debugLogSpeed >= new Date().getTime()) {
      // sleep
    }
  }
  if (entry.playerId && entry.playerId !== playerData.arenaId) {
    return;
  } else {
    //console.log("Entry:", entry.label, entry, entry.json());
    updateLoading(entry);
    if (!(globals.firstPass && playerData.settings.skip_firstpass)) {
      try {
        entrySwitch(entry);
        let timestamp = entry.timestamp;
        if (!timestamp && entry.json) {
          const json = entry.json();
          if (json && json.timestamp) {
            timestamp = json.timestamp;
          }
        }
        if (timestamp) {
          globals.logTime = parseWotcTimeFallback(timestamp);
          setData({
            last_log_timestamp: timestamp,
            last_log_format: getDateFormat(timestamp)
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
/* eslint-disable-next-line complexity */
function entrySwitch(entry) {
  // console.log(entry, entry.json());
  switch (entry.label) {
    case "Log.BI":
      if (entry.arrow == "==>") {
        onLabelOutLogInfo(entry);
      }
      break;

    case "GreToClientEvent":
      onLabelGreToClient(entry);
      break;

    case "ClientToMatchServiceMessageType_ClientToGREMessage":
      onLabelClientToMatchServiceMessageTypeClientToGREMessage(entry);
      break;

    case "Event.GetPlayerCourseV2":
      if (entry.arrow == "<==") {
        onLabelInEventGetPlayerCourseV2(entry);
      }
      break;

    case "Event.Join":
      if (entry.arrow == "<==") {
        onLabelInEventJoin(entry);
      }
      break;

    case "Event.GetCombinedRankInfo":
      if (entry.arrow == "<==") {
        onLabelInEventGetCombinedRankInfo(entry);
      }
      break;

    case "Rank.Updated":
      {
        onLabelRankUpdated(entry);
      }
      break;

    case "MythicRating.Updated":
      {
        onLabelMythicRatingUpdated(entry);
      }
      break;

    case "Event.GetPlayerCoursesV2":
      if (entry.arrow == "<==") {
        onLabelInEventGetPlayerCoursesV2(entry);
      }
      break;

    case "Deck.GetDeckListsV3":
      if (entry.arrow == "<==") {
        onLabelInDeckGetDeckListsV3(entry);
      }
      break;

    case "Deck.GetPreconDecks":
      if (entry.arrow == "<==") {
        onLabelInDeckGetPreconDecks(entry);
      }
      break;

    case "Deck.UpdateDeckV3":
      if (entry.arrow == "<==") {
        onLabelInDeckUpdateDeckV3(entry);
      }
      break;

    case "Inventory.Updated":
      // handler works for both out and in arrows
      onLabelInventoryUpdated(entry);
      break;

    case "PostMatch.Update":
      if (entry.arrow == "==>") {
        onLabelPostMatchUpdate(entry);
      }
      break;

    case "PlayerInventory.GetPlayerInventory":
      if (entry.arrow == "<==") {
        onLabelInPlayerInventoryGetPlayerInventory(entry);
      }
      break;

    case "PlayerInventory.GetPlayerCardsV3":
      if (entry.arrow == "<==") {
        onLabelInPlayerInventoryGetPlayerCardsV3(entry);
      }
      break;

    case "Progression.GetPlayerProgress":
      if (entry.arrow == "<==") {
        onLabelInProgressionGetPlayerProgress(entry);
      }
      break;

    case "TrackRewardTier.Updated":
      onLabelTrackRewardTierUpdated(entry);
      break;

    case "Event.DeckSubmitV3":
      if (entry.arrow == "<==") {
        onLabelInEventDeckSubmitV3(entry);
      }
      break;

    case "Event.MatchCreated":
      if (entry.arrow == "==>") {
        onLabelEventMatchCreated(entry);
      }
      break;

    case "Event.AIPractice":
      if (entry.arrow == "==>") {
        onLabelOutEventAIPractice(entry);
      }
      break;

    case "DirectGame.Challenge":
      if (entry.arrow == "==>") {
        onLabelOutDirectGameChallenge(entry);
      }
      break;

    case "Draft.DraftStatus":
      if (entry.arrow == "<==") {
        onLabelInDraftDraftStatus(entry);
      }
      break;

    case "Draft.MakePick":
      if (entry.arrow == "<==") {
        onLabelInDraftMakePick(entry);
      } else {
        onLabelOutDraftMakePick(entry);
      }
      break;

    case "Event.CompleteDraft":
      if (entry.arrow == "<==") {
        onLabelInEventCompleteDraft(entry);
      }
      break;

    case "Event.GetActiveEventsV2":
      if (entry.arrow == "<==") {
        onLabelInEventGetActiveEventsV2(entry);
      }
      break;

    case "MatchGameRoomStateChangedEvent":
      onLabelMatchGameRoomStateChangedEvent(entry);
      break;

    case "Event.GetSeasonAndRankDetail":
      if (entry.arrow == "<==") {
        onLabelInEventGetSeasonAndRankDetail(entry);
      }
      break;

    case "PlayerInventory.GetRewardSchedule":
      if (entry.arrow == "<==") {
        onLabelGetPlayerInventoryGetRewardSchedule(entry);
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
