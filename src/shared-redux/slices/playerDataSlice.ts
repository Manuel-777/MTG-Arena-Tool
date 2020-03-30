import { createSlice } from "@reduxjs/toolkit";

const playerDataSlice = createSlice({
  name: "playerdata",
  initialState: {
    playerId: "",
    arenaId: "",
    playerName: "",
    arenaVersion: "",
    economy: {
      gold: 0,
      gems: 0,
      vault: 0,
      wcTrack: 0,
      wcCommon: 0,
      wcUncommon: 0,
      wcRare: 0,
      wcMythic: 0,
      trackName: "",
      trackTier: 0,
      currentLevel: 0,
      currentExp: 0,
      currentOrbCount: 0,
      boosters: []
    },
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
    },
    setRank: (state, action): void => {
      state.rank = action.payload;
    },
    setEconomy: (state, action): void => {
      Object.assign(state.economy, action.payload);
    }
  }
});

export default playerDataSlice;
