import globals from "./globals";
import forceDeckUpdate from "./forceDeckUpdate";
import getOpponentDeck from "./getOpponentDeck";
import globalStore from "../shared/store";
import { ipcSend } from "./backgroundUtil";
import { constants, objectClone } from "mtgatool-shared";

const { IPC_OVERLAY } = constants;

function updateDeck(force: boolean): void {
  if (
    (globals.debugLog || force || !globals.firstPass) &&
    new Date().getTime() - globals.lastDeckUpdate.getTime() > 250
  ) {
    globals.lastDeckUpdate = new Date();
    forceDeckUpdate();
    const currentMatch = globalStore.currentMatch;
    let currentMatchCopy = objectClone<any>(currentMatch);
    currentMatchCopy.oppCards = getOpponentDeck();
    currentMatchCopy.playerCardsLeft = currentMatch.cardsLeft.getSave();
    currentMatchCopy.playerCardsOdds = currentMatch.cardsOdds;
    currentMatchCopy.player.deck = currentMatch.currentDeck.getSave();
    currentMatchCopy.player.originalDeck = currentMatch.originalDeck.getSave();
    delete currentMatchCopy.GREtoClient;
    delete currentMatchCopy.oppCardsUsed;
    delete currentMatchCopy.playerChances;
    delete currentMatchCopy.annotations;
    delete currentMatchCopy.gameObjs;
    delete currentMatchCopy.latestMessage;
    delete currentMatchCopy.processedAnnotations;
    delete currentMatchCopy.zones;
    currentMatchCopy = JSON.stringify(currentMatchCopy);
    ipcSend("set_match", currentMatchCopy, IPC_OVERLAY);
  }
}

export default updateDeck;
