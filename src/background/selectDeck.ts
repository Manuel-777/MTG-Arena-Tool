import { constants, Deck } from "mtgatool-shared";
import { ipcSend } from "./backgroundUtil";
import globalStore from "../shared/store";
import debugLog from "../shared/debugLog";

const { IPC_OVERLAY } = constants;

export default function selectDeck(arg: Deck): void {
  debugLog(`Select deck: ${arg}`);
  globalStore.currentMatch = {
   ...globalStore.currentMatch,
   originalDeck: arg.clone(),
   currentDeck: arg.clone(),
  };
  ipcSend("set_deck", arg.getSave(), IPC_OVERLAY);
}
