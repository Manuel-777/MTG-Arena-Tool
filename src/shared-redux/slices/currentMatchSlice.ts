import { createSlice } from "@reduxjs/toolkit";
import {
  PlayerInfo,
  ZoneInfo,
  AnnotationInfo,
  GameInfo,
  TurnInfo
} from "../../proto/GreTypes";

import { CardCast, PriorityTimers } from "../../types/currentMatch";

import { GameObject } from "../../types/greInterpreter";

const initialStateObject = {
  onThePlay: 0,
  msgId: 0,
  players: [] as PlayerInfo[],
  turnInfo: {} as TurnInfo,
  gameInfo: {} as GameInfo,
  // Time stuff
  priorityTimers: {
    last: 0,
    timers: [0, 0, 0, 0, 0] as number[]
  } as PriorityTimers,
  currentPriority: 0,
  // Zones, objects, annotations, ids tracking
  zones: [] as ZoneInfo[],
  annotations: [] as AnnotationInfo[],
  processedAnnotations: [] as number[],
  gameObjects: [] as GameObject[],
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
    setManyZones: (state, action): void => {
      const newZones = { ...state.zones };
      action.payload.forEach((zone: ZoneInfo) => {
        newZones[zone.zoneId || 0] = zone;
      });
      Object.assign(state.zones, newZones);
    },
    setAnnotation: (state, action): void => {
      const ann = action.payload as AnnotationInfo;
      state.annotations[ann.id || 0] = ann;
    },
    setManyAnnotations: (state, action): void => {
      const newAnn = { ...state.annotations };
      action.payload.forEach((annotation: AnnotationInfo) => {
        newAnn[annotation.id || 0] = annotation;
      });
      Object.assign(state.annotations, newAnn);
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
    setManyGameObjects: (state, action): void => {
      const newObjs = { ...state.gameObjects };
      action.payload.forEach((obj: GameObject) => {
        if (obj.instanceId) {
          newObjs[obj.instanceId] = obj;
          if (obj.grpId) {
            state.instanceToCardIdMap[obj.instanceId] = obj.grpId;
          }
        }
      });
      Object.assign(state.gameObjects, newObjs);
    },
    setIdChange: (state, action): void => {
      const details = action.payload;
      state.idChanges[details.orig_id] = details.new_id;
    },
    addCardCast: (state, action): void => {
      state.cardsCast.push(action.payload);
    },
    clearCardsCast: (state): void => {
      Object.assign(state.cardsCast, []);
    }
  }
});

export default currentMatchSlice;
