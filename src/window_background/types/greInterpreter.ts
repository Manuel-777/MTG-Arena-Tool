export interface KeyValuePair {
  key: string;
  type: string;
  f?: number[];
  valueNone?: number[];
  valueUint32?: number[];
  valueInt32?: number[];
  valueUint64?: number[];
  valueInt64?: number[];
  valueBool?: boolean[];
  valueString?: string[];
  valueFloat?: number[];
  valueDouble?: number[];
}

export interface DetailsType {
  [key: string]: any;
}

export interface AnnotationType {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: string[];
  AnnotationType?: string;
  KeyValuePairInfo?: KeyValuePair;
  details?: KeyValuePair[];
  ignoreForSeatIds?: number;
}

interface ValueType {
  value: number;
}

export interface GameObjectType {
  type: string;
  zoneId: number;
  controllerSeatId: number;
  grpId: number;
  instanceId: number;
  ownerSeatId: number;
  visibility: string;
  /*
  groupId: number;
  superTypes: string[];
  cardTypes: string[];
  subtypes: string[];
  color: string[];
  power: ValueType;
  toughness: ValueType;
  isCopy: number;
  isTapped: number;
  hasSummoningSickness: boolean;
  attackState: number;
  blockState: number;
  damage: number;
  attackInfo: number;
  blockInfo: number;
  viewers: number[];
  loyalty: number;
  objectSourceGrpId: number;
  name: number;
  abilities: number[];
  parentId: number;
  overlayGrpId: number;
  isFacedown: boolean;
  skinCode: number;
  loyaltyUsed: ValueType;
  */
}

interface GameObjectTypeCard extends GameObjectType {
  type: "GameObjectType_Card";
  controllerSeatId: 1;
  cardTypes: string[];
  subtypes: string[];
  color: string[];
  power: ValueType;
  toughness: ValueType;
  name: number;
  abilities: number[];
  overlayGrpId: number;
}

interface GameObjectTypeToken extends GameObjectType {
  type: "GameObjectType_Token";
  controllerSeatId: number;
  cardTypes: string[];
  subtypes: string[];
  power: ValueType;
  toughness: ValueType;
  hasSummoningSickness: boolean;
  objectSourceGrpId: number;
  name: number;
  abilities: number[];
  parentId: number;
  overlayGrpId: number;
}

export interface GameObjectTypeAbility extends GameObjectType {
  type: "GameObjectType_Ability";
  controllerSeatId: number;
  objectSourceGrpId: number;
  parentId: number;
}

interface GameObjectTypeEmblem extends GameObjectType {
  type: "GameObjectType_Emblem";
}

interface GameObjectTypeSplitCard extends GameObjectType {
  type: "GameObjectType_SplitCard";
  cardTypes: string[];
}

interface GameObjectTypeSplitLeft extends GameObjectType {
  type: "GameObjectType_SplitLeft";
  cardTypes: string[];
}

interface GameObjectTypeSplitRight extends GameObjectType {
  type: "GameObjectType_SplitRight";
  cardTypes: string[];
}

interface GameObjectTypeRevealedCard extends GameObjectType {
  type: "GameObjectType_RevealedCard";
  controllerSeatId: number;
  cardTypes: string[];
  subtypes: string[];
  power: ValueType;
  toughness: ValueType;
  name: number;
  abilities: number[];
  overlayGrpId: number;
}

interface GameObjectTypeTriggerHolder extends GameObjectType {
  type: "GameObjectType_TriggerHolder";
}

interface GameObjectTypeAdventure extends GameObjectType {
  type: "GameObjectType_Adventure";
  controllerSeatId: number;
  cardTypes: string[];
  subtypes: string[];
  color: string[];
  name: number;
  abilities: number[];
  parentId: number;
  overlayGrpId: number;
}

export type GameObject =
  | GameObjectTypeCard
  | GameObjectTypeToken
  | GameObjectTypeAbility
  | GameObjectTypeEmblem
  | GameObjectTypeSplitCard
  | GameObjectTypeSplitLeft
  | GameObjectTypeSplitRight
  | GameObjectTypeRevealedCard
  | GameObjectTypeTriggerHolder
  | GameObjectTypeAdventure;

export interface GameInfo {
  matchID: string;
  gameNumber: number;
  stage: string;
  type: string;
  variant: string;
  matchState: string;
  matchWinCondition: string;
  maxTimeoutCount: number;
  maxPipCount: number;
  timeoutDurationSec: number;
  results: Result[];
  superFormat: string;
  mulliganType: string;
  freeMulliganCount: number;
  deckConstraintInfo: DeckConstraintInfo;
}

interface DeckConstraintInfo {
  minDeckSize: number;
  maxDeckSize: number;
  maxSideboardSize: number;
}

export interface Timer {
  timerId: number;
  type: string;
  durationSec: number;
  elapsedSec: number;
  running: number;
  behavior: string;
  warningThresholdSec: number;
  elapsedMs: number;
}

export interface PlayerData {
  lifeTotal: number;
  systemSeatNumber: number;
  maxHandSize: number;
  teamId: number;
  timerIds: number[];
  controllerSeatId: number;
  controllerType: string;
  pendingMessageType: string;
  startingLifeTotal: number;
}

export interface TurnInfo {
  activePlayer: number;
  decisionPlayer: number;
  phase: number;
  step: number;
  turnNumber: number;
  priorityPlayer: number;
  stormCount: number;
  nextPhase: number;
  nextStep: number;
  currentPriority: number;
}

interface ManaColor {
  color: string[];
  count: number;
  costId: number;
}

export interface Action {
  seatId: number;
  action: {
    actionType: string;
    instanceId: number;
    manaCost: ManaColor[];
  };
}

export interface Team {
  id: number;
  playerIds: number[];
}

export interface Result {
  scope: string;
  result: string;
  winningTeamId: number;
  reason: string;
}

export interface ZoneType {
  zoneId: number;
  type: string;
  visibility: string;
  ownerSeatId: number;
  objectInstanceIds: number[];
  viewers: number[];
}

export interface ZoneData {
  [key: number]: ZoneTypeData;
}

export interface ZoneTypeData {
  [key: string]: CardTypeData;
}

export interface CardTypeData {
  [key: string]: number[];
}

interface GameStateMessage {
  type: string;
  gameStateId: number;
  gameInfo: GameInfo;
  teams: Team[];
  players: PlayerData[];
  turnInfo: TurnInfo;
  zones: ZoneType[];
  GameObjectTypes: GameObject[];
  annotations: AnnotationType[];
  diffDeletedInstanceIds: number[];
  pendingMessageCount: number;
  prevGameStateId: number;
  timers: Timer[];
  update: string;
  actions: Action[];
  gameObjects: GameObject[];
}

export interface GreMessage {
  type: string;
  msgId: number;
  gameStateMessage: GameStateMessage;
  dieRollResultsResp: {
    playerDieRolls: { systemSeatId: number; rollValue?: number }[];
  };
  connectResp: {
    status: string;
    majorVer: string;
    minorVer: string;
    revisionVer: string;
    buildVer: string;
    protoVer: string;
    seatId: string;
    settings: string;
    deckMessage: {
      deckCards: number[];
      sideboardCards: number[];
      commanderCards: number[];
    };
  };
}
