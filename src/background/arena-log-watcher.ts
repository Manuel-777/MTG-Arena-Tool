/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
import fs, { Stats } from "fs";
import { promisify } from "util";
import { StringDecoder } from "string_decoder";
import queue from "queue";
import ArenaLogDecoder from "./arena-log-decoder/arena-log-decoder";

import LogEntry from "../types/logDecoder";
import * as Labels from "./onLabel";

import {
  ipcSend,
  parseWotcTimeFallback,
  updateLoading,
  getDateFormat,
} from "./backgroundUtil";
import updateDeck from "./updateDeck";
import globals from "./globals";
import { reduxAction } from "../shared/redux/sharedRedux";
import debugLog from "../shared/debugLog";
import { constants } from "mtgatool-shared";

const {
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  ARENA_MODE_IDLE,
  LOGIN_OK,
  IPC_RENDERER,
} = constants;

const debugLogSpeed = 0.001;
let logReadEnd = null;
let lastProgressPop = 0;

const fsAsync = {
  close: promisify(fs.close),
  open: promisify(fs.open),
  read: promisify(fs.read),
  stat: promisify(fs.stat),
};

interface StartProps {
  path: fs.PathLike;
  chunkSize: number;
  onLogEntry: (entry: any) => void;
  onError: (err: any) => void;
  onFinish: () => void;
}

function start({
  path,
  chunkSize,
  onLogEntry,
  onError,
  onFinish,
}: StartProps): () => void {
  const q = queue({ concurrency: 1 });
  let position = 0;
  let stringDecoder = new StringDecoder();
  let logDecoder = ArenaLogDecoder();

  const stopWatching = fsWatch(path, schedule, 250);

  function stop(): void {
    stopWatching();
    q.end();
  }

  async function read(): Promise<void> {
    const { size } = await fsAsync.stat(path);
    if (position > size) {
      // the file has been recreated, we must reset our state
      stringDecoder = new StringDecoder();
      logDecoder = ArenaLogDecoder();
      position = 0;
    }
    while (position < size) {
      if (!globals.store.getState().settings.skip_firstpass) {
        const buffer = await readChunk(
          path,
          position,
          Math.min(size - position, chunkSize)
        );
        const text = stringDecoder.write(buffer);
        logDecoder.append(text, (entry: any) => onLogEntry({ ...entry, size }));
        // eslint-disable-next-line require-atomic-updates
        position += buffer.length;
      } else {
        position = size;
      }
    }
    onFinish();
  }

  async function attempt(): Promise<void> {
    try {
      await read();
    } catch (err) {
      onError(err);
    }
  }

  function schedule(): void {
    q.push(attempt);
    q.start();
  }

  schedule();
  return stop;
}

function fsWatch(
  path: fs.PathLike,
  onChanged: () => void,
  interval: number
): () => void {
  let lastSize: number;
  let handle: NodeJS.Timeout;
  start();
  return stop;

  async function attemptSize(): Promise<Stats["size"]> {
    try {
      const stats = await fsAsync.stat(path);
      return stats.size;
    } catch (err) {
      if (err.code === "ENOENT") return 0;
      throw err;
    }
  }

  async function start(): Promise<void> {
    lastSize = await attemptSize();
    handle = global.setInterval(checkFile, interval);
  }

  async function checkFile(): Promise<void> {
    const size = await attemptSize();
    if (lastSize === size) return;
    lastSize = size;
    onChanged();
  }

  function stop(): void {
    if (handle) clearInterval(handle);
  }
}

async function readChunk(
  path: fs.PathLike,
  position: number,
  length: number
): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const fd = await fsAsync.open(path, "r");
  try {
    await fsAsync.read(fd, buffer, 0, length, position);
  } finally {
    await fsAsync.close(fd);
  }
  return buffer;
}

function startWatchingLog(path: fs.PathLike): () => void {
  globals.logReadStart = new Date();
  return start({
    path,
    chunkSize: 268435440,
    onLogEntry: onLogEntryFound,
    onError: (err: any) => debugLog(err, "error"),
    onFinish: finishLoading,
  });
}

