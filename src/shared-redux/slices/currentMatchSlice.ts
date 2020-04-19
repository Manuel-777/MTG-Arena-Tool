import { createSlice } from "@reduxjs/toolkit";
import {
  Phase,
  Step,
  GameType,
  GameStage,
  GameVariant,
  MulliganType,
  SuperFormat,
  MatchWinCondition,
  PlayerInfo,
  ResultSpec,
  ZoneInfo,
  AnnotationInfo,
  GameInfo
} from "../../proto/GreTypes";

import { CardCast } from "../../types/currentMatch";

import { GameObject } from "../../types/greInterpreter";

const initialStateObject = {
  gameNumber: 0,
  onThePlay: 0,
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
    nextStep: "Step_None" as Step,
    currentPriority: 0
  },
  gameInfo: {} as GameInfo,
  gameStage: "GameStage_None" as GameStage,
  gameType: "GameType_None" as GameType,
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
  },
  zones: {} as Record<number, ZoneInfo>,
  annotations: [] as AnnotationInfo[],
  processedAnnotations: [] as number[],
  gameObjects: {} as Record<number, GameObject>,
  instanceToCardIdMap: {} as Record<number, number>,
  idChanges: {} as Record<number, number>,
  cardsCast: [] as CardCast[]
};

const currentMatchSlice = createSlice({
  name: "currentMatch",
  initialState: initialStateObject,
  reducers: {
    resetCurrentGame: (state): void => {
      Object.assign(state, initialStateObject);
    },
    setOnThePlay: (state, action): void => {
      Object.assign(state.onThePlay, action.payload);
    },
    setGameNumber: (state, action): void => {
      Object.assign(state.gameNumber, action.payload);
    },
    setSuperFormat: (state, action): void => {
      Object.assign(state.superFormat, action.payload);
    },
    setTurnInfo: (state, action): void => {
      Object.assign(state.turnInfo, action.payload);
    },
    setMany: (state, action): void => {
      Object.assign(state, action.payload);
    },
    setPlayers: (state, action): void => {
      Object.assign(state.players, action.payload);
    },
    setGameInfo: (state, action): void => {
      Object.assign(state.gameInfo, action.payload);
    },
    setZone: (state, action): void => {
      state.zones[action.payload.zoneId] = action.payload;
    },
    setAnnotation: (state, action): void => {
      const ann = action.payload as AnnotationInfo;
      state.annotations[ann.id || 0] = ann;
    },
    setAnnotationProcessed: (state, action): void => {
      state.processedAnnotations.push(action.payload);
    },
    removeProcessedAnnotations: (state): void => {
      state.annotations = state.annotations.filter(
        (ann: AnnotationInfo) =>
          !state.processedAnnotations.includes(ann.id || 0)
      );
    },
    setGameObject: (state, action): void => {
      const obj = action.payload as GameObject;
      if (obj.instanceId) {
        state.gameObjects[obj.instanceId] = obj;
        if (obj.grpId) {
          state.instanceToCardIdMap[obj.instanceId] = obj.grpId;
        }
      }
    },
    setIdChange: (state, action): void => {
      const details = action.payload;
      state.idChanges[details.orig_id] = details.new_id;
    },
    addCardCast: (state, action): void => {
      state.cardsCast.push(action.payload);
    }
  }
});

export default currentMatchSlice;
