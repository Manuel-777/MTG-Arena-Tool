import { ARENA_MODE_DRAFT } from "../../shared/constants";
import { ipcSend } from "../backgroundUtil";
import globals, { InternalDraftDefault } from "../globals";

export default function startDraft(): void {
  if (globals.debugLog || !globals.firstPass) {
    if (globals.store.getState().settings.close_on_match) {
      ipcSend("renderer_hide", 1);
    }
    ipcSend("set_arena_state", ARENA_MODE_DRAFT);
  }

  const playerData = globals.store.getState().playerdata;
  const appSettings = globals.store.getState().appsettings;
  const newDraft = {
    ...InternalDraftDefault,
    player: playerData.playerName,
    owner: appSettings.email
  };

  globals.currentDraft = newDraft;
  globals.duringDraft = true;
}
