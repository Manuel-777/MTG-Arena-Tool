import Deck from "../shared/deck";
import { IPC_OVERLAY } from "../shared/constants";
import { ipcSend } from "./backgroundUtil";
import globalStore from "../shared-store";

export default function selectDeck(arg: Deck): void {
  // console.log("Select deck: ", globals.currentDeck, arg);
  globalStore.currentMatch.originalDeck = arg.clone();
  globalStore.currentMatch.currentDeck = arg.clone();
  ipcSend("set_deck", arg.getSave(), IPC_OVERLAY);
}
