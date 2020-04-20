import { createSlice } from "@reduxjs/toolkit";
import {
  PlayerInfo,
  ZoneInfo,
  AnnotationInfo,
  GameInfo,
  TurnInfo
} from "../../proto/GreTypes";

import { CardCast, PriorityTimers } from "../../types/currentMatch";

import { GameObject, DetailsIdChange } from "../../types/greInterpreter";
import { InternalPlayer } from "../../types/match";

const initialStateObject = {
  matchId: "",
  eventId: "",
  onThePlay: 0,
  msgId: 0,
  playerSeat: 0,
  oppSeat: 0,
  opponent: {} as InternalPlayer,
  // Info
  player: {} as InternalPlayer,
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
  zones: {} as Record<number, ZoneInfo>,
  annotations: {} as Record<number, AnnotationInfo>,
  processedAnnotations: [] as number[],
  gameObjects: {} as Record<number, GameObject>,
  initialLibraryInstanceIds: [] as number[],
  instanceToCardIdMap: {} as Record<number, number>,
  idChanges: {} as Record<number, number>,
  cardsCast: [] as CardCast[]
};

const currentMatchSlice = createSlice({
  name: "currentMatch",
  initialState: initialStateObject,
  reducers: {
    setMatchId: (state, action): void => {
      state.matchId = action.payload;
    },
    setEventId: (state, action): void => {
      state.eventId = action.payload;
    },
    setPlayer: (state, action): void => {
      Object.assign(state.player, action.payload);
    },
    setOpponent: (state, action): void => {
      Object.assign(state.opponent, action.payload);
    },
    setPlayerCardsUsed: (state, action): void => {
      state.player.cardsUsed = action.payload;
    },
    setOppCardsUsed: (state, action): void => {
      state.opponent.cardsUsed = action.payload;
    },
    resetCurrentMatch: (state): void => {
      Object.assign(state, initialStateObject);
    },
    resetCurrentGame: (state): void => {
      Object.assign(state, {
        msgId: 0,
        turnInfo: {},
        Info: {},
        priorityTimers: initialStateObject.priorityTimers,
        currentPriority: 0,
        zones: {},
        annotations: {},
        processedAnnotations: [],
        gameObjects: {},
        initialLibraryInstanceIds: [],
        instanceToCardIdMap: {},
        idChanges: {},
        cardsCast: []
      });
    },
    setOnThePlay: (state, action): void => {
      state.onThePlay = action.payload;
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
      state.annotations = newAnn;
    },
    removeAnnotations: (state, action): void => {
      const newProcessed = [...state.processedAnnotations, ...action.payload];
      const newAnn = {} as Record<number, AnnotationInfo>;

      Object.keys(state.annotations).map((k: string) => {
        const id = parseInt(k);
        if (!newProcessed.includes(id)) {
          newAnn[id] = state.annotations[id];
        }
      });

      Object.assign(state.annotations, newAnn);
      Object.assign(state.processedAnnotations, newProcessed);
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
      const details = action.payload as DetailsIdChange;
      state.idChanges[details.orig_id] = details.new_id;
    },
    addCardCast: (state, action): void => {
      state.cardsCast = [...state.cardsCast, action.payload];
    },
    clearCardsCast: (state): void => {
      Object.assign(state.cardsCast, []);
    },
    setInitialLibraryInstanceIds: (state, action): void => {
      Object.assign(state.initialLibraryInstanceIds, action.payload);
    }
  }
});

export default currentMatchSlice;
