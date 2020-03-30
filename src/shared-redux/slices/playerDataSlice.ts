import { createSlice } from "@reduxjs/toolkit";

const playerDataSlice = createSlice({
  name: "playerdata",
  initialState: {
    playerId: "",
    arenaId: "",
    playerName: "",
    arenaVersion: "",
    rank: {
      constructed: {
        rank: "",
        tier: 0,
        step: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        percentile: 0,
        leaderboardPlace: 0,
        seasonOrdinal: 0
      },
      limited: {
        rank: "",
        tier: 0,
        step: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        percentile: 0,
        leaderboardPlace: 0,
        seasonOrdinal: 0
      }
    }
  },
  reducers: {
    setPlayerId: (state, action): void => {
      state.playerId = action.payload;
    },
    setPlayerName: (state, action): void => {
      state.playerName = action.payload;
    },
    setArenaVersion: (state, action): void => {
      state.arenaVersion = action.payload;
    }
  }
});

export default playerDataSlice;
