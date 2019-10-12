const globals = require("./globals");
const db = require("../shared/database");
const Deck = require("../shared/deck");

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
    globals.currentMatch.oppArchetype = getColorArchetype(_deck.colors);
  }
  deckSave.archetype = globals.currentMatch.oppArchetype;

  return deckSave;
}

module.exports = getOpponentDeck;
