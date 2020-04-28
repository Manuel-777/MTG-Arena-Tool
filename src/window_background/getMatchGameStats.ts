import _ from "lodash";
import db from "../shared/database";
import { MatchGameStats } from "../types/currentMatch";
import { getDeckChanges } from "./getDeckChanges";
import globalStore from "../shared-store";
import { setMatchGameStats } from "../shared-store/currentMatchStore";

export default function getMatchGameStats(): void {
  // This function should be able to be called multiple times, and not
  // modify state. So every time its called the result should be the same
  const currentMatch = globalStore.currentMatch;

  const players = currentMatch.players.map(
    player => player.systemSeatNumber || 0
  );
  // Calculate time of this game
  const time = players.reduce((acc, cur) => {
    return acc + currentMatch.priorityTimers.timers[cur];
  }, 0);
  // Get current number of games completed
  const gameNumberCompleted = currentMatch.gameInfo.results.filter(
    res => res.scope == "MatchScope_Game"
  ).length;

  const game: MatchGameStats = {
    time: Math.round(time / 1000),
    onThePlay: currentMatch.onThePlay,
    winner: currentMatch.gameWinner,
    win: currentMatch.gameWinner == currentMatch.playerSeat,
    shuffledOrder: [],
    // defaults
    handsDrawn: currentMatch.handsDrawn,
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
    cardsSeen: currentMatch.opponent.cardsUsed,
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

  for (let i = 0; i < currentMatch.initialLibraryInstanceIds.length; i++) {
    let instance = currentMatch.initialLibraryInstanceIds[i];
    while (
      (!currentMatch.instanceToCardIdMap[instance] ||
        !db.card(currentMatch.instanceToCardIdMap[instance])) &&
      currentMatch.idChanges[instance]
    ) {
      instance = currentMatch.idChanges[instance];
    }
    const cardId = currentMatch.instanceToCardIdMap[instance];
    if (db.card(cardId) !== undefined) {
      game.shuffledOrder.push(cardId);
    } else {
      break;
    }
  }

  if (gameNumberCompleted > 1) {
    const originalDeck = globalStore.currentMatch.originalDeck.clone();
    const newDeck = globalStore.currentMatch.currentDeck.clone();
    const sideboardChanges = getDeckChanges(
      newDeck,
      originalDeck,
      currentMatch.matchGameStats.slice(0, gameNumberCompleted - 1)
    );
    //console.log("Sideboard: " + gameNumberCompleted, currentMatch.gameInfo.results, newDeck.getSideboard(), originalDeck.getSideboard(), sideboardChanges);
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
  globalStore.currentMatch.currentDeck
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
  game.deckSize = deckSize;
  game.landsInDeck = landsInDeck;
  game.multiCardPositions = multiCardPositions;
  game.librarySize = librarySize;
  game.landsInLibrary = landsInLibrary;
  game.libraryLands = libraryLands;

  setMatchGameStats(gameNumberCompleted - 1, game);
}
