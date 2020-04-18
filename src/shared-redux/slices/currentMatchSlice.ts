import { createSlice } from "@reduxjs/toolkit";
import {
  EnumPhase,
  EnumStep,
  EnumGameType,
  EnumGameVariant,
  EnumMulliganType,
  EnumSuperFormat,
  EnumMatchWinCondition,
  PlayerInfo,
  ResultSpec
} from "../../proto/GreTypes";

const currentMatchSlice = createSlice({
  name: "currentMatch",
  initialState: {
    players: [] as PlayerInfo[],
    turnInfo: {
      phase: "Phase_None" as EnumPhase,
      step: "Step_None" as EnumStep,
      turnNumber: 0,
      activePlayer: 0,
      priorityPlayer: 0,
      decisionPlayer: 0,
      stormCount: 0,
      nextPhase: "Phase_None" as EnumPhase,
      nextStep: "Step_None" as EnumStep
    },
    gameType: "GameType_None" as EnumGameType,
    gameNumber: 0,
    gameVariant: "GameVariant_None" as EnumGameVariant,
    results: [] as ResultSpec[],
    mulliganType: "MulliganType_None" as EnumMulliganType,
    superFormat: "SuperFormat_None" as EnumSuperFormat,
    matchWinCondition: "MatchWinCondition_None" as EnumMatchWinCondition,
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