function onLogEntryFound(entry: any): void {
  if (globals.debugLog) {
    const currentTime = new Date().getTime();
    while (currentTime + debugLogSpeed >= new Date().getTime()) {
      // sleep
    }
  }
  const playerData = globals.store.getState().playerdata;
  if (entry.playerId && entry.playerId !== playerData.arenaId) {
    return;
  } else {
    //debugLog("Entry:", entry.label, entry, entry.json());
    const end = Date.now();
    if (end > lastProgressPop + 1000) {
      lastProgressPop = end;
      updateLoading(entry);
    }
    if (
      !(globals.firstPass && globals.store.getState().settings.skip_firstpass)
    ) {
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
          if (globals.logTimestamp == 0) {
            const format = getDateFormat(timestamp);
            reduxAction(
              globals.store.dispatch,
              {
                type: "SET_APP_SETTINGS",
                arg: { logTimeExample: timestamp, logTimeFormat: format },
              },
              IPC_RENDERER
            );
          }
          globals.logTimestamp = timestamp;
        }
      } catch (err) {
        debugLog(entry.label + " > " + entry.position);
        debugLog(entry.json());
        debugLog(err, "error");
      }
    }
  }
}

// I want to reduce the complexity for jsPrettier here
// But using strings to call functions is slower than a switch.
// (in my testing)
/* eslint-disable-next-line complexity */
function entrySwitch(entry: LogEntry): void {
  //debugLog(entry, entry.json());
  switch (entry.label) {
    case "GreToClientEvent":
      Labels.GreToClient(entry);
      break;

    case "ClientToMatchServiceMessageType_ClientToGREMessage":
      Labels.ClientToMatchServiceMessageTypeClientToGREMessage(entry);
      break;

    case "Event.GetPlayerCourseV2":
      if (entry.arrow == "<==") {
        Labels.InEventGetPlayerCourseV2(entry);
      }
      break;

    case "Event.Join":
      if (entry.arrow == "<==") {
        Labels.InEventJoin(entry);
      }
      break;

    case "Event.GetCombinedRankInfo":
      if (entry.arrow == "<==") {
        Labels.InEventGetCombinedRankInfo(entry);
      }
      break;

    case "Draft.Notify":
      Labels.InDraftNotify(entry);
      break;

    case "Draft.MakeHumanDraftPick":
      if (entry.arrow == "==>") {
        Labels.outMakeHumanDraftPick(entry);
      } else if (entry.arrow == "<==") {
        Labels.InMakeHumanDraftPick(entry);
      }
      break;

    case "Client.SceneChange":
      Labels.onClientSceneChange(entry);
      break;

    case "AuthenticateResponse":
      Labels.onAuthenticateResponse(entry);
      break;

    case "Event.JoinPodmaking":
      if (entry.arrow == "==>") {
        Labels.InEventJoinPodMaking(entry);
      }
      break;

    case "Event.GetPlayerCoursesV2":
      if (entry.arrow == "<==") {
        Labels.InEventGetPlayerCoursesV2(entry);
      }
      break;

    case "Deck.GetDeckListsV3":
      if (entry.arrow == "<==") {
        Labels.InDeckGetDeckListsV3(entry);
      }
      break;

    case "Deck.GetPreconDecks":
      if (entry.arrow == "<==") {
        Labels.InDeckGetPreconDecks(entry);
      }
      break;

    case "Deck.UpdateDeckV3":
      if (entry.arrow == "<==") {
        Labels.InDeckUpdateDeckV3(entry);
      }
      break;

    case "Inventory.Updated":
      // handler works for both out and in arrows
      Labels.InventoryUpdated(entry);
      break;

    case "PostMatch.Update":
      if (entry.arrow == "<==") {
        Labels.PostMatchUpdate(entry);
      }
      break;

    case "PlayerInventory.GetPlayerInventory":
      if (entry.arrow == "<==") {
        Labels.InPlayerInventoryGetPlayerInventory(entry);
      }
      break;

    case "PlayerInventory.GetPlayerCardsV3":
      if (entry.arrow == "<==") {
        Labels.InPlayerInventoryGetPlayerCardsV3(entry);
      }
      break;

    case "Progression.GetPlayerProgress":
      if (entry.arrow == "<==") {
        Labels.InProgressionGetPlayerProgress(entry);
      }
      break;

    case "TrackRewardTier.Updated":
      Labels.TrackRewardTierUpdated(entry);
      break;

    case "Event.DeckSubmitV3":
      if (entry.arrow == "<==") {
        Labels.InEventDeckSubmitV3(entry);
      }
      break;

    case "Event.MatchCreated":
      if (entry.arrow == "<==") {
        Labels.EventMatchCreated(entry);
      }
      break;

    case "Event.AIPractice":
      if (entry.arrow == "==>") {
        Labels.OutEventAIPractice(entry);
      }
      break;

    case "DirectGame.Challenge":
      if (entry.arrow == "==>") {
        Labels.OutDirectGameChallenge(entry);
      }
      break;

    case "Draft.DraftStatus":
      if (entry.arrow == "<==") {
        Labels.InDraftDraftStatus(entry);
      }
      break;

    case "Draft.MakePick":
      if (entry.arrow == "<==") {
        Labels.InDraftMakePick(entry);
      } else {
        Labels.OutDraftMakePick(entry);
      }
      break;

    case "Event.CompleteDraft":
      if (entry.arrow == "<==") {
        Labels.InEventCompleteDraft(entry);
      }
      break;

    case "Event.GetActiveEventsV2":
      if (entry.arrow == "<==") {
        Labels.InEventGetActiveEventsV2(entry);
      }
      break;

    case "Event.GetActiveEventsV3":
      if (entry.arrow == "<==") {
        Labels.InEventGetActiveEventsV3(entry);
      }
      break;

    case "MatchGameRoomStateChangedEvent":
      Labels.MatchGameRoomStateChangedEvent(entry);
      break;

    case "Event.GetSeasonAndRankDetail":
      if (entry.arrow == "<==") {
        Labels.InEventGetSeasonAndRankDetail(entry);
      }
      break;

    case "PlayerInventory.GetRewardSchedule":
      if (entry.arrow == "<==") {
        Labels.GetPlayerInventoryGetRewardSchedule(entry);
      }
      break;

    case "PlayerInventory.GetFormats":
      if (entry.arrow == "<==") {
        Labels.GetPlayerInventoryGetFormats(entry);
      }
      break;

    default:
      break;
  }
}

