import _ from "lodash";
import db from "../shared/database";
import globals from "./globals";
import { MatchGameStats } from "../types/currentMatch";
import { getDeckChanges } from "./getDeckChanges";
import { reduxAction } from "../shared-redux/sharedRedux";
import { IPC_NONE } from "../shared/constants";

export default function getMatchGameStats(): void {
  const currentMatch = globals.store.getState().currentmatch;
  globals.currentMatch.opponent.cards = globals.currentMatch.oppCardsUsed;

  const players = currentMatch.players.map(
    player => player.systemSeatNumber || 0
  );
  // Calculate time of this game
  const time = players.reduce((acc, cur) => {
    console.log(acc, currentMatch.priorityTimers.timers[cur]);
    return acc + currentMatch.priorityTimers.timers[cur];
  }, 0);
  // Get current number of games completed
  const gameNumberCompleted = currentMatch.gameInfo.results.filter(
    res => res.scope == "MatchScope_Game"
  ).length;

  // get winner of the game
  const winningTeamId =
    currentMatch.gameInfo.results.filter(
      res => res.scope == "MatchScope_Match"
    )[0]?.winningTeamId || -1;

  const game: MatchGameStats = {
    time: Math.round((time || 0) / 1000),
    winner: winningTeamId,
    win: winningTeamId == globals.currentMatch.player.seat,
    shuffledOrder: [],
    // defaults
    handsDrawn: [],
    handLands: [],
    cardsCast: [],
    deckSize: 0,
    landsInDeck: 0,
    multiCardPositions: {},
    librarySize: 0,
    landsInLibrary: 0,
    libraryLands: [],
    sideboardChanges: {
      added: [],
      removed: []
    },
    deck: {
      id: "",
      commandZoneGRPIds: [],
      mainDeck: [],
      sideboard: [],
      name: "",
      deckTileId: 0,
      lastUpdated: new Date().toISOString(),
      format: "",
      description: "",
      type: "InternalDeck"
    }
  };

  for (let i = 0; i < globals.initialLibraryInstanceIds.length; i++) {
    let instance = globals.initialLibraryInstanceIds[i];
    while (
      (!globals.instanceToCardIdMap[instance] ||
        !db.card(globals.instanceToCardIdMap[instance])) &&
      globals.idChanges[instance]
    ) {
      instance = globals.idChanges[instance];
    }
    const cardId = globals.instanceToCardIdMap[instance];
    if (db.card(cardId) !== undefined) {
      game.shuffledOrder.push(cardId);
    } else {
      break;
    }
  }
  /*
  game.handsDrawn = payload.mulliganedHands.map(hand =>
    hand.map(card => card.grpId)
  );
  */
  game.handsDrawn.push(game.shuffledOrder.slice(0, 7));

  if (gameNumberCompleted > 1) {
    const originalDeck = globals.currentMatch.player.originalDeck.clone();
    const newDeck = globals.currentMatch.player.deck.clone();
    const sideboardChanges = getDeckChanges(
      newDeck,
      originalDeck,
      globals.matchGameStats
    );
    game.sideboardChanges = sideboardChanges;
    game.deck = newDeck.clone().getSave(true);
  }

  game.handLands = game.handsDrawn.map(
    hand => hand.filter(card => db.card(card)?.type.includes("Land")).length
  );
  const handSize = 7;
  let deckSize = 0;
  let landsInDeck = 0;
  const multiCardPositions: MatchGameStats["multiCardPositions"] = {
    "2": {},
    "3": {},
    "4": {}
  };
  const cardCounts: { [key: string]: number } = {};
  globals.currentMatch.player.deck
    .getMainboard()
    .get()
    .forEach(card => {
      cardCounts[card.id] = card.quantity;
      deckSize += card.quantity;
      if (card.quantity >= 2 && card.quantity <= 4) {
        multiCardPositions[card.quantity][card.id] = [];
      }
      const cardObj = db.card(card.id);
      if (cardObj && cardObj.type.includes("Land")) {
        landsInDeck += card.quantity;
      }
    });

  let landsSoFar = 0;
  const libraryLands: number[] = [];
  game.shuffledOrder.forEach((cardId, i) => {
    const cardCount = cardCounts[cardId];
    if (cardCount >= 2 && cardCount <= 4) {
      multiCardPositions[cardCount][cardId].push(i + 1);
    }
    if (i >= handSize) {
      const card = db.card(cardId);
      if (card && card.type.includes("Land")) {
        landsSoFar++;
      }
      libraryLands.push(landsSoFar);
    }
  });

  const landsInLibrary =
    landsInDeck - game.handLands[game.handLands.length - 1];
  const librarySize = deckSize - handSize;

  game.cardsCast = _.cloneDeep(currentMatch.cardsCast);
  reduxAction(globals.store.dispatch, "CLEAR_CARDS_CAST", true, IPC_NONE);
  game.deckSize = deckSize;
  game.landsInDeck = landsInDeck;
  game.multiCardPositions = multiCardPositions;
  game.librarySize = librarySize;
  game.landsInLibrary = landsInLibrary;
  game.libraryLands = libraryLands;

  globals.matchGameStats[gameNumberCompleted - 1] = game;
  globals.currentMatch.matchTime = globals.matchGameStats.reduce(
    (acc, cur) => acc + cur.time,
    0
  );
}
