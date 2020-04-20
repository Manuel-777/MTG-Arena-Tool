/* eslint-disable @typescript-eslint/no-var-requires */
import globals from "../globals";
import LogEntry from "../../types/logDecoder";
import actionLog from "../actionLog";
import { ipcSend } from "../backgroundUtil";
import { createMatch } from "../data";
import { ARENA_MODE_MATCH, IPC_NONE } from "../../shared/constants";
import { reduxAction } from "../../shared-redux/sharedRedux";

export interface EntryJson {
  controllerFabricUri: string;
  matchEndpointHost: string;
  matchEndpointPort: number;
  opponentScreenName: string;
  opponentIsWotc: boolean;
  matchId: string;
  opponentRankingClass: string;
  opponentRankingTier: number;
  opponentMythicPercentile: number;
  opponentMythicLeaderboardPlace: number;
  eventId: string;
  opponentAvatarSelection: string;
  opponentCardBackSelection: string;
  opponentPetSelection: { name: string; variant: string };
  avatarSelection: string;
  cardbackSelection: string;
  petSelection: { name: string; variant: string };
  battlefield: string;
  opponentCommanderGrpIds: number[];
  commanderGrpIds: number[];
}

interface Entry extends LogEntry {
  json: () => EntryJson;
}

export default function EventMatchCreated(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  const matchBeginTime = globals.logTime || new Date();

  if (json.opponentRankingClass == "Mythic") {
    const httpApi = require("../httpApi");
    httpApi.httpSetMythicRank(
      json.opponentScreenName,
      json.opponentMythicLeaderboardPlace
    );
  }

  ipcSend("ipc_log", "MATCH CREATED: " + matchBeginTime);
  if (json.eventId != "NPE") {
    actionLog(-99, globals.logTime, "");
    const dispatch = globals.store.dispatch;
    reduxAction(dispatch, "RESET_CURRENT_MATCH", true, IPC_NONE);

    if (globals.debugLog || !globals.firstPass) {
      ipcSend("set_arena_state", ARENA_MODE_MATCH);
    }

    ipcSend("ipc_log", "vs " + json.opponentScreenName);

    const opponent = {
      tier: json.opponentRankingTier,
      name: json.opponentScreenName,
      rank: json.opponentRankingClass,
      percentile: json.opponentMythicPercentile,
      leaderboardPlace: json.opponentMythicLeaderboardPlace,
      commanderGrpIds: json.opponentCommanderGrpIds
    };
    reduxAction(dispatch, "SET_OPPONENT", opponent, IPC_NONE);

    const player = {
      commanderGrpIds: json.commanderGrpIds
    };
    reduxAction(dispatch, "SET_PLAYER", player, IPC_NONE);

    reduxAction(dispatch, "SET_EVENTID", json.eventId, IPC_NONE);
  }
}
