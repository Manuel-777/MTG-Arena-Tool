import globals from "./globals";
import forceDeckUpdate from "./forceDeckUpdate";
import { objectClone } from "../shared/util";
import getOpponentDeck from "./getOpponentDeck";
import globalStore from "../shared-store";
import { IPC_OVERLAY } from "../shared/constants";
import { ipcSend } from "./backgroundUtil";

const lastDeckUpdate = new Date();

function updateDeck(force: boolean): void {
  const nd = new Date();
  if (
    (globals.debugLog || force || !globals.firstPass) &&
    nd.getTime() - lastDeckUpdate.getTime() > 1000
  ) {
    forceDeckUpdate();
    const currentMatch = globalStore.currentMatch;
    let currentMatchCopy = objectClone(currentMatch);
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
