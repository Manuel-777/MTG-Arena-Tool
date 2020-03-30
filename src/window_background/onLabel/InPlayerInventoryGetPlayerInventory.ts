import { playerDb } from "../../shared/db/LocalDatabase";
import LogEntry from "../../types/logDecoder";
import { PlayerInventory } from "../../types/inventory";
import { reduxAction } from "../../shared-redux/sharedRedux";
import globals from "../globals";
import { IPC_RENDERER } from "../../shared/constants";

interface Entry extends LogEntry {
  json: () => PlayerInventory;
}

export default function InPlayerInventoryGetPlayerInventory(
  entry: Entry
): void {
  const json = entry.json();
  if (!json) return;
  const economy = {
    gold: json.gold,
    gems: json.gems,
    vault: json.vaultProgress,
    wcTrack: json.wcTrackPosition,
    wcCommon: json.wcCommon,
    wcUncommon: json.wcUncommon,
    wcRare: json.wcRare,
    wcMythic: json.wcMythic,
    boosters: json.boosters
  };
  reduxAction(
    globals.store.dispatch,
    "SET_PLAYER_ECONOMY",
    economy,
    IPC_RENDERER
  );
  playerDb.upsert("", "economy", economy);
}
