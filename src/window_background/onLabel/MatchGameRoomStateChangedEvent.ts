import { ARENA_MODE_IDLE, IPC_NONE } from "../../shared/constants";

import globals from "../globals";
import { ipcSend, parseWotcTimeFallback } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
import { MatchGameRoomStateChange } from "../../types/match";
import clearDeck from "../clearDeck";
import saveMatch from "../saveMatch";
import { reduxAction } from "../../shared-redux/sharedRedux";
import globalStore from "../../shared-store";
import {
  setPlayer,
  setOpponent,
  setCurrentMatchMany
} from "../../shared-store/currentMatchStore";

interface Entry extends LogEntry {
  json: () => MatchGameRoomStateChange;
}

export default function onLabelMatchGameRoomStateChangedEvent(
  entry: Entry
): void {
  const json = entry.json();
  if (!json) return;
  const playerData = globals.store.getState().playerdata;

  const gameRoom = json.matchGameRoomStateChangedEvent.gameRoomInfo;
  let eventId = "";

  if (gameRoom.gameRoomConfig) {
    eventId = gameRoom.gameRoomConfig.eventId;
    setCurrentMatchMany({
      eventId: eventId
    });
    globals.duringMatch = true;
  }

  if (eventId == "NPE") return;

  // Now only when a match begins
  if (gameRoom.stateType == "MatchGameRoomStateType_Playing") {
    gameRoom.gameRoomConfig.reservedPlayers.forEach(player => {
      if (player.userId == playerData.arenaId) {
        setCurrentMatchMany({
          name: player.playerName,
          playerSeat: player.systemSeatId,
          userid: player.userId
        });
      } else {
        setOpponent({
          name: player.playerName,
          userid: player.userId
        });
        setCurrentMatchMany({
          oppSeat: player.systemSeatId
        });
      }
    });
  }
  // When the match ends (but not the last message)
  if (gameRoom.stateType == "MatchGameRoomStateType_MatchCompleted") {
    //gameRoom.finalMatchResult.resultList

    const currentMatch = globalStore.currentMatch;
    const playerRank = playerData.rank;
    const format =
      currentMatch.gameInfo.superFormat == "SuperFormat_Constructed"
        ? "constructed"
        : "limited";

    const player = {
      tier: playerRank[format].tier,
      name: playerData.playerName,
      rank: playerRank[format].rank,
      percentile: playerRank[format].percentile,
      leaderboardPlace: playerRank[format].leaderboardPlace,
      seat: currentMatch.playerSeat
    };
    setPlayer(player);

    const opponent = {
      seat: currentMatch.oppSeat
    };
    setOpponent(opponent);

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
    saveMatch(
      gameRoom.finalMatchResult.matchId + "-" + playerData.arenaId,
      matchEndTime.getTime()
    );
  }
  // Only update if needed
  if (json.players) {
    json.players.forEach(function(player) {
      const currentMatch = globalStore.currentMatch;
      if (
        player.userId == playerData.arenaId &&
        currentMatch.playerSeat !== player.systemSeatId
      ) {
        setCurrentMatchMany({
          playerSeat: player.systemSeatId
        });
      } else if (currentMatch.oppSeat !== player.systemSeatId) {
        setCurrentMatchMany({
          oppSeat: player.systemSeatId
        });
      }
    });
  }
}