function finishLoading(): void {
  if (globals.firstPass) {
    ipcSend("popup", {
      text: "Finishing initial log read...",
      time: 0,
      progress: 2,
    });
    globals.firstPass = false;
    logReadEnd = new Date();
    const logReadElapsed =
      (logReadEnd.getTime() - globals.logReadStart.getTime()) / 1000;
    ipcSend("ipc_log", `Log read in ${logReadElapsed}s`);

    ipcSend("popup", {
      text: "Initializing...",
      time: 0,
      progress: 2,
    });

    if (globals.duringMatch) {
      ipcSend("set_arena_state", ARENA_MODE_MATCH);
      updateDeck(false);
    } else if (globals.duringDraft) {
      ipcSend("set_arena_state", ARENA_MODE_DRAFT);
    } else {
      ipcSend("set_arena_state", ARENA_MODE_IDLE);
    }

    reduxAction(
      globals.store.dispatch,
      { type: "SET_LOADING", arg: false },
      IPC_RENDERER
    );
    reduxAction(
      globals.store.dispatch,
      { type: "SET_LOGIN_STATE", arg: LOGIN_OK },
      IPC_RENDERER
    );

    ipcSend("popup", {
      text: "Initialized successfully!",
      time: 3000,
      progress: -1,
    });
  }
}

export default { start, onLogEntryFound, startWatchingLog };
