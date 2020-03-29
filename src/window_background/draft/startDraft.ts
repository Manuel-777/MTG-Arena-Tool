import { ARENA_MODE_DRAFT } from "../../shared/constants";
import playerData from "../../shared/PlayerData";
import { ipcSend } from "../backgroundUtil";
import globals, { InternalDraftDefault } from "../globals";

export default function startDraft(): void {
  if (globals.debugLog || !globals.firstPass) {
    if (globals.store.getState().settings.close_on_match) {
      ipcSend("renderer_hide", 1);
    }
    ipcSend("set_arena_state", ARENA_MODE_DRAFT);
  }

  const newDraft = {
    ...InternalDraftDefault,
    player: playerData.name,
    owner: playerData.userName
  };

  globals.currentDraft = newDraft;
  globals.duringDraft = true;
}
