import electron from "electron";
import globals from "./globals";
import { playerDb } from "../shared/db/LocalDatabase";
import { ipcSend, normalizeISOString } from "./backgroundUtil";
import { reduxAction } from "../shared/redux/sharedRedux";
import { IPC_RENDERER, IPC_OVERLAY } from "../shared/constants";
import globalStore, { getMatch } from "../shared/store";
import { InternalMatch } from "../types/match";
import { ResultSpec } from "../assets/proto/GreTypes";
import getOpponentDeck from "./getOpponentDeck";
import { httpSetMatch } from "./httpApi";

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

// Given match data calculates derived data for storage.
// This is called when a match is complete.
export function completeMatch(
  match: any,
  matchEndTime: number
): InternalMatch | undefined {
  const currentMatch = globalStore.currentMatch;
  if (currentMatch.eventId === "AIBotMatch") return;

  const [playerWins, opponentWins, draws] = matchResults(
    currentMatch.gameInfo.results
  );

  match.onThePlay = currentMatch.onThePlay;
  match.id = currentMatch.matchId;

  match.opponent = { ...currentMatch.opponent, win: opponentWins };
  match.player = { ...currentMatch.player, win: playerWins };
  match.draws = draws;

  match.eventId = currentMatch.eventId;
  if (globalStore.currentMatch.originalDeck) {
    match.playerDeck = globalStore.currentMatch.originalDeck.getSave(true);
  }
  match.oppDeck = getOpponentDeck();
  match.oppDeck.commandZoneGRPIds = currentMatch.opponent.commanderGrpIds;
  match.oppDeck.companionGRPId = currentMatch.opponent.companionGRPId;

  if (
    (!match.tags || !match.tags.length) &&
    match.oppDeck.archetype &&
    match.oppDeck.archetype !== "-"
  ) {
    match.tags = [match.oppDeck.archetype];
  }
  if (matchEndTime) {
    match.date = normalizeISOString(matchEndTime);
  }
  match.bestOf = 1;
  if (currentMatch.gameInfo.matchWinCondition == "MatchWinCondition_Best2of3")
    match.bestOf = 3;
  if (currentMatch.gameInfo.matchWinCondition == "MatchWinCondition_Best3of5")
    match.bestOf = 5;

  match.duration = currentMatch.matchGameStats.reduce(
    (acc, cur) => acc + cur.time,
    0
  );
  match.gameStats = currentMatch.matchGameStats;

  // Convert string "2.2.19" into number for easy comparison, 1 byte per part, allowing for versions up to 255.255.255
  match.toolVersion = globals.toolVersion;
  match.toolRunFromSource = !electron.remote.app.isPackaged;
  match.arenaId = globals.store.getState().playerdata.playerName;
  return match;
}

export default function saveMatch(id: string, matchEndTime: number): void {
  const currentMatch = globalStore.currentMatch;
  console.log(currentMatch, id);
  if (currentMatch.matchId !== id) {
    return;
  }

  const existingMatch = getMatch(id) || { archived: false };
  const match = completeMatch(existingMatch, matchEndTime);
  if (!match) {
    return;
  }

  console.log("Save match:", match);
  const matches_index = [...globals.store.getState().matches.matchesIndex];
  reduxAction(
    globals.store.dispatch,
    { type: "SET_MATCH", arg: match },
    IPC_RENDERER
  );
  playerDb.upsert("", id, match);

  const gameNumberCompleted = currentMatch.gameInfo.results.filter(
    (res) => res.scope == "MatchScope_Match"
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
