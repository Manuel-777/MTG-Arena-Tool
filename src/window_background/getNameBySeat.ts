import globals from "./globals";

const suffixLength = "#12345".length;

function getPlayerNameWithoutSuffix(playerName: string): string {
  return playerName.slice(0, -suffixLength);
}

// Get player name by seat in the game
const getNameBySeat = function(seat: number): string {
  try {
    if (seat === globals.currentMatch.player.seat) {
      const playerData = globals.store.getState().playerdata;
      return getPlayerNameWithoutSuffix(playerData.playerName);
    }

    let oppName = globals.currentMatch.opponent.name;
    if (!oppName) {
      return "Opponent";
    }
    if (oppName === "Sparky") {
      return oppName;
    }

    return getPlayerNameWithoutSuffix(oppName);
  } catch (e) {
    return "???";
  }
};

export default getNameBySeat;
