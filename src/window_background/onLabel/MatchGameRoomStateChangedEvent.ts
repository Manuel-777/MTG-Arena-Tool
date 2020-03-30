import { ARENA_MODE_IDLE } from "../../shared/constants";
import { objectClone } from "../../shared/util";

import globals from "../globals";
import { ipcSend, parseWotcTimeFallback } from "../backgroundUtil";
import LogEntry from "../../types/logDecoder";
import { MatchGameRoomStateChange } from "../../types/match";
import processMatch from "../processMatch";
import clearDeck from "../clearDeck";
import saveMatch from "../saveMatch";

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
    globals.duringMatch = true;
  }

  if (eventId == "NPE") return;

  if (gameRoom.stateType == "MatchGameRoomStateType_Playing") {
    // If current match does nt exist (create match was not recieved , maybe a reconnection)
    // Only problem is recieving the decklist
    if (!globals.currentMatch) {
      let oName = "";
      gameRoom.gameRoomConfig.reservedPlayers.forEach(player => {
        const playerData = globals.store.getState().playerdata;
        if (!(player.userId === playerData.arenaId)) {
          oName = playerData.playerName;
        }
      });

      const arg = {
        opponentScreenName: oName,
        opponentRankingClass: "",
        opponentRankingTier: 1,
        eventId: eventId,
        matchId: gameRoom.gameRoomConfig.matchId,
        // default the types
        // Not cool but these are not used by us.
        controllerFabricUri: "",
        matchEndpointHost: "",
        matchEndpointPort: 0,
        opponentIsWotc: false,
        opponentMythicPercentile: 0,
        opponentMythicLeaderboardPlace: 0,
        opponentAvatarSelection: "",
        opponentCardBackSelection: "",
        opponentPetSelection: { name: "", variant: "" },
        avatarSelection: "",
        cardbackSelection: "",
        petSelection: { name: "", variant: "" },
        battlefield: "",
        opponentCommanderGrpIds: [],
        commanderGrpIds: []
      };

      // Note: one of the only places we still depend on entry.timestamp
      const matchBeginTime = parseWotcTimeFallback(entry.timestamp);
      processMatch(arg, matchBeginTime);
    }
    gameRoom.gameRoomConfig.reservedPlayers.forEach(player => {
      const playerData = globals.store.getState().playerdata;
      if (player.userId == playerData.arenaId) {
        globals.currentMatch.player.seat = player.systemSeatId;
      } else {
        globals.currentMatch.opponent.name = player.playerName;
        globals.currentMatch.opponent.id = player.userId;
        globals.currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
  if (gameRoom.stateType == "MatchGameRoomStateType_MatchCompleted") {
    globals.currentMatch.results = objectClone(
      gameRoom.finalMatchResult.resultList
    );

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
        globals.currentMatch.player.seat = player.systemSeatId;
      } else {
        globals.currentMatch.opponent.seat = player.systemSeatId;
      }
    });
  }
}
