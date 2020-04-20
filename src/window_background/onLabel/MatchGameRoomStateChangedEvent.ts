import { ARENA_MODE_IDLE, IPC_NONE } from "../../shared/constants";

import globals from "../globals";
import { ipcSend, parseWotcTimeFallback } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
import { MatchGameRoomStateChange } from "../../types/match";
import clearDeck from "../clearDeck";
import saveMatch from "../saveMatch";
import { reduxAction } from "../../shared-redux/sharedRedux";

interface Entry extends LogEntry {
  json: () => MatchGameRoomStateChange;
}

export default function onLabelMatchGameRoomStateChangedEvent(
  entry: Entry
): void {
  const json = entry.json();
  if (!json) return;

  const gameRoom = json.matchGameRoomStateChangedEvent.gameRoomInfo;
  let eventId = "";

  if (gameRoom.gameRoomConfig) {
    eventId = gameRoom.gameRoomConfig.eventId;
    reduxAction(
      globals.store.dispatch,
      "SET_CURRENT_MATCH_MANY",
      {
        eventId: eventId
      },
      IPC_NONE
    );
    globals.duringMatch = true;
  }

  if (eventId == "NPE") return;

  if (gameRoom.stateType == "MatchGameRoomStateType_Playing") {
    //
    gameRoom.gameRoomConfig.reservedPlayers.forEach(player => {
      const playerData = globals.store.getState().playerdata;
      if (player.userId == playerData.arenaId) {
        reduxAction(
          globals.store.dispatch,
          "SET_CURRENT_MATCH_MANY",
          {
            playerSeat: player.systemSeatId
          },
          IPC_NONE
        );
      } else {
        reduxAction(
          globals.store.dispatch,
          "SET_CURRENT_MATCH_MANY",
          {
            oppSeat: player.systemSeatId
          },
          IPC_NONE
        );
      }
    });
  }
  if (gameRoom.stateType == "MatchGameRoomStateType_MatchCompleted") {
    //gameRoom.finalMatchResult.resultList

    gameRoom.finalMatchResult.resultList.forEach(function(res) {
      if (res.scope == "MatchScope_Match") {
        // skipMatch = false;
        globals.duringMatch = false;
      }
    });

    clearDeck();
    if (globals.debugLog || !globals.firstPass)
      ipcSend("set_arena_state", ARENA_MODE_IDLE);
    globals.matchCompletedOnGameNumber =
      gameRoom.finalMatchResult.resultList.length - 1;

    const matchEndTime = parseWotcTimeFallback(entry.timestamp);
    const playerData = globals.store.getState().playerdata;
    saveMatch(
      gameRoom.finalMatchResult.matchId + "-" + playerData.arenaId,
      matchEndTime.getTime()
    );
  }

  if (json.players) {
    json.players.forEach(function(player) {
      const playerData = globals.store.getState().playerdata;
      if (player.userId == playerData.arenaId) {
        reduxAction(
          globals.store.dispatch,
          "SET_CURRENT_MATCH_MANY",
          {
            playerSeat: player.systemSeatId
          },
          IPC_NONE
        );
      } else {
        reduxAction(
          globals.store.dispatch,
          "SET_CURRENT_MATCH_MANY",
          {
            oppSeat: player.systemSeatId
          },
          IPC_NONE
        );
      }
    });
  }
}
