import globals from "./globals";
import globalStore from "../shared-store";

const suffixLength = "#12345".length;

function getPlayerNameWithoutSuffix(playerName: string): string {
  return playerName.slice(0, -suffixLength);
}

// Get player name by seat in the game
const getNameBySeat = function(seat: number): string {
  const currentMatch = globalStore.currentMatch;
  try {
    if (seat === currentMatch.playerSeat) {
      const playerData = globals.store.getState().playerdata;
      return getPlayerNameWithoutSuffix(playerData.playerName);
    }

    const oppName = currentMatch.opponent.name;
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
