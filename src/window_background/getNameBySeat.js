const playerData = require("../shared/player-data");
const globals = require("./globals");

// Get player name by seat in the game
const getNameBySeat = function(seat) {
  try {
    if (seat == globals.currentMatch.player.seat) {
      return playerData.name.slice(0, -6);
    } else {
      let oppName = globals.currentMatch.opponent.name;
      if (oppName && oppName !== "Sparky") {
        oppName = oppName.slice(0, -6);
      }
      return oppName || "Opponent";
    }
  } catch (e) {
    return "???";
  }
};

module.exports = getNameBySeat;
