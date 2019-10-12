const { setData } = require("./background-util");
// import store
const globals = require("./globals");
const playerData = require("../shared/player-data.js");

const addCustomDeck = function(customDeck) {
  const id = customDeck.id;
  const deckData = {
    // preserve custom fields if possible
    ...(playerData.deck(id) || {}),
    ...customDeck
  };

  setData({ decks: { ...playerData.decks, [customDeck.id]: deckData } });
  if (globals.debugLog || !globals.firstPass)
    globals.store.set("decks." + id, deckData);
};

module.exports = addCustomDeck;
