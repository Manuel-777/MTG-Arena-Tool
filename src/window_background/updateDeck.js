import globals from "./globals";
import { IPC_OVERLAY } from "../shared/constants.js";
import { ipc_send } from "./backgroundUtil";
import forceDeckUpdate from "./forceDeckUpdate";
import getOpponentDeck from "./getOpponentDeck";
import { objectClone } from "../shared/util";

var lastDeckUpdate = new Date();

function update_deck(force) {
  var nd = new Date();
  if (
    (globals.debugLog || force || !globals.firstPass) &&
    nd - lastDeckUpdate > 1000
  ) {
    forceDeckUpdate();

    let currentMatchCopy = objectClone(globals.currentMatch);
    currentMatchCopy.oppCards = getOpponentDeck();
    currentMatchCopy.playerCardsLeft = globals.currentMatch.playerCardsLeft.getSave();
    currentMatchCopy.playerCardsOdds = globals.currentMatch.playerChances;
    currentMatchCopy.player.deck = globals.currentMatch.player.deck.getSave();
    currentMatchCopy.player.originalDeck = globals.currentMatch.player.originalDeck.getSave();
    delete currentMatchCopy.GREtoClient;
    delete currentMatchCopy.oppCardsUsed;
    delete currentMatchCopy.playerChances;
    delete currentMatchCopy.annotations;
    delete currentMatchCopy.gameObjs;
    delete currentMatchCopy.latestMessage;
    delete currentMatchCopy.processedAnnotations;
    delete currentMatchCopy.zones;
    currentMatchCopy = JSON.stringify(currentMatchCopy);
    ipc_send("set_match", currentMatchCopy, IPC_OVERLAY);
  }
}

export default update_deck;
