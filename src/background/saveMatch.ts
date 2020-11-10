import electron from "electron";
import globals from "./globals";
import { playerDb } from "../shared/db/LocalDatabase";
import { ipcSend, normalizeISOString } from "./backgroundUtil";
import { reduxAction } from "../shared/redux/sharedRedux";
import globalStore, { getMatch } from "../shared/store";
import getOpponentDeck from "./getOpponentDeck";
import getClosestMatch from "./getClosestMatch";
import { httpSetMatch } from "./httpApi";
import debugLog from "../shared/debugLog";
import {
  constants,
  getJumpstartThemes,
  themeCards,
  JumpstartThemes,
  InternalMatch,
} from "mtgatool-shared";
import { ResultSpec } from "mtgatool-shared/dist/types/greTypes";

const { IPC_RENDERER, IPC_OVERLAY, DEFAULT_TILE } = constants;

function matchResults(results: ResultSpec[]): number[] {
  let playerWins = 0;
  let opponentWins = 0;
  let draws = 0;
  const currentMatch = globalStore.currentMatch;
  results.forEach(function (res) {
    if (res.scope == "MatchScope_Game") {
      if (res.result == "ResultType_Draw") {
        draws += 1;
      } else if (res.winningTeamId == currentMatch.playerSeat) {
        playerWins += 1;
      }
      if (res.winningTeamId == currentMatch.oppSeat) {
        opponentWins += 1;
      }
    }
  });

  return [playerWins, opponentWins, draws];
}

// Calculates derived data for storage.
// This is called when a match is complete, before saving.
function generateInternalMatch(
  matchEndTime: number
): InternalMatch | undefined {
  const currentMatch = globalStore.currentMatch;
  if (currentMatch.eventId === "AIBotMatch") return;

  let bestOf = 1;
  if (currentMatch.gameInfo.matchWinCondition == "MatchWinCondition_Best2of3")
    bestOf = 3;
  if (currentMatch.gameInfo.matchWinCondition == "MatchWinCondition_Best3of5")
    bestOf = 5;
  const duration = currentMatch.matchGameStats.reduce(
    (acc, cur) => acc + cur.time,
    0
  );

  const matchTags: any = [];

  const playerDeck = globalStore.currentMatch.originalDeck.getSave(true);
  const oppDeck = getOpponentDeck();
  if (oppDeck.archetype && oppDeck.archetype !== "Unknown") {
    matchTags.push(oppDeck.archetype);
  }

  const prevTags = getClosestMatch(oppDeck)?.tags;
  if(prevTags) {
    prevTags.forEach((d: any) => {
      if(matchTags.indexOf(d) === -1) {
        matchTags.push(d);
      }
    });
  }

  const [playerWins, opponentWins, draws] = matchResults(
    currentMatch.gameInfo.results
  );

  const newMatch: InternalMatch = {
    onThePlay: currentMatch.onThePlay,
    id: currentMatch.matchId,
    date: normalizeISOString(matchEndTime),
    eventId: currentMatch.eventId,
    player: { ...currentMatch.player, win: playerWins },
    opponent: { ...currentMatch.opponent, win: opponentWins },
    oppDeck,
    playerDeck,
    tags: matchTags,
    draws,
    bestOf,
    duration,
    postStats: {
      statsHeatMap: currentMatch.statsHeatMap,
      totalTurns: currentMatch.totalTurns,
      playerStats: currentMatch.playerStats,
      oppStats: currentMatch.oppStats,
    },
    gameStats: currentMatch.matchGameStats,
    toolVersion: globals.toolVersion,
    toolRunFromSource: !electron.remote.app.isPackaged,
    arenaId: globals.store.getState().playerdata.playerName,
    type: "match",
  };

  if (currentMatch.eventId.indexOf("Jumpstart") !== -1) {
    const themes = getJumpstartThemes(globalStore.currentMatch.originalDeck);
    newMatch.jumpstartTheme = themes.join(" ");
    newMatch.playerDeck.name = newMatch.jumpstartTheme;

    const themeTile = themeCards[themes[0] as JumpstartThemes];
    newMatch.playerDeck.deckTileId = themeTile || DEFAULT_TILE;
    newMatch.jumpstartTheme = themes.join(" ");
  }

  newMatch.oppDeck.commandZoneGRPIds = currentMatch.opponent.commanderGrpIds;
  newMatch.oppDeck.companionGRPId = currentMatch.opponent.companionGRPId;

  return newMatch;
}

export default function saveMatch(id: string, matchEndTime: number): void {
  const currentMatch = globalStore.currentMatch;
  debugLog(`${id}: ${currentMatch}`);
  if (currentMatch.matchId !== id) {
    return;
  }

  const existingMatch = getMatch(id) || undefined;
  const match = existingMatch || generateInternalMatch(matchEndTime);
  if (!match) {
    debugLog(`COULD NOT GENERATE MATCH DATA!, id: ${id}`, "error");
    debugLog(currentMatch, "debug");
    return;
  }

  debugLog(`Save match: ${match}`);
  const matches_index = [...globals.store.getState().matches.matchesIndex];
  reduxAction(
    globals.store.dispatch,
    { type: "SET_MATCH", arg: match },
    IPC_RENDERER
  );
  playerDb.upsert("", id, match);

  const gameNumberCompleted = currentMatch.gameInfo.results.filter(
    (res) => res.scope == "MatchScope_Game"
  ).length;

  if (globals.matchCompletedOnGameNumber === gameNumberCompleted) {
    httpSetMatch(match);
  }
  if (matches_index.indexOf(id) == -1) {
    matches_index.push(id);
    playerDb.upsert("", "matches_index", matches_index);
  }
  if (
    globals.store.getState().settings.overlay_overview &&
    !globals.firstPass
  ) {
    ipcSend("match_end", JSON.stringify(currentMatch), IPC_OVERLAY);
  }
  ipcSend("popup", { text: "Match saved!", time: 3000 });
}
