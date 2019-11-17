import globals from "./globals";
import db from "../shared/database";
import Deck from "../shared/deck";

function getOpponentDeck() {
  let _deck = new Deck({}, globals.currentMatch.oppCardsUsed, false);
  _deck.mainboard.removeDuplicates(true);
  _deck.getColors();

  let format = db.events_format[globals.currentMatch.eventId];
  globals.currentMatch.opponent.deck.archetype = "-";
  let deckSave = _deck.getSave();

  globals.currentMatch.oppArchetype = getBestArchetype(_deck);
  if (
    (format !== "Standard" && format !== "Traditional Standard") ||
    globals.currentMatch.oppArchetype == "Unknown"
  ) {
    // console.log(_deck);
    // console.log(_deck.colors);
    if (
      globals.currentMatch.opponent.commanderGrpIds &&
      globals.currentMatch.opponent.commanderGrpIds.length
    ) {
      const card = db.card(globals.currentMatch.opponent.commanderGrpIds[0]);
      globals.currentMatch.oppArchetype = card ? card.name : "";
    } else {
      globals.currentMatch.oppArchetype = getColorArchetype(_deck.colors);
    }
  }
  deckSave.archetype = globals.currentMatch.oppArchetype;

  return deckSave;
}

function getBestArchetype(deck) {
  let bestMatch = "-";

  // Calculate worst possible deviation for this deck
  let mainDeviations = [];
  if (deck.mainboard.get().length == 0) return bestMatch;
  deck.mainboard.get().forEach(card => {
    let deviation = card.quantity;
    mainDeviations.push(deviation * deviation);
  });
  let lowestDeviation = Math.sqrt(
    mainDeviations.reduce((a, b) => a + b) / (mainDeviations.length - 1)
  );
  let highest = lowestDeviation; //err..

  // Test for each archetype
  db.archetypes.forEach(arch => {
    //console.log(arch.name);
    mainDeviations = [];
    deck.mainboard.get().forEach(card => {
      //let q = card.quantity;
      let name = db.card(card.id).name;
      let archMain = arch.average.mainDeck;

      let deviation = 1 - (archMain[name] ? 1 : 0); // archMain[name] ? archMain[name] : 0 // for full data
      mainDeviations.push(deviation * deviation);
      //console.log(name, deviation, q, archMain[name]);
    });
    let averageDeviation =
      mainDeviations.reduce((a, b) => a + b) / (mainDeviations.length - 1);
    let finalDeviation = Math.sqrt(averageDeviation);

    if (finalDeviation < lowestDeviation) {
      lowestDeviation = finalDeviation;
      bestMatch = arch;
    }
    //console.log(">>", averageDeviation, Math.sqrt(averageDeviation));
  });

  if (lowestDeviation > highest * 0.5) {
    return "Unknown";
  }

  return bestMatch.name;
}

function getColorArchetype(c) {
  if (c.length == 1) {
    if (c.w) return "Mono White";
    if (c.u) return "Mono Blue";
    if (c.b) return "Mono Black";
    if (c.g) return "Mono Green";
    if (c.r) return "Mono Red";
  } else if (c.length == 2) {
    if (c.w && c.u) return "Azorius";
    if (c.b && c.r) return "Rakdos";
    if (c.g && c.w) return "Selesnya";
    if (c.u && c.b) return "Dimir";
    if (c.r && c.g) return "Gruul";
    if (c.w && c.b) return "Orzhov";
    if (c.u && c.r) return "Izzet";
    if (c.b && c.g) return "Golgari";
    if (c.r && c.w) return "Boros";
    if (c.g && c.u) return "Simic";
  } else if (c.length == 3) {
    if (c.w && c.u && c.b) return "Esper";
    if (c.u && c.b && c.r) return "Grixis";
    if (c.b && c.r && c.g) return "Jund";
    if (c.r && c.g && c.w) return "Naya";
    if (c.g && c.w && c.u) return "Bant";
    if (c.g && c.w && c.b) return "Abzan";
    if (c.w && c.u && c.r) return "Jeskai";
    if (c.u && c.b && c.g) return "Sultai";
    if (c.b && c.r && c.w) return "Mardu";
    if (c.r && c.g && c.u) return "Temur";
  } else if (c.length == 4) {
    if (c.w && c.u && c.b && c.r) return "WUBR";
    if (c.u && c.b && c.r && c.g) return "UBRG";
    if (c.w && c.b && c.r && c.g) return "WBRG";
    if (c.w && c.u && c.r && c.g) return "WURG";
    if (c.w && c.u && c.b && c.g) return "WUBG";
  } else if (c.length == 5) {
    return "5-color";
  }
}

export default getOpponentDeck;
