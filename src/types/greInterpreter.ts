export interface DetailsSourceZone {
  source_zone: number;
}

export interface DetailsIdChange {
  orig_id: number;
  new_id: number;
}

export interface DetailsGrpId {
  grpid: number;
}

export interface DetailsDamage {
  damage: number;
  type: number;
}

export interface DetailsLife {
  life: number;
}

export interface DetailsPhaseStep {
  phase: number;
  step: number;
}

export interface DetailsAbilityGrpId {
  abilityGrpId: number;
  index: number;
}

export interface DetailsScry {
  topIds: number | undefined;
  bottomIds: number | undefined;
}

export type DetailsSrcDestCategoryType =
  | "PlayLand"
  | "Draw"
  | "Put"
  | "SBA_Damage"
  | "CastSpell"
  | "Discard"
  | "Return"
  | "Exile"
  | "Countered"
  | "Destroy";

export interface DetailsSrcDest {
  category?: DetailsSrcDestCategoryType;
  zone_src: number;
  zone_dest: number;
}

export type DetailsType =
  | DetailsSrcDest
  | DetailsSourceZone
  | DetailsIdChange
  | DetailsGrpId
  | DetailsDamage
  | DetailsLife
  | DetailsPhaseStep
  | DetailsAbilityGrpId
  | DetailsScry;

export type AggregatedDetailsType = DetailsSrcDest &
  DetailsSourceZone &
  DetailsIdChange &
  DetailsGrpId &
  DetailsDamage &
  DetailsLife &
  DetailsPhaseStep &
  DetailsAbilityGrpId &
  DetailsScry;

export type DetailsKeyType = keyof AggregatedDetailsType;

/**
 * Annotations union types
 */

interface AnnotationAbilityInstanceCreated {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: "AnnotationType_AbilityInstanceCreated";
  details: DetailsSourceZone;
}

interface AnnotationZoneTransfer {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: "AnnotationType_ZoneTransfer";
  details: DetailsSrcDest;
}

interface AnnotationEnteredZoneThisTurn {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: "AnnotationType_EnteredZoneThisTurn";
}

interface AnnotationObjectIdChanged {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: "AnnotationType_ObjectIdChanged";
  details: DetailsIdChange;
}

interface AnnotationResolutionStart {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: "AnnotationType_ResolutionStart";
  details: DetailsGrpId;
}

interface AnnotationDamageDealt {
  id: number;
  affectorId: number;
  affectedIds: number[];
  details: DetailsDamage;
  type: "AnnotationType_DamageDealt";
}

interface AnnotationModifiedLife {
  id: number;
  affectedIds: number[];
  details: DetailsLife;
  type: "AnnotationType_ModifiedLife";
}

interface AnnotationPhaseOrStepModified {
  id: number;
  affectedIds: number[];
  details: DetailsPhaseStep;
  type: "AnnotationType_PhaseOrStepModified";
}

interface AnnotationEnteredZoneThisTurn {
  id: number;
  affectorId: number;
  affectedIds: number[];
  type: "AnnotationType_EnteredZoneThisTurn";
}

interface AnnotationTargetSpec {
  id: number;
  affectorId: number;
  affectedIds: number[];
  details: DetailsAbilityGrpId;
  type: "AnnotationType_TargetSpec";
  allowRedaction: boolean;
}

interface AnnotationResolutionComplete {
  id: number;
  affectorId: number;
  affectedIds: number[];
  details: DetailsGrpId;
  type: "AnnotationType_ResolutionComplete";
}

interface AnnotationScry {
  id: number;
  affectorId: number;
  affectedIds: number[];
  details: DetailsScry;
  type: "AnnotationType_Scry";
}

interface AnnotationCardRevealed {
  id: number;
  affectorId: number;
  affectedIds: number[];
  details: DetailsSourceZone;
  ignoreForSeatIds: number[];
  type: "AnnotationType_CardRevealed";
}

export type Annotations =
  | AnnotationZoneTransfer
  | AnnotationAbilityInstanceCreated
  | AnnotationEnteredZoneThisTurn
  | AnnotationObjectIdChanged
  | AnnotationResolutionStart
  | AnnotationDamageDealt
  | AnnotationPhaseOrStepModified
  | AnnotationModifiedLife
  | AnnotationEnteredZoneThisTurn
  | AnnotationTargetSpec
  | AnnotationResolutionComplete
  | AnnotationScry
  | AnnotationCardRevealed;

export interface GameObjectType {
  type: string;
  zoneId: number;
  controllerSeatId: number;
  grpId: number;
  instanceId: number;
  ownerSeatId: number;
  visibility: string;
}

interface ValueType {
  value: number;
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

export interface Stop {
  stopType: string;
  appliesTo: string;
  status: string;
}

export interface Team {
  id: number;
  playerIds: number[];
}

export interface Result {
  scope: string;
  result: string;
  winningTeamId: number;
  reason?: string;
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
