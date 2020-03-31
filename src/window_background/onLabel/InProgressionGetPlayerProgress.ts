import LogEntry from "../../types/logDecoder";
import { playerDb } from "../../shared/db/LocalDatabase";
import { PlayerProgression } from "../../types/progression";
import { reduxAction } from "../../shared-redux/sharedRedux";
import { IPC_RENDERER } from "../../shared/constants";
import globals from "../globals";

interface Entry extends LogEntry {
  json: () => PlayerProgression;
}

export default function onLabelInProgressionGetPlayerProgress(
  entry: Entry
): void {
  const json = entry.json();
  if (!json || !json.activeBattlePass) return;
  const activeTrack = json.activeBattlePass;
  const economy = {
    ...globals.store.getState().playerdata.economy,
    trackName: activeTrack.trackName,
    // this one is not in my logs, but I havent purchased the pass this season
    trackTier: activeTrack.currentTier,
    currentLevel: activeTrack.currentLevel,
    currentExp: activeTrack.currentExp,
    currentOrbCount: activeTrack.currentOrbCount
  };
  reduxAction(
    globals.store.dispatch,
    "SET_PLAYER_ECONOMY",
    economy,
    IPC_RENDERER
  );
  playerDb.upsert("", "economy", economy);
}
