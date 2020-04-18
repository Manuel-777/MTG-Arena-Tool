import { createSlice } from "@reduxjs/toolkit";
import {
  Phase,
  Step,
  GameType,
  GameVariant,
  MulliganType,
  SuperFormat,
  MatchWinCondition,
  PlayerInfo,
  ResultSpec
} from "../../proto/GreTypes";

const currentMatchSlice = createSlice({
  name: "currentMatch",
  initialState: {
    players: [] as PlayerInfo[],
    turnInfo: {
      phase: "Phase_None" as Phase,
      step: "Step_None" as Step,
      turnNumber: 0,
      activePlayer: 0,
      priorityPlayer: 0,
      decisionPlayer: 0,
      stormCount: 0,
      nextPhase: "Phase_None" as Phase,
      nextStep: "Step_None" as Step
    },
    gameType: "GameType_None" as GameType,
    gameNumber: 0,
    gameVariant: "GameVariant_None" as GameVariant,
    results: [] as ResultSpec[],
    mulliganType: "MulliganType_None" as MulliganType,
    superFormat: "SuperFormat_None" as SuperFormat,
    matchWinCondition: "MatchWinCondition_None" as MatchWinCondition,
    deckConstraintInfo: {
      minDeckSize: 0,
      maxDeckSize: 0,
      minSideboardSize: 0,
      maxSideboardSize: 0,
      minCommanderSize: 0,
      maxCommanderSize: 0
    }
  },
  reducers: {
    setFormat: (state, action): void => {
      state.superFormat = action.payload;
    }
  }
});

export default currentMatchSlice;
