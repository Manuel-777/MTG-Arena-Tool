import globals from "./globals";
import db from "../shared/database";
import Deck from "../shared/deck";
import { SerializedDeck } from "../shared/types/Deck";
import { DbCardData } from "../shared/types/Metadata";

function calculateDeviation(values: number[]): number {
  return Math.sqrt(values.reduce((a, b) => a + b) / values.length - 1);
}

function getBestArchetype(deck: Deck): string {
  let bestMatch = "-";
  if (deck.getMainboard().get().length === 0) return bestMatch;

  // Calculate worst possible deviation for this deck
  let mainDeviations: number[] = [];

  deck
    .getMainboard()
    .get()
    .forEach(card => {
      const deviation = card.quantity;
      mainDeviations.push(deviation * deviation);
    });
  let lowestDeviation = calculateDeviation(mainDeviations);
  const highest = lowestDeviation; //err..

  // Test for each archetype
  Object.entries(db.archetypes).forEach(([key, arch]) => {
    //console.log(arch.name);
    mainDeviations = [];
    deck
      .getMainboard()
      .get()
      .forEach(card => {
        //let q = card.quantity;
        const name = (db.card(card.id) as DbCardData).name;
        const archMain = arch.average.mainDeck;

        const deviation = 1 - (archMain[name] ? 1 : 0); // archMain[name] ? archMain[name] : 0 // for full data
        mainDeviations.push(deviation * deviation);
        //console.log(name, deviation, q, archMain[name]);
      });
    const finalDeviation = calculateDeviation(mainDeviations);

    if (finalDeviation < lowestDeviation) {
      lowestDeviation = finalDeviation;
      bestMatch = arch.name;
    }
    //console.log(">>", averageDeviation, Math.sqrt(averageDeviation));
  });

  if (lowestDeviation > highest * 0.5) {
    return "Unknown";
  }

  return bestMatch;
}

function getOpponentDeck(): SerializedDeck {
  const _deck = new Deck({}, globals.currentMatch.oppCardsUsed, []);
  _deck.getMainboard().removeDuplicates(true);
  _deck.colors;

  const format = db.events_format[globals.currentMatch.eventId];
  globals.currentMatch.opponent.deck.archetype = "-";
  const deckSave = _deck.getSave();

  globals.currentMatch.oppArchetype = getBestArchetype(_deck);
  if (
    (format !== "Standard" && format !== "Traditional Standard") ||
    globals.currentMatch.oppArchetype == "Unknown"
  ) {
    // console.log(_deck);
    // console.log(_deck.colors);
    if (globals.currentMatch.opponent.commanderGrpIds?.length) {
      const card = db.card(globals.currentMatch.opponent.commanderGrpIds[0]);
      globals.currentMatch.oppArchetype = card ? card.name : "";
    } else {
      globals.currentMatch.oppArchetype = _deck.colors.getColorArchetype();
    }
  }
  deckSave.archetype = globals.currentMatch.oppArchetype;

  return deckSave;
}

export default getOpponentDeck;
