import globals from "./globals";
import Deck from "../shared/deck";
import { IPC_OVERLAY } from "../shared/constants";
import { ipcSend } from "./backgroundUtil";

export default function selectDeck(arg: Deck): void {
  // console.log("Select deck: ", globals.currentDeck, arg);
  globals.originalDeck = arg.clone();
  ipcSend("set_deck", arg.getSave(), IPC_OVERLAY);
}
