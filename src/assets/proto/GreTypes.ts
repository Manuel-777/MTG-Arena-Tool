/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-empty-interface */
// generated file, do not touch!
import ByteBuffer from "bytebuffer";

export interface AIConfig {
  matchConfig?: MatchConfig;
  defaultSettings?: SettingsMessage;
  deckConfigs: DeckConfig[];
}

export interface AIConfigData {
  mode?: AIMode;
  tracingEnabled?: AIConfigOption;
  viewOpponentHand?: AIConfigOption;
  viewOpponentLibrary?: number;
  maximumDepth?: number;
  maximumBreadth?: number;
  maximumNodeExpansion?: number;
  timeoutInMilliseconds?: number;
  transpositionTableSizeInKB?: number;
  randomSeed?: number;
  configureValueHeuristics: ValueHeuristicDefinition[];
  configureOrderingHeuristics: OrderingHeuristicDefinition[];
  configureHistoryOn?: AIConfigOption;
  allowOpponentUndo?: AIConfigYesNo;
  allowOpponentControl?: AIConfigYesNo;
  valueHeuristicParameters: ValueHeuristicParameter[];
  orderingHeuristicParameters: OrderingHeuristicParameter[];
  diagnosticMode?: number;
  randomOrderingRange?: number;
  transEnable?: boolean;
  concedeOnException?: boolean;
}

export interface AIReconfigureData {
  tracingEnabled?: AIConfigOption;
  maximumDepth?: number;
  maximumBreadth?: number;
  maximumNodeExpansion?: number;
  transpositionTableSizeInKB?: number;
  randomSeed?: number;
  configureValueHeuristics: ValueHeuristicDefinition[];
  configureOrderingHeuristics: OrderingHeuristicDefinition[];
  valueHeuristicParameters: ValueHeuristicParameter[];
  orderingHeuristicParameters: OrderingHeuristicParameter[];
  transEnable?: boolean;
  concedeOnException?: boolean;
}

export interface Action {
  actionType?: ActionType;
  grpId?: number;
  instanceId?: number;
  abilityGrpId?: number;
  sourceId?: number;
  alternativeGrpId?: number;
  manaPaymentOptions: ManaPaymentOption[];
  manaCost: ManaRequirement[];
  shouldStop?: boolean;
  disqualifyingSourceId?: number;
  selectionType?: number;
  selection?: number;
  alternativeSourceZcid?: number;
  visibility?: Visibility;
  targets: TargetSelection[];
  manaPaymentConditions: ManaPaymentCondition[];
  autoTapSolution?: AutoTapSolution;
  costSelectionIds: number[];
  costCounters: Counter[];
  maxActivations?: number;
  isBatchable?: boolean;
}

export interface ActionInfo {
  actionId?: number;
  seatId?: number;
  action?: Action;
}

export interface ActionsAvailableReq {
  actions: Action[];
  inactiveActions: Action[];
}

export interface AnnotationInfo {
  id?: number;
  affectorId?: number;
  affectedIds: number[];
  type: AnnotationType[];
  details: KeyValuePairInfo[];
  allowRedaction?: boolean;
  ignoreForSeatIds: number[];
  redactAffected?: boolean;
}

export interface AnyLobbyMessage {
  clientToLobbyMessage?: ClientToLobbyMessage;
  lobbyToClientMessage?: LobbyToClientMessage;
}

export interface AnyMessage {
  timestamp?: number;
  serverToGREMessage?: ServerToGREMessage;
  gREToServerMessage?: GREToServerMessage;
  clientToGREMessage?: ClientToGREMessage;
  gREToClientMessage?: GREToClientMessage;
}

export interface AnyServiceMessage {
  userContext?: UserContext;
  clientToMatchServiceMessage?: ClientToMatchServiceMessage;
  matchServiceToClientMessage?: MatchServiceToClientMessage;
  clientToLobbyMessage?: ClientToLobbyMessage;
  lobbyToClientMessage?: LobbyToClientMessage;
}
export interface RequestContext {}
export interface UserContext {
  userId?: string;
  userRoles: string[];
  authenticationType?: AuthenticationType;
}

export interface AnyToGREMessage {
  timestamp?: number;
  serverToGREMessage?: ServerToGREMessage;
  clientToGREMessage?: ClientToGREMessage;
}

export interface AssignDamageConfirmation {
  result?: ResultCode;
}

export interface AssignDamageReq {
  damageAssigners: DamageAssigner[];
}

export interface AssignDamageResp {
  assigners: DamageAssigner[];
}

export interface AttackInfo {
  targetId?: number;
  damageOrdered?: boolean;
  damageAssigned?: boolean;
  orderedBlockers: OrderedDamageAssignment[];
  alternativeGrpId?: number;
}

export interface AttackWarning {
  instanceId?: number;
  type?: AttackWarningType;
  warningPromptId?: number;
}

export interface Attacker {
  attackerInstanceId?: number;
  legalDamageRecipients: DamageRecipient[];
  selectedDamageRecipient?: DamageRecipient;
  alternativeGrpId?: number;
  autoAttacked?: boolean;
  mustAttack?: boolean;
}

export interface AuthenticateRequest {
  clientId?: string;
  clientAuthToken?: ByteBuffer;
  playerName?: string;
  playFabSessionTicket?: string;
  inactivityTimeoutMs?: number;
  clientInfo?: ClientInfo;
}

export interface AuthenticateResponse {
  clientId?: string;
  sessionId?: string;
  screenName?: string;
}

export interface AutoAnswer {
  promptGrpId?: number;
  abilityGrpId?: number;
  cardTitleId?: number;
  appliesTo?: SettingScope;
  status?: SettingStatus;
  answer?: Answer;
}

export interface AutoRespondPermission {
  seatIds: number[];
}

export interface AutoTapAction {
  instanceId?: number;
  abilityGrpId?: number;
  manaId?: number;
  manaPaymentOption?: ManaPaymentOption;
  costCategory?: CostCategory;
}

export interface AutoTapActionsAvailableReq {
  autoTapSolutions: AutoTapSolution[];
}

export interface AutoTapSolution {
  autoTapActions: AutoTapAction[];
  manaPaymentConditions: ManaPaymentCondition[];
}

export interface AutoYield {
  abilityGrpId?: number;
  cardTitleId?: number;
  appliesTo?: SettingScope;
  status?: SettingStatus;
}

export interface BinaryGameState {
  gameStateMsg?: GameStateMessage;
  instanceData?: ByteBuffer;
  internalGREData?: ByteBuffer;
}

export interface BlockInfo {
  attackerIds: number[];
  damageOrdered?: boolean;
  damageAssigned?: boolean;
  orderedAttackers: OrderedDamageAssignment[];
}

export interface BlockWarning {
  instanceId?: number;
  type?: BlockWarningType;
  warningPromptId?: number;
}

export interface Blocker {
  blockerInstanceId?: number;
  attackerInstanceIds: number[];
  selectedAttackerInstanceIds: number[];
  minAttackers?: number;
  maxAttackers?: number;
  mustBlock?: boolean;
}

export interface CLIPSConfiguration {
  enableWatch?: boolean;
  enableMetrics?: boolean;
  enableLogging?: boolean;
  initFile?: string;
  maxFiringLimit?: number;
  warningFiringLimit?: number;
  metricsFile?: string;
  logFile?: string;
}

export interface CancelActionReq {}

export interface CardConfig {
  count?: number;
  title?: string;
  expansionCode?: string;
}

export interface CardSkinTuple {
  catalogId?: number;
  skinCode?: string;
}

export interface CastingTimeOptionReq {
  ctoId?: number;
  castingTimeOptionType?: CastingTimeOptionType;
  affectedId?: number;
  affectorId?: number;
  grpId?: number;
  playerIdToPrompt?: number;
  isRequired?: boolean;
  prompt?: Prompt;
  numericInputReq?: NumericInputReq;
  selectManaTypeReq?: SelectManaTypeReq;
  modalReq?: ModalReq;
  selectNReq?: SelectNReq;
  manaCost: ManaRequirement[];
  autoTapSolution?: AutoTapSolution;
}

export interface CastingTimeOptionResp {
  ctoId?: number;
  castingTimeOptionType?: CastingTimeOptionType;
  numericInputResp?: NumericInputResp;
  selectManaTypeResp?: SelectManaTypeResp;
  chooseModalResp?: ChooseModalResp;
  selectNResp?: SelectNResp;
}

export interface CastingTimeOptionsReq {
  castingTimeOptionReq: CastingTimeOptionReq[];
}

export interface CastingTimeOptionsResp {
  castingTimeOptionResp?: CastingTimeOptionResp;
}

export interface CheckpointConfiguration {
  enabled?: boolean;
}

export interface ChooseModalResp {
  abilityGrpId?: number;
  grpIds: number[];
}

export interface ChooseStartingPlayerReq {
  teamType?: TeamType;
  systemSeatIds: number[];
  teamIds: number[];
  prompt?: Prompt;
}

export interface ChooseStartingPlayerResp {
  teamType?: TeamType;
  systemSeatId?: number;
  teamId?: number;
}

export interface ClearLobbyUserStatusRequest {
  userId?: string;
}

export interface ClearLobbyUserStatusResponse {
  userInfo?: LobbyUserInfo;
}

export interface ClientInfo {
  clientId?: string;
  clientType?: ClientType;
  clientVersion?: string;
  clientLocation?: string;
  clientLanguage?: string;
}

export interface ClientSessionInfo {
  clientId?: string;
  sessionId?: string;
  roles: string[];
  userName?: string;
  screenName?: string;
  clientInfo?: ClientInfo;
}

export interface ClientToFrontDoorMessage {
  clientToLobbyMessage?: ClientToLobbyMessage;
  clientToLapaMessage?: ClientToLapaMessage;
}

export interface ClientToGREMessage {
  type?: ClientMessageType;
  systemSeatId?: number;
  gameStateId?: number;
  respId?: number;
  connectReq?: ConnectReq;
  cancelActionReq?: CancelActionReq;
  chooseModalResp?: ChooseModalResp;
  concedeReq?: ConcedeReq;
  forceDrawReq?: ForceDrawReq;
  groupResp?: GroupResp;
  mulliganResp?: MulliganResp;
  optionalResp?: OptionalResp;
  orderResp?: OrderResp;
  performActionResp?: PerformActionResp;
  selectNResp?: SelectNResp;
  setSettingsReq?: SetSettingsReq;
  chooseStartingPlayerResp?: ChooseStartingPlayerResp;
  declareAttackersResp?: DeclareAttackersResp;
  declareBlockersResp?: DeclareBlockersResp;
  orderCombatDamageResp?: OrderCombatDamageResp;
  assignDamageResp?: AssignDamageResp;
  selectTargetsResp?: SelectTargetsResp;
  selectReplacementResp?: SelectReplacementResp;
  selectNGroupResp?: SelectNGroupResp;
  distributionResp?: DistributionResp;
  numericInputResp?: NumericInputResp;
  searchResp?: SearchResp;
  effectCostResp?: EffectCostResp;
  castingTimeOptionsResp?: CastingTimeOptionsResp;
  selectManaTypeResp?: SelectManaTypeResp;
  selectFromGroupsResp?: SelectFromGroupsResp;
  searchFromGroupsResp?: SearchFromGroupsResp;
  gatherResp?: GatherResp;
  submitPaymentResp?: SubmitPaymentResp;
  uiMessage?: UIMessage;
  submitDeckResp?: SubmitDeckResp;
  controlReq?: ControlReq;
  performAutoTapActionsResp?: PerformAutoTapActionsResp;
  timerId?: number;
}

export interface ClientToLapaMessage {
  payload?: string;
}

export interface ClientToLobbyMessage {
  clientId?: string;
  requestId?: number;
  timestamp?: number;
  correlationInfo?: CorrelationInfo;
  authenticateRequest?: AuthenticateRequest;
  serviceInfoRequest?: ServiceInfoRequest;
  clientSessionInfo?: ClientSessionInfo;
  getUserIdsRequest?: GetLobbyUserIdsRequest;
  getUserInfoRequest?: GetLobbyUserInfoRequest;
  clearLobbyUserStatusRequest?: ClearLobbyUserStatusRequest;
  joinQueueRequest?: JoinQueueRequest;
  dropQueueRequest?: DropQueueRequest;
  deleteQueueRequest?: DeleteQueueRequest;
  joinMatchmakingRequestV2?: JoinMatchmakingRequestV2;
  dropMatchmakingRequestV2?: DropMatchmakingRequestV2;
  joinConstructedMatchmakingRequest?: JoinConstructedMatchmakingRequest;
  dropConstructedMatchmakingRequest?: DropConstructedMatchmakingRequest;
  matchServiceToClientMessage?: MatchServiceToClientMessage;
  echoRequest?: EchoRequest;
}

export interface ClientToMatchDoorConnectRequest {
  matchId?: string;
  mcFabricUri?: string;
  clientToGreMessageBytes?: ByteBuffer;
}

export interface ClientToMatchServiceMessage {
  requestId?: number;
  clientToMatchServiceMessageType?: ClientToMatchServiceMessageType;
  timestamp?: number;
  transactionId?: string;
  payload?: ByteBuffer;
}

export interface CombatDamageOrder {
  instanceId?: number;
  recipients?: OrderReq;
  decisionPrompt?: Prompt;
}

export interface CombatDamageOrderAssignment {
  instanceId?: number;
  recipients?: OrderResp;
  decisionPrompt?: Prompt;
}

export interface ConcedeReq {
  scope?: MatchScope;
  gameNumber?: number;
}

export interface ConnectReq {
  majorVer?: number;
  minorVer?: number;
  revisionVer?: number;
  buildVer?: number;
  defaultSettings?: SettingsMessage;
  protoVer?: ProtoVersion;
  seatId?: number;
}

export interface ConnectResp {
  status?: ConnectionStatus;
  majorVer?: number;
  minorVer?: number;
  revisionVer?: number;
  buildVer?: number;
  protoVer?: ProtoVersion;
  seatId?: number;
  settings?: SettingsMessage;
  deckMessage?: DeckMessage;
}

export interface ContinuationToken {
  timestamp?: number;
}

export interface ControlReq {
  type?: ControllerType;
  controllerId?: number;
}

export interface CorrelationInfo {
  correlationId?: string;
}

export interface CosmeticConfig {
  seatId?: number;
  data?: string;
}

export interface CosmeticInfo {
  seatId?: number;
  data?: string;
}

export interface Counter {
  id?: number;
  type?: CounterType;
  count?: number;
  sourceId?: number;
}

export interface CounterPair {
  instanceId?: number;
  counterType?: CounterType;
}

export interface CreateMatchGameRoomRequest {
  gameRoomConfig?: MatchGameRoomConfig;
}

export interface CreateMatchGameRoomResponse {
  gameRoomInfo?: MatchGameRoomInfo;
}

export interface CreateMatchGameRoomResponseV2 {
  mcFabricUri?: string;
}

export interface DamageAssigner {
  instanceId?: number;
  totalDamage?: number;
  assignments: DamageAssignment[];
  decisionPrompt?: Prompt;
  canIgnoreBlockers?: boolean;
}

export interface DamageAssignment {
  instanceId?: number;
  minDamage?: number;
  maxDamage?: number;
  assignedDamage?: number;
}

export interface DamageRecipient {
  type?: DamageRecType;
  teamId?: number;
  playerSystemSeatId?: number;
  planeswalkerInstanceId?: number;
}

export interface DeckConfig {
  seatId?: number;
  deckCards: CardConfig[];
  sideboardCards: CardConfig[];
  commanderCards: CardConfig[];
  deckFilePath?: string;
}

export interface DeckConstraintInfo {
  minDeckSize?: number;
  maxDeckSize?: number;
  minSideboardSize?: number;
  maxSideboardSize?: number;
  minCommanderSize?: number;
  maxCommanderSize?: number;
}

export interface DeckInfo {
  deckId?: string;
  userId?: string;
  courseId?: string;
  deckName?: string;
  libraryCardIds: number[];
  sideboardCardIds: number[];
}

export interface DeckMessage {
  deckCards: number[];
  sideboardCards: number[];
  commanderCards: number[];
  deckMessageFieldFour?: number;
}

export interface DeclareAttackersReq {
  attackers: Attacker[];
  hasRequirements?: boolean;
  hasRestrictions?: boolean;
  attackWarnings: AttackWarning[];
  manaCost: ManaRequirement[];
  autoAttackers: Attacker[];
}

export interface DeclareAttackersResp {
  selectedAttackers: Attacker[];
  autoDeclare?: boolean;
  autoDeclareDamageRecipient?: DamageRecipient;
}

export interface DeclareBlockersReq {
  blockers: Blocker[];
  hasRequirements?: boolean;
  hasRestrictions?: boolean;
  blockWarnings: BlockWarning[];
}

export interface DeclareBlockersResp {
  selectedBlockers: Blocker[];
}

export interface DeleteQueueRequest {
  queueType?: QueueType;
  eventId?: string;
}

export interface DeleteQueueResponse {}

export interface DieRollResultsResp {
  playerDieRolls: PlayerDieRoll[];
}

export interface Distribution {
  instanceId?: number;
  amount?: number;
}

export interface DistributionReq {
  optionIndex?: number;
  minAmount?: number;
  maxAmount?: number;
  minPerTarget?: number;
  targetIds: number[];
  existingDistributionValues: number[];
  requiredDistributionValues: number[];
  validSelectedTargetIds: number[];
  sourceId?: number;
}

export interface DistributionResp {
  optionIndex?: number;
  distributions: Distribution[];
}

export interface DraftGameRoomConfig {
  gameRoomId?: string;
  eventId?: string;
}

export interface DraftGameRoomInfo {}

export interface DropConstructedMatchmakingRequest {}

export interface DropMatchmakingRequestV2 {
  eventId?: string;
  courseId?: string;
}

export interface DropMatchmakingResponse {
  responseCode?: DropMatchmakingResponseCode;
}

export interface DropMatchmakingResponseV2 {
  responseCode?: DropMatchmakingResponseCode;
}

export interface DropQueueRequest {
  queueType?: QueueType;
  eventId?: string;
}

export interface DropQueueResponse {}

export interface EchoRequest {
  message?: string;
}

export interface EchoResponse {
  message?: string;
}

export interface EdictalMessage {
  edictMessage?: ClientToGREMessage;
}

export interface EffectCostReq {
  index?: number;
  effectCostType?: EffectCostType;
  costSelection?: SelectNReq;
  counterSelection?: SelectCountersReq;
  groupSelection?: SelectFromGroupsReq;
}

export interface EffectCostResp {
  index?: number;
  effectCostType?: EffectCostType;
  costSelection?: SelectNResp;
  counterSelection?: SelectCountersResp;
  groupSelection?: SelectFromGroupsResp;
}

export interface FinalMatchResult {
  matchId?: string;
  matchForceResult?: ResultSpec;
  matchCompletedReason?: MatchCompletedReasonType;
  resultList: ResultSpec[];
  errorMessage?: string;
}

export interface ForceDrawReq {
  scope?: MatchScope;
}

export interface FrontDoorToClientMessage {
  lobbyToClientMessage?: LobbyToClientMessage;
}

export interface GRECancelScheduledMessage {
  timerId?: number;
}

export interface GRECheckpointRequest {}

export interface GREConfigRequest {
  greConfiguration?: GREConfiguration;
}

export interface GREConfiguration {
  gameStateRedactorConfiguration?: GameStateRedactorConfiguration;
  clipsConfiguration?: CLIPSConfiguration;
  checkpointConfiguration?: CheckpointConfiguration;
}

export interface GRECreateRequest {
  greID?: number;
  matchID?: string;
  gameID?: number;
  majorVer?: number;
  minorVer?: number;
  revisionVer?: number;
  buildVer?: number;
}

export interface GRECreateResponse {
  greID?: number;
  result?: GRETHHostErrorCode;
}

export interface GREDestroyRequest {
  greID?: number;
}

export interface GREDestroyResponse {
  greID?: number;
  result?: GRETHHostErrorCode;
}

export interface GREElapseTimeRequest {
  timerId?: number;
  timeMs?: number;
}

export interface GREExpireTimerRequest {
  timerId?: number;
}

export interface GREForceResultRequest {
  result?: ResultSpec;
}

export interface GREInterpretRequest {
  clips?: string;
}

export interface GREResumeMatchRequest {
  binaryGameState?: BinaryGameState;
}

export interface GREScheduledMessage {
  timerId?: number;
  delayMs?: number;
  message?: ServerToGREMessage;
}

export interface GREStartDelayedTimerMessage {
  seatId?: number;
}

export interface GREStartMatchRequest {
  matchConfig?: MatchConfig;
}

export interface GRETHHostEmulatorLaunch {
  programName?: string;
  executablePath?: string;
  sharedLibraryFilename?: string;
  greIRFilename?: string;
  linkID?: number;
  hostID?: number;
  sutID?: number;
  logFilename?: string;
  syslogIPAddress?: string;
  syslogTCPPort?: string;
  syslogProcID?: string;
  outFilename?: string;
  enableRedaction?: boolean;
}

export interface GRETHHostEmulatorLaunchResp {
  result?: number;
  hostID?: number;
  pID?: number;
}

export interface GRETHHostEmulatorShutdown {
  shutdownHostID?: number;
}

export interface GRETHHostEmulatorShutdownResp {
  result?: number;
  shutdownHostID?: number;
}

export interface GRETickMessage {}

export interface GRETimeoutMessage {
  seatId?: number;
  type?: TimeoutType;
}

export interface GRETimerExpiredMessage {
  expiredTimerId?: number;
  serverToGREMessage?: ServerToGREMessage;
  clientToGREMessage?: ClientToGREMessage;
}

export interface GREToAnyMessage {
  timestamp?: number;
  gREToServerMessage?: GREToServerMessage;
  gREToClientMessage?: GREToClientMessage;
}

export interface GREToClientMessage {
  type?: GREMessageType;
  systemSeatIds: number[];
  msgId?: number;
  gameStateId?: number;
  gameStateMessage?: GameStateMessage;
  prompt?: Prompt;
  chooseStartingPlayerReq?: ChooseStartingPlayerReq;
  optionalActionMessage?: OptionalActionMessage;
  actionsAvailableReq?: ActionsAvailableReq;
  orderReq?: OrderReq;
  groupReq?: GroupReq;
  selectNReq?: SelectNReq;
  modalReq?: ModalReq;
  mulliganReq?: MulliganReq;
  getSettingsResp?: GetSettingsResp;
  setSettingsResp?: SetSettingsResp;
  connectResp?: ConnectResp;
  illegalRequestMessage?: IllegalRequestMessage;
  binaryGameState?: BinaryGameState;
  declareAttackersReq?: DeclareAttackersReq;
  submitAttackersResp?: SubmitAttackersResp;
  declareBlockersReq?: DeclareBlockersReq;
  submitBlockersResp?: SubmitBlockersResp;
  assignDamageReq?: AssignDamageReq;
  assignDamageConfirmation?: AssignDamageConfirmation;
  orderCombatDamageReq?: OrderCombatDamageReq;
  orderDamageConfirmation?: OrderDamageConfirmation;
  selectTargetsReq?: SelectTargetsReq;
  submitTargetsResp?: SubmitTargetsResp;
  payCostsReq?: PayCostsReq;
  nonDecisionPlayerPrompt?: Prompt;
  intermissionReq?: IntermissionReq;
  dieRollResultsResp?: DieRollResultsResp;
  selectReplacementReq?: SelectReplacementReq;
  selectNGroupReq?: SelectNGroupReq;
  distributionReq?: DistributionReq;
  numericInputReq?: NumericInputReq;
  searchReq?: SearchReq;
  castingTimeOptionsReq?: CastingTimeOptionsReq;
  informationalUseOnly?: boolean;
  selectManaTypeReq?: SelectManaTypeReq;
  selectFromGroupsReq?: SelectFromGroupsReq;
  searchFromGroupsReq?: SearchFromGroupsReq;
  gatherReq?: GatherReq;
  allowCancel?: AllowCancel;
  uiMessage?: UIMessage;
  submitDeckReq?: SubmitDeckReq;
  edictalMessage?: EdictalMessage;
  timeoutMessage?: TimeoutMessage;
  timerStateMessage?: TimerStateMessage;
  allowUndo?: boolean;
}

export interface GREToServerMessage {
  msgId?: number;
  binaryGameState?: BinaryGameState;
  reportResultMessage?: ReportResultMessage;
  scheduledMessage?: GREScheduledMessage;
  cancelScheduledMessage?: GRECancelScheduledMessage;
  gameMetrics?: GameMetrics;
}

export interface GameInfo {
  matchID?: string;
  gameNumber?: number;
  stage?: GameStage;
  type?: GameType;
  variant?: GameVariant;
  matchState?: MatchState;
  matchWinCondition?: MatchWinCondition;
  maxTimeoutCount?: number;
  maxPipCount?: number;
  timeoutDurationSec?: number;
  results: ResultSpec[];
  superFormat?: SuperFormat;
  mulliganType?: MulliganType;
  freeMulliganCount?: number;
  deckConstraintInfo?: DeckConstraintInfo;
}

export interface GameMetrics {
  playerMetrics: PlayerMetrics[];
}

export interface GameObjectInfo {
  instanceId?: number;
  grpId?: number;
  type?: GameObjectType;
  zoneId?: number;
  visibility?: Visibility;
  ownerSeatId?: number;
  controllerSeatId?: number;
  superTypes: SuperType[];
  cardTypes: CardType[];
  subtypes: SubType[];
  color: CardColor[];
  power?: Int32Value;
  toughness?: Int32Value;
  isCopy?: boolean;
  isTapped?: boolean;
  hasSummoningSickness?: boolean;
  attackState?: AttackState;
  blockState?: BlockState;
  damage?: number;
  attackInfo?: AttackInfo;
  blockInfo?: BlockInfo;
  viewers: number[];
  loyalty?: UInt32Value;
  objectSourceGrpId?: number;
  name?: number;
  abilities: number[];
  parentId?: number;
  overlayGrpId?: number;
  isFacedown?: boolean;
  skinCode?: string;
  loyaltyUsed?: UInt32Value;
  abilityOriginalCardGrpIds: number[];
  baseSkinCode?: string;
}

export interface GameStateMessage {
  type?: GameStateType;
  gameStateId?: number;
  gameInfo?: GameInfo;
  teams: TeamInfo[];
  players: PlayerInfo[];
  turnInfo?: TurnInfo;
  zones: ZoneInfo[];
  gameObjects: GameObjectInfo[];
  annotations: AnnotationInfo[];
  diffDeletedInstanceIds: number[];
  pendingMessageCount?: number;
  prevGameStateId?: number;
  timers: TimerInfo[];
  update?: GameStateUpdate;
  actions: ActionInfo[];
}

export interface GameStateRedactorConfiguration {
  enableRedaction?: boolean;
  enableForceDiff?: boolean;
  enableZoneRedaction?: boolean;
}

export interface GatherReq {
  optionIndex?: number;
  destinationId?: number;
  sources: GatherSource[];
}

export interface GatherResp {
  optionIndex?: number;
  gatherings: Gathering[];
}

export interface GatherSource {
  sourceId?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface Gathering {
  instanceId?: number;
  amount?: number;
}

export interface GetGameRoomIdsRequest {
  eventId?: string;
  gameRoomType?: GameRoomType;
  gameRoomStateTypeFilter: MatchGameRoomStateType[];
  includeInvisibleRooms?: boolean;
  includeReservedRooms?: boolean;
  sortFilterPagingOptions?: SortFilterPagingOptions;
}

export interface GetGameRoomIdsResponse {
  gameRoomIds: string[];
  continuationToken?: ContinuationToken;
}

export interface GetGameRoomInfoRequest {
  gameRoomId?: string;
}

export interface GetGameRoomInfoResponse {
  matchRoomInfo?: MatchGameRoomInfo;
  draftRoomInfo?: DraftGameRoomInfo;
}

export interface GetLobbyUserIdsRequest {
  sortFilterPagingOptions?: SortFilterPagingOptions;
}

export interface GetLobbyUserIdsResponse {
  userIds: string[];
  continuationToken?: ContinuationToken;
}

export interface GetLobbyUserInfoRequest {
  userId?: string;
}

export interface GetLobbyUserInfoResponse {
  userInfo?: LobbyUserInfo;
}

export interface GetSettingsResp {
  settings?: SettingsMessage;
}

export interface GreToClientEvent {
  greToClientMessages: GREToClientMessage[];
}

export interface Group {
  ids: number[];
  groupId?: number;
  zoneType?: ZoneType;
  subZoneType?: SubZoneType;
  minSelect?: number;
  maxSelect?: number;
  isFacedown?: boolean;
}

export interface GroupReq {
  instanceIds: number[];
  groupSpecs: GroupSpecification[];
  totalSelected?: number;
  idx?: number;
  groupType?: GroupType;
  context?: GroupingContext;
  sourceId?: number;
}

export interface GroupResp {
  groups: Group[];
  idx?: number;
  groupType?: GroupType;
}

export interface GroupSpecification {
  lowerBound?: number;
  upperBound?: number;
  zoneType?: ZoneType;
  subZoneType?: SubZoneType;
  prompt?: Prompt;
  isFacedown?: boolean;
}

export interface IRLoaderConfiguration {
  enableLimitedIRLoading?: boolean;
}

export interface IllegalRequestMessage {
  invalidMessage?: ClientToGREMessage;
  reason?: FailureReason;
}

export interface Int32Value {
  value?: number;
}

export interface IntermissionReq {
  options: UserOption[];
  intermissionPrompt?: Prompt;
  gameResultType?: ResultType;
  winningTeamId?: number;
  result?: ResultSpec;
}

export interface JoinConstructedMatchmakingRequest {
  matchType?: ConstructedMatchType;
  numberOfGames?: number;
  deckId?: string;
}

export interface JoinMatchGameRoomRequest {
  gameRoomId?: string;
  gameRoomPassword?: string;
}

export interface JoinMatchGameRoomResponse {
  gameRoomInfo?: MatchGameRoomInfo;
}

export interface JoinMatchGameRoomResponseV2 {
  seatId?: number;
}

export interface JoinMatchmakingRequestV2 {
  eventId?: string;
  courseId?: string;
}

export interface JoinMatchmakingResponse {
  responseCode?: JoinMatchmakingResponseCode;
}

export interface JoinMatchmakingResponseV2 {
  responseCode?: JoinMatchmakingResponseCode;
}

export interface JoinQueueRequest {
  queueType?: QueueType;
  eventId?: string;
  deckId?: string;
  matchmakingFilter?: string;
  courseId?: string;
}

export interface JoinQueueResponse {
  queueInfo?: LobbyUserQueueInfo;
}

export interface KeyValuePairInfo {
  key?: string;
  type?: KeyValuePairValueType;
  valueUint32: number[];
  valueInt32: number[];
  valueUint64: number[];
  valueInt64: number[];
  valueBool: boolean[];
  valueString: string[];
  valueFloat: number[];
  valueDouble: number[];
}

export interface LobbyDraftInfo {
  userId?: string;
  eventId?: string;
  draftId?: string;
  draftStartedTimestamp?: number;
  draftCompletedTimestamp?: number;
}

export interface LobbyError {
  lobbyErrorCode?: LobbyErrorCode;
  errorMessage?: string;
}

export interface LobbyMatchCompletedEvent {
  matchInfo?: LobbyMatchInfo;
}

export interface LobbyMatchConfig {
  matchId?: string;
  eventId?: string;
  matchGatewayUrl?: string;
  mcFabricUri?: string;
  players: LobbyMatchPlayerInfo[];
}

export interface LobbyMatchCreatePendingEvent {
  matchCreatePendingTimestamp?: number;
}

export interface LobbyMatchCreatedEvent {
  matchConfig?: LobbyMatchConfig;
  matchCreatedTimestamp?: number;
}

export interface LobbyMatchInfo {
  config?: LobbyMatchConfig;
  matchGameRoomInfo?: MatchGameRoomInfo;
  matchCreatedTimestamp?: number;
  matchStartedTimestamp?: number;
  matchCompletedTimestamp?: number;
  matchResultsSavedTimestamp?: number;
}

export interface LobbyMatchPlayerInfo {
  playerName?: string;
  systemSeatId?: number;
  teamId?: number;
  isWotc?: boolean;
}

export interface LobbyServiceInfo {
  serviceFabricServiceInfo?: ServiceFabricServiceInfo;
  environmentId?: string;
}

export interface LobbyToClientMessage {
  error?: LobbyError;
  requestId?: number;
  timestamp?: number;
  correlationInfo?: CorrelationInfo;
  authenticateResponse?: AuthenticateResponse;
  serviceInfoResponse?: LobbyServiceInfo;
  getUserIdsResponse?: GetLobbyUserIdsResponse;
  getUserInfoResponse?: GetLobbyUserInfoResponse;
  clearLobbyUserStatusResponse?: ClearLobbyUserStatusResponse;
  joinQueueResponse?: JoinQueueResponse;
  dropQueueResponse?: DropQueueResponse;
  deleteQueueResponse?: DeleteQueueResponse;
  joinMatchmakingResponseV2?: JoinMatchmakingResponseV2;
  dropMatchmakingResponseV2?: DropMatchmakingResponseV2;
  joinMatchmakingResponse?: JoinMatchmakingResponse;
  dropMatchmakingResponse?: DropMatchmakingResponse;
  clientToMatchServiceMessage?: ClientToMatchServiceMessage;
  matchCreatedEvent?: LobbyMatchCreatedEvent;
  matchCompletedEvent?: LobbyMatchCompletedEvent;
  matchCreatePendingEvent?: LobbyMatchCreatePendingEvent;
  echoResponse?: EchoResponse;
}

export interface LobbyUserInfo {
  userId?: string;
  stateType?: LobbyUserStateType;
  stateUpdatedTimestamp?: number;
  userConnectionInfo?: UserConnectionInfo;
  presenceState?: PresenceState;
  queueInfo?: LobbyUserQueueInfo;
  draftInfo?: LobbyDraftInfo;
  matchInfo?: LobbyMatchInfo;
}

export interface LobbyUserQueueInfo {
  userId?: string;
  eventId?: string;
  joinQueueRequest?: ClientToLobbyMessage;
  joinQueueResponse?: LobbyToClientMessage;
}

export interface ManaInfo {
  manaId?: number;
  color?: ManaColor;
  srcInstanceId?: number;
  specs: Spec[];
  abilityGrpId?: number;
  linkedSelections: number[];
}
export interface Spec {
  type?: ManaSpecType;
}

export interface ManaPaymentCondition {
  colors: ManaColor[];
  specs: ManaSpecType[];
  abilityGrpId?: number;
}

export interface ManaPaymentOption {
  mana: ManaInfo[];
  optionIndex?: number;
  haveReplacementsBeenApplied?: boolean;
  haveTriggersBeenApplied?: boolean;
  isUnpredictable?: boolean;
}

export interface ManaRequirement {
  color: ManaColor[];
  count?: number;
  costId?: number;
  objectId?: number;
  abilityGrpId?: number;
}

export interface MatchConfig {
  gameType?: GameType;
  gameVariant?: GameVariant;
  winCondition?: MatchWinCondition;
  maxPlayerHandSize?: number;
  teams: TeamConfig[];
  testConfig?: TestConfig;
  mulliganType?: MulliganType;
  timerConfigs: TimerConfig[];
  timerPackage?: TimerPackage;
  timeoutConfig?: TimeoutConfig;
  cosmeticConfigs: CosmeticConfig[];
  superFormat?: SuperFormat;
  deckConstraintInfo?: DeckConstraintInfo;
}

export interface MatchControllerClientSessionSettings {
  subscribedEventTypes: MatchControllerEventType[];
}

export interface MatchControllerGetSettingsRequest {
  propertyNames: string[];
}

export interface MatchControllerGetSettingsResponse {
  matchControllerSettings?: MatchControllerSettings;
  clientSessionSettings?: MatchControllerClientSessionSettings;
}

export interface MatchControllerHealthReport {
  serviceInfo?: MatchControllerServiceInfo;
  timestamp?: number;
}

export interface MatchControllerServiceInfo {
  serviceFabricServiceInfo?: ServiceFabricServiceInfo;
  environmentId?: string;
  matchControllerState?: MatchControllerState;
}

export interface MatchControllerSetSettingsRequest {
  settings?: MatchControllerSettings;
  clientSessionSettings?: MatchControllerClientSessionSettings;
}

export interface MatchControllerSetSettingsResponse {
  settings?: MatchControllerSettings;
  clientSessionSettings?: MatchControllerClientSessionSettings;
}

export interface MatchControllerSettings {
  greIrBin?: string;
  grpdXml?: string;
  currentSeason?: string;
}

export interface MatchControllerStateChangedEvent {
  serviceInfo?: MatchControllerServiceInfo;
  timestamp?: number;
}

export interface MatchGameRoomConfig {
  gameRoomId?: string;
  eventId?: string;
  reservedPlayers: MatchGameRoomPlayerInfo[];
  matchId?: string;
  matchConfig?: MatchConfig;
  greConfig?: GREConfiguration;
  isVisible?: boolean;
  password?: string;
  greIrBinPath?: string;
  greHostLoggerLevel?: string;
  greRecorderConfig?: string;
  joinRoomTimeoutSecs?: number;
  playerDisconnectTimeoutSecs?: number;
}

export interface MatchGameRoomInfo {
  gameRoomId?: string;
  gameRoomConfig?: MatchGameRoomConfig;
  stateType?: MatchGameRoomStateType;
  finalMatchResult?: FinalMatchResult;
  interimMatchResultList: ResultSpec[];
  players: MatchGameRoomPlayerInfo[];
  playerMetrics: MatchPlayerMetrics[];
  matchControllerUri?: string;
  matchClusterUri?: string;
  createdTimestamp?: number;
  updatedTimestamp?: number;
  matchResultSavedTimestamp?: number;
  creatorClientType?: ClientType;
  creatorId?: string;
}

export interface MatchGameRoomOpponentConnectionStateChangedEvent {
  matchId?: string;
  systemSeatId?: number;
  eventType?: ConnectionStateChangedEventType;
  timestamp?: number;
}

export interface MatchGameRoomPlayerInfo {
  userId?: string;
  playerName?: string;
  systemSeatId?: number;
  teamId?: number;
  connectionInfo?: UserConnectionInfo;
  courseId?: string;
  deckId?: string;
  clientAuthToken?: string;
  joinTimestamp?: number;
  inactivityTimeoutTimestamp?: number;
  disconnectTimeoutTimestamp?: number;
}

export interface MatchGameRoomStateChangedEvent {
  gameRoomInfo?: MatchGameRoomInfo;
  timestamp?: number;
}

export interface MatchPlayerMetrics {
  userId?: string;
  metrics: PlayerMetricKeyValuePair[];
}

export interface MatchResultSaved {
  matchId?: string;
  timestamp?: number;
}

export interface MatchServiceError {
  errorCode?: MatchServiceErrorCode;
  errorMessage?: string;
}

export interface MatchServiceToClientMessage {
  transactionId?: string;
  requestId?: number;
  timestamp?: number;
  error?: MatchServiceError;
  greToClientEvent?: GreToClientEvent;
  matchGameRoomStateChangedEvent?: MatchGameRoomStateChangedEvent;
  matchControllerStateChangedEvent?: MatchControllerStateChangedEvent;
  matchControllerHealthReport?: MatchControllerHealthReport;
  opponentConnectionStateChangedEvent?: MatchGameRoomOpponentConnectionStateChangedEvent;
  authenticateResponse?: AuthenticateResponse;
  serviceInfoResponse?: MatchControllerServiceInfo;
  getSettingsResponse?: MatchControllerGetSettingsResponse;
  setSettingsResponse?: MatchControllerSetSettingsResponse;
  createMatchGameRoomResponse?: CreateMatchGameRoomResponse;
  createMatchGameRoomResponseV2?: CreateMatchGameRoomResponseV2;
  joinMatchGameRoomResponse?: JoinMatchGameRoomResponse;
  joinMatchGameRoomResponseV2?: JoinMatchGameRoomResponseV2;
  getGameRoomIdsResponse?: GetGameRoomIdsResponse;
  getGameRoomInfoResponse?: GetGameRoomInfoResponse;
  echoResponse?: EchoResponse;
}

export interface ModalOption {
  grpId?: number;
}

export interface ModalReq {
  modalOptions: ModalOption[];
  abilityGrpId?: number;
  minSel?: number;
  maxSel?: number;
  repeatedSelectAllowed?: boolean;
  excludedOptions: ModalOption[];
}

export interface MulliganReq {
  mulliganType?: MulliganType;
  freeMulliganCount?: number;
  mulliganCount?: number;
}

export interface MulliganResp {
  decision?: MulliganOption;
}

export interface NumericInputReq {
  optionIndex?: number;
  minValue?: number;
  maxValue?: number;
  stepSize?: number;
  sourceId?: number;
}

export interface NumericInputResp {
  optionIndex?: number;
  numericInputValue?: number;
}

export interface OnChat {
  text?: string;
}

export interface OnGenericEvent {
  category?: string;
  payload?: string;
}

export interface OnHover {
  objectId?: number;
}

export interface OnSelect {
  objectId?: number;
}

export interface OnShuffle {
  objectIds: number[];
}

export interface OptionalActionMessage {
  prompt?: Prompt;
  sourceId?: number;
  optionalActionTypes: CardMechanicType[];
  recipientIds: number[];
  highlight?: HighlightType;
}

export interface OptionalResp {
  response?: OptionResponse;
  persistence?: ChoicePersistence;
  appliesTo?: SettingScope;
  mapTo?: SettingKey;
}

export interface OrderCombatDamageReq {
  orderDamageType?: OrderCombatDamageType;
  orders: CombatDamageOrder[];
}

export interface OrderCombatDamageResp {
  orderDamageType?: OrderCombatDamageType;
  orders: CombatDamageOrderAssignment[];
}

export interface OrderDamageConfirmation {
  result?: ResultCode;
  orderDamageType?: OrderCombatDamageType;
}

export interface OrderKey {
  activePlayer?: PlayerIs;
  turnPhase?: Phase;
  phaseStep?: Step;
  requestType?: GREMessageType;
  context?: number;
}

export interface OrderReq {
  ids: number[];
  idx?: number;
  orderingContext?: OrderingContext;
}

export interface OrderResp {
  ids: number[];
  ordering?: OrderingType;
  idx?: number;
}

export interface OrderedDamageAssignment {
  instanceId?: number;
  assignedDamage?: number;
}

export interface OrderingHeuristicDefinition {
  id?: string;
  priority?: number;
  weight?: number;
  orderKey?: OrderKey;
  functionType?: OrderingFunctionType;
  mechanicType?: MechanicType;
  withMechanic?: boolean;
  abilityType?: AbilityType;
  sortOrder?: SortBy;
}

export interface OrderingHeuristicParameter {
  paramId?: OrderingParameterId;
  paramValue?: number;
}

export interface PayCostsReq {
  manaCost: ManaRequirement[];
  paymentActions?: ActionsAvailableReq;
  paymentSelection?: SelectNReq;
  effectCostReq?: EffectCostReq;
  submitPaymentReq?: SubmitPaymentReq;
  autoTapActionsReq?: AutoTapActionsAvailableReq;
}

export interface PerformActionResp {
  actions: Action[];
  autoPassPriority?: AutoPassPriority;
  setYield?: SettingStatus;
  appliesTo?: SettingScope;
  mapTo?: SettingKey;
}

export interface PerformAutoTapActionsResp {
  index?: number;
}

export interface PlayerConfig {
  systemSeatId?: number;
  deckCards: number[];
  sideboardCards: number[];
  startingLifeTotal?: number;
  startingHandSizeSpecified?: boolean;
  startingHandSize?: number;
  commandEmblems: number[];
  jazzMusicians: number[];
  skins: CardSkinTuple[];
  shuffleRestriction?: ShuffleRestriction;
  playerConfigFieldThirteen?: number;
}

export interface PlayerDieRoll {
  systemSeatId?: number;
  rollValue?: number;
}

export interface PlayerInfo {
  lifeTotal?: number;
  systemSeatNumber?: number;
  manaPool: ManaInfo[];
  maxHandSize?: number;
  mulliganCount?: number;
  turnNumber?: number;
  teamId?: number;
  timerIds: number[];
  controllerSeatId?: number;
  controllerType?: ControllerType;
  timeoutCount?: number;
  pipCount?: number;
  pendingMessageType?: ClientMessageType;
  startingLifeTotal?: number;
}

export interface PlayerMetricKeyValuePair {
  key?: string;
  value?: number;
}

export interface PlayerMetrics {
  playerId?: number;
  metrics: KeyValuePairInfo[];
}

export interface Prompt {
  promptId?: number;
  parameters: PromptParameter[];
}

export interface PromptParameter {
  parameterName?: string;
  type?: ParameterType;
  reference?: Reference;
  stringValue?: string;
  numberValue?: number;
  repeatedNumbers: number[];
  promptId?: number;
}

export interface QueueInfo {
  eventId?: string;
  queueType?: QueueType;
  queueServiceBaseUri?: string;
  queueServiceErrorCallbackUri?: string;
  queueServiceOutputCallbackUri?: string;
  minimumPlayerCount?: number;
  playerBatchSize?: number;
  triggerCadenceMs?: number;
  createdTimestamp?: number;
  updatedTimestamp?: number;
}

export interface Reference {
  type?: ReferenceType;
  id?: number;
  field?: string;
  debugValue?: string;
}

export interface ReplacementEffect {
  objectInstance?: number;
  uniqueAbilityId?: number;
  abilityGrpId?: number;
  affectedObject?: number;
  replacementEffectId?: number;
}

export interface ReportResultMessage {
  result?: ResultSpec;
}

export interface ResultSpec {
  scope?: MatchScope;
  result?: ResultType;
  winningTeamId?: number;
  reason?: ResultReason;
}

export interface SearchFromGroupsReq {
  optionIndex?: number;
  minFind?: number;
  maxFind?: number;
  zonesToSearch: number[];
  groups: Group[];
  groupingStyle?: GroupingStyle;
  sourceId?: number;
}

export interface SearchFromGroupsResp {
  optionIndex?: number;
  itemsFound: number[];
  groups: Group[];
}

export interface SearchReq {
  optionIndex?: number;
  minFind?: number;
  maxFind?: number;
  zonesToSearch: number[];
  itemsToSearch: number[];
  itemsSought: number[];
  sourceId?: number;
  additionalZones: number[];
}

export interface SearchResp {
  optionIndex?: number;
  itemsFound: number[];
  addZoneToSearchScope?: number;
}

export interface SelectCountersReq {
  minSel?: number;
  maxSel?: number;
  context?: SelectionContext;
  optionType?: OptionType;
  optionContext?: OptionContext;
  listType?: SelectionListType;
  counterPairs: CounterPair[];
  idx?: number;
  sourceId?: number;
}

export interface SelectCountersResp {
  idx?: number;
  context?: SelectionContext;
  optionContext?: OptionContext;
  optionType?: OptionType;
  selections: CounterPair[];
}

export interface SelectFromGroupsReq {
  groups: Group[];
  idx?: number;
  minTotalSel?: number;
  maxTotalSel?: number;
  groupingStyle?: GroupingStyle;
  unfilteredIds: number[];
  sourceId?: number;
}

export interface SelectFromGroupsResp {
  idx?: number;
  ids: number[];
  groups: Group[];
}

export interface SelectManaTypeReq {
  index?: number;
  manaColors: ManaColor[];
  sourceId?: number;
}

export interface SelectManaTypeResp {
  index?: number;
  manaColors: ManaColor[];
  manaColor?: ManaColor;
}

export interface SelectNGroupReq {
  minSel?: number;
  maxSel?: number;
  groups: Group[];
  idx?: number;
  sourceId?: number;
}

export interface SelectNGroupResp {
  idx?: number;
  selectedgroupids: number[];
}

export interface SelectNReq {
  minSel?: number;
  maxSel?: number;
  context?: SelectionContext;
  optionType?: OptionType;
  optionContext?: OptionContext;
  listType?: SelectionListType;
  ids: number[];
  weights: number[];
  staticList?: StaticList;
  idx?: number;
  prompt?: Prompt;
  idType?: IdType;
  choicesAreRepeatable?: boolean;
  unfilteredIds: number[];
  sourceId?: number;
  hotIds: number[];
  validationType?: SelectionValidationType;
  zoneIds: number[];
}

export interface SelectNResp {
  idx?: number;
  context?: SelectionContext;
  optionContext?: OptionContext;
  optionType?: OptionType;
  ids: number[];
  useArbitrary?: OrderingType;
}

export interface SelectReplacementReq {
  replacements: ReplacementEffect[];
  isOptional?: boolean;
}

export interface SelectReplacementResp {
  replacement?: ReplacementEffect;
}

export interface SelectTargetsReq {
  targets: TargetSelection[];
  sourceId?: number;
  abilityGrpId?: number;
}

export interface SelectTargetsResp {
  target?: TargetSelection;
  action?: SelectAction;
}

export interface ServerToGREMessage {
  createRequest?: GRECreateRequest;
  configRequest?: GREConfigRequest;
  startMatchRequest?: GREStartMatchRequest;
  resumeMatchRequest?: GREResumeMatchRequest;
  checkpointRequest?: GRECheckpointRequest;
  forceResultRequest?: GREForceResultRequest;
  destroyRequest?: GREDestroyRequest;
  timerExpired?: GRETimerExpiredMessage;
  tick?: GRETickMessage;
  timeout?: GRETimeoutMessage;
  interpretRequest?: GREInterpretRequest;
  expireTimerRequest?: GREExpireTimerRequest;
  elapseTimeRequest?: GREElapseTimeRequest;
  startDelayedTimerMessage?: GREStartDelayedTimerMessage;
}

export interface ServiceFabricConfigPackageInfo {
  packageName?: string;
  packageVersion?: string;
}

export interface ServiceFabricServiceInfo {
  serviceName?: string;
  serviceTypeName?: string;
  replicaOrInstanceId?: number;
  partitionId?: string;
  nodeName?: string;
  codePackageVersion?: string;
  configPackages: ServiceFabricConfigPackageInfo[];
  exeAssemblyVersion?: string;
  gatewayUrl?: string;
}

export interface ServiceInfoRequest {}

export interface SetSettingsReq {
  settings?: SettingsMessage;
  turnNumber?: number;
}

export interface SetSettingsResp {
  settings?: SettingsMessage;
}

export interface SettingsConfig {
  seatId?: number;
  defaultSettings?: SettingsMessage;
  settingsFilePath?: string;
}

export interface SettingsMessage {
  stops: Stop[];
  yields: AutoYield[];
  answers: AutoAnswer[];
  autoPassOption?: AutoPassOption;
  graveyardOrder?: OrderingType;
  clearAllStops?: SettingStatus;
  clearAllYields?: SettingStatus;
  clearAllAnswers?: SettingStatus;
  manaSelectionType?: ManaSelectionType;
  defaultAutoPassOption?: AutoPassOption;
  smartStopsSetting?: SmartStopsSetting;
  autoTapStopsSetting?: AutoTapStopsSetting;
  autoOptionalPaymentCancellationSetting?: Setting;
  manaPaymentStrategyType?: ManaPaymentStrategyType;
  transientStops: Stop[];
  cosmetics: CosmeticInfo[];
  autoSelectReplacementSetting?: Setting;
  autoDeclareAttackersThatMustAttackSetting?: Setting;
}

export interface SortFilterPagingOptions {
  sort?: string;
  filter?: string;
  top?: number;
  skip?: number;
  continuationToken?: ContinuationToken;
}

export interface Stop {
  stopType?: StopType;
  appliesTo?: SettingScope;
  status?: SettingStatus;
}

export interface SubmitAttackersResp {
  result?: ResultCode;
}

export interface SubmitBlockersResp {
  result?: ResultCode;
}

export interface SubmitDeckReq {
  deck?: DeckMessage;
}

export interface SubmitDeckResp {
  deck?: DeckMessage;
}

export interface SubmitPaymentReq {}

export interface SubmitPaymentResp {}

export interface SubmitTargetsResp {
  result?: ResultCode;
}

export interface Target {
  targetInstanceId?: number;
  legalAction?: SelectAction;
  highlight?: number;
}

export interface TargetInfo {
  targetType?: TargetType;
  targetId?: number;
}

export interface TargetSelection {
  targetIdx?: number;
  targets: Target[];
  minTargets?: number;
  maxTargets?: number;
  selectedTargets?: number;
  prompt?: Prompt;
}

export interface TeamConfig {
  teamID?: number;
  players: PlayerConfig[];
}

export interface TeamInfo {
  id?: number;
  playerIds: number[];
}

export interface TestConfig {
  shuffleRestriction?: ShuffleRestriction;
  startingPlayer?: number;
  useSpecifiedSeed?: boolean;
  randomSeed?: number;
  useZeroManaCostForCasting?: boolean;
  useMaxLandsPerTurn?: number;
  treeOfCongress?: TreeOfCongress;
  disableGameStateQueueingDuringCancelableActions?: boolean;
  disableHiFiGameStates?: boolean;
  disableTimers?: boolean;
  randomSeeds: number[];
  freeMulliganCount?: number;
  randomDrawCount?: number;
  minRandomDrawDistance?: number;
  maxRandomDrawDistance?: number;
  enableAutoAcceptHand?: boolean;
  enableAutoPlay?: boolean;
  disableUnexpectedMessageRecovery?: boolean;
  disableSideboarding?: boolean;
  candidateShuffleCount?: number;
  bestCandidateShuffleCount?: number;
  autoRespondPermission?: AutoRespondPermission;
  disableDeferredActionCostPayment?: boolean;
  disableIndividualDamageAssignments?: boolean;
}

export interface TimeoutConfig {
  maxTimeoutCount?: number;
  startingTimeoutCount?: number;
  maxPipCount?: number;
  startingPipCount?: number;
  durationSec?: number;
}

export interface TimeoutMessage {
  seatId?: number;
  timeoutCount?: number;
  timer?: TimerInfo;
}

export interface TimerConfig {
  type?: TimerType;
  durationSec?: number;
  behavior?: TimerBehavior;
  controls: TimerControl[];
  warningThresholdSec?: number;
  maxDurationSec?: number;
}

export interface TimerControl {
  event?: TimerEvent;
  behavior?: TimerBehavior;
}

export interface TimerInfo {
  timerId?: number;
  type?: TimerType;
  durationSec?: number;
  elapsedSec?: number;
  running?: boolean;
  behavior?: TimerBehavior;
  warningThresholdSec?: number;
  elapsedMs?: number;
}

export interface TimerStateMessage {
  seatId?: number;
  timers: TimerInfo[];
}

export interface TreeOfCongress {
  systemSeatId: number[];
}

export interface TurnInfo {
  phase?: Phase;
  step?: Step;
  turnNumber?: number;
  activePlayer?: number;
  priorityPlayer?: number;
  decisionPlayer?: number;
  nextPhase?: Phase;
  nextStep?: Step;
}

export interface UIMessage {
  seatIds: number[];
  onSelect?: OnSelect;
  onHover?: OnHover;
  onShuffle?: OnShuffle;
  onChat?: OnChat;
  onGenericEvent?: OnGenericEvent;
}

export interface UInt32Value {
  value?: number;
}

export interface UserConnectionInfo {
  connectionState?: ConnectionState;
  lastConnectTimestamp?: number;
  lastDisconnectTimestamp?: number;
}

export interface UserOption {
  optionPrompt?: Prompt;
  responseType?: ClientMessageType;
}

export interface ValueHeuristicDefinition {
  id?: string;
  priority?: number;
  weight?: number;
}

export interface ValueHeuristicParameter {
  id?: string;
  paramValue?: number;
}

export interface ZoneInfo {
  zoneId?: number;
  type?: ZoneType;
  visibility?: Visibility;
  ownerSeatId?: number;
  objectInstanceIds: number[];
  viewers: number[];
}

export enum EnumAIConfigOption {
  AIConfigOption_None = 0,
  AIConfigOption_Inactive = 1,
  AIConfigOption_Active = 2,
}

export type AIConfigOption = keyof typeof EnumAIConfigOption;

export enum EnumAIConfigYesNo {
  AIConfigYesNo_None = 0,
  AIConfigYesNo_No = 1,
  AIConfigYesNo_Yes = 2,
}

export type AIConfigYesNo = keyof typeof EnumAIConfigYesNo;

export enum EnumAIMode {
  AIMode_None = 0,
  AIMode_Goldfish = 1,
  AIMode_Gameplay = 2,
  AIMode_Random = 3,
}

export type AIMode = keyof typeof EnumAIMode;

export enum EnumAbilityType {
  AbilityType_None = 0,
  AbilityType_Deathtouch = 1,
  AbilityType_Defender = 2,
  AbilityType_DoubleStrike = 3,
  AbilityType_Enchant = 4,
  AbilityType_Equip = 5,
  AbilityType_FirstStrike = 6,
  AbilityType_Flash = 7,
  AbilityType_Flying = 8,
  AbilityType_Haste = 9,
  AbilityType_Hexproof = 10,
  AbilityType_Intimidate = 11,
  AbilityType_Lifelink = 12,
  AbilityType_Reach = 13,
  AbilityType_Trample = 14,
  AbilityType_Vigilance = 15,
  AbilityType_Landwalk = 16,
  AbilityType_ProtectionFrom = 21,
  AbilityType_Shroud = 22,
  AbilityType_Banding = 23,
  AbilityType_Rampage = 24,
  AbilityType_CumulativeUpkeep = 25,
  AbilityType_Flanking = 26,
  AbilityType_Phasing = 27,
  AbilityType_Buyback = 28,
  AbilityType_Shadow = 29,
  AbilityType_Cycling = 30,
  AbilityType_Echo = 31,
  AbilityType_Horsemanship = 32,
  AbilityType_Fading = 33,
  AbilityType_Kicker = 34,
  AbilityType_Flashback = 35,
  AbilityType_Madness = 36,
  AbilityType_Morph = 37,
  AbilityType_Fear = 38,
  AbilityType_Amplify = 39,
  AbilityType_Provoke = 40,
  AbilityType_Storm = 41,
  AbilityType_AffinityFor = 42,
  AbilityType_Entwine = 43,
  AbilityType_Modular = 44,
  AbilityType_Sunburst = 45,
  AbilityType_Bushido = 46,
  AbilityType_Soulshift = 47,
  AbilityType_Splice = 48,
  AbilityType_Offering = 49,
  AbilityType_Ninjitsu = 50,
  AbilityType_Epic = 51,
  AbilityType_Convoke = 52,
  AbilityType_Dredge = 53,
  AbilityType_Transmute = 54,
  AbilityType_Bloodthirst = 55,
  AbilityType_Haunt = 56,
  AbilityType_Replicate = 57,
  AbilityType_Forecast = 58,
  AbilityType_Graft = 59,
  AbilityType_Recover = 60,
  AbilityType_Ripple = 61,
  AbilityType_SplitSecond = 62,
  AbilityType_Suspend = 63,
  AbilityType_Vanishing = 64,
  AbilityType_Absorb = 65,
  AbilityType_AuraSwap = 66,
  AbilityType_Delve = 67,
  AbilityType_Fortify = 68,
  AbilityType_Frenzy = 69,
  AbilityType_Gravestorm = 70,
  AbilityType_Poisonous = 71,
  AbilityType_Transfigure = 72,
  AbilityType_Champion = 73,
  AbilityType_Changeling = 74,
  AbilityType_Evoke = 75,
  AbilityType_Hideaway = 76,
  AbilityType_Prowl = 77,
  AbilityType_Reinforce = 78,
  AbilityType_Conspire = 79,
  AbilityType_Persist = 80,
  AbilityType_Wither = 81,
  AbilityType_Retrace = 82,
  AbilityType_Devour = 83,
  AbilityType_Exalted = 84,
  AbilityType_Unearth = 85,
  AbilityType_Cascade = 86,
  AbilityType_Annihilator = 87,
  AbilityType_LevelUp = 88,
  AbilityType_Rebound = 89,
  AbilityType_TotemArmor = 90,
  AbilityType_Infect = 91,
  AbilityType_BattleCry = 92,
  AbilityType_LivingWeapon = 93,
  AbilityType_Undying = 94,
  AbilityType_Miracle = 95,
  AbilityType_Soulbond = 96,
  AbilityType_Overload = 97,
  AbilityType_Scavenge = 98,
  AbilityType_Unleash = 99,
  AbilityType_Cipher = 100,
  AbilityType_Evolve = 101,
  AbilityType_Extort = 102,
  AbilityType_Fuse = 103,
  AbilityType_Indestructible = 104,
  AbilityType_Regenerate = 105,
  AbilityType_EnterZone_Tapped = 106,
  AbilityType_EnterZone_Controlled = 107,
  AbilityType_EnterZone_Attached = 108,
  AbilityType_Level = 109,
  AbilityType_EnterZone_WithCounters = 110,
  AbilityType_TurnFaceUp_WithCounters = 111,
  AbilityType_PlaneswalkerLoyaltyReplacement = 114,
  AbilityType_CastCommanderFromCommandZone = 115,
  AbilityType_CommanderZoneTransferReplacement = 116,
  AbilityType_Multikicker = 122,
  AbilityType_BasicLandcycling = 123,
  AbilityType_Forestcycling = 124,
  AbilityType_Islandcycling = 125,
  AbilityType_Mountaincycling = 126,
  AbilityType_Plainscycling = 127,
  AbilityType_Slivercycling = 128,
  AbilityType_Swampcycling = 129,
  AbilityType_Wizardcycling = 130,
  AbilityType_Monstrosity = 134,
  AbilityType_Tribute = 135,
  AbilityType_Outlast = 136,
  AbilityType_Prowess = 137,
  AbilityType_Bolster = 138,
  AbilityType_PlaneswalkerDamageRedirection = 139,
  AbilityType_OrderObjectsEnteringGraveyard = 140,
  AbilityType_OrderObjectsEnteringLibrary = 141,
  AbilityType_Menace = 142,
  AbilityType_Skulk = 143,
  AbilityType_Ingest = 144,
  AbilityType_Manifest = 145,
  AbilityType_Emerge = 147,
  AbilityType_Deliverance = 148,
  AbilityType_CastWithoutPayingManaCost = 149,
  AbilityType_Megamorph = 150,
  AbilityType_Devoid = 151,
  AbilityType_SacrificeClue = 152,
  AbilityType_Escalate = 153,
  AbilityType_Fabricate = 154,
  AbilityType_Crew = 156,
  AbilityType_Improvise = 157,
  AbilityType_ChooseZoneForMutuallyExclusiveZoneTransfers = 158,
  AbilityType_Aftermath = 159,
  AbilityType_Embalm = 160,
  AbilityType_TapForImprovise = 161,
  AbilityType_Exert = 162,
  AbilityType_Eternalize = 163,
  AbilityType_Afflict = 164,
  AbilityType_Ascend = 165,
  AbilityType_SagaChapter = 166,
  AbilityType_SagaLoreReplacement = 167,
  AbilityType_SagaLoreTurn = 168,
  AbilityType_Surveil = 169,
  AbilityType_Jumpstart = 170,
  AbilityType_Mentor = 171,
  AbilityType_TapForConvoke = 172,
  AbilityType_Afterlife = 173,
  AbilityType_Spectacle = 174,
  AbilityType_Riot = 175,
  AbilityType_Adapt = 176,
  AbilityType_AffinityForArtifacts = 177,
  AbilityType_Scry1 = 178,
  AbilityType_Scry2 = 179,
  AbilityType_Scry3 = 180,
  AbilityType_Scry4 = 181,
  AbilityType_ScryX = 182,
  AbilityType_SacrificeTreasure = 183,
  AbilityType_ProtectionFromChosenColor = 184,
  AbilityType_ProtectionFromW = 185,
  AbilityType_ProtectionFromU = 186,
  AbilityType_ProtectionFromB = 187,
  AbilityType_ProtectionFromR = 188,
  AbilityType_ProtectionFromG = 189,
  AbilityType_HexproofFromChosen = 190,
  AbilityType_HexproofFromW = 191,
  AbilityType_HexproofFromU = 192,
  AbilityType_HexproofFromB = 193,
  AbilityType_HexproofFromR = 194,
  AbilityType_HexproofFromG = 195,
  AbilityType_Adventure = 196,
  AbilityType_SacrificeFood = 197,
  AbilityType_SacrificeGold = 198,
  AbilityType_Escape = 199,
  AbilityType_Fight = 200,
  AbilityType_UntapOptional = 201,
  AbilityType_Companion = 202,
  AbilityType_Mutate = 203,
  AbilityType_ProtectionFromDogs = 204,
  AbilityType_Mill = 205,
  AbilityType_ProtectionFromChosenName = 206,
  AbilityType_Placeholder1 = 207,
  AbilityType_Placeholder2 = 208,
  AbilityType_Placeholder3 = 209,
  AbilityType_Placeholder4 = 210,
  AbilityType_Placeholder5 = 211,
  AbilityType_GildCards_Test = 988,
  AbilityType_Twiddle_Test = 989,
  AbilityType_Donate_Test = 990,
  AbilityType_Bounce_Test = 991,
  AbilityType_DrawCard_Test = 992,
  AbilityType_AddCost_Test = 993,
  AbilityType_DeployBears_Test = 994,
  AbilityType_EndTurn_Test = 995,
  AbilityType_Wish_Test = 996,
  AbilityType_PutLibrary_Test = 997,
  AbilityType_GainHaste_Test = 998,
  AbilityType_AddWUBRG_Test = 999,
  AbilityType_IntrinsicMana_W = 1001,
  AbilityType_IntrinsicMana_U = 1002,
  AbilityType_IntrinsicMana_B = 1003,
  AbilityType_IntrinsicMana_R = 1004,
  AbilityType_IntrinsicMana_G = 1005,
  AbilityType_AutoGen = 1006,
}

export type AbilityType = keyof typeof EnumAbilityType;

export enum EnumActionType {
  ActionType_None = 0,
  ActionType_Cast = 1,
  ActionType_Activate = 2,
  ActionType_Play = 3,
  ActionType_Activate_Mana = 4,
  ActionType_Pass = 5,
  ActionType_Activate_Test = 6,
  ActionType_Special = 7,
  ActionType_Special_TurnFaceUp = 8,
  ActionType_ResolutionCost = 9,
  ActionType_CastLeft = 10,
  ActionType_CastRight = 11,
  ActionType_Make_Payment = 12,
  ActionType_CastingTimeOption = 13,
  ActionType_CombatCost = 14,
  ActionType_OpeningHandAction = 15,
  ActionType_CastAdventure = 16,
  ActionType_FloatMana = 17,
  ActionType_Placeholder1 = 18,
  ActionType_Placeholder2 = 19,
  ActionType_Placeholder3 = 20,
  ActionType_Placeholder4 = 21,
  ActionType_Placeholder5 = 22,
}

export type ActionType = keyof typeof EnumActionType;

export enum EnumAllowCancel {
  AllowCancel_None = 0,
  AllowCancel_Continue = 1,
  AllowCancel_Abort = 2,
  AllowCancel_No = 3,
}

export type AllowCancel = keyof typeof EnumAllowCancel;

export enum EnumAnnotationType {
  AnnotationType_None = 0,
  AnnotationType_ZoneTransfer = 1,
  AnnotationType_LossOfGame = 2,
  AnnotationType_DamageDealt = 3,
  AnnotationType_TappedUntappedPermanent = 4,
  AnnotationType_ModifiedPower = 5,
  AnnotationType_ModifiedToughness = 6,
  AnnotationType_ModifiedColor = 7,
  AnnotationType_PhaseOrStepModified = 8,
  AnnotationType_AddAbility = 9,
  AnnotationType_ModifiedLife = 10,
  AnnotationType_CreateAttachment = 11,
  AnnotationType_RemoveAttachment = 12,
  AnnotationType_ObjectIdChanged = 13,
  AnnotationType_Counter = 14,
  AnnotationType_ControllerChanged = 15,
  AnnotationType_CounterAdded = 16,
  AnnotationType_CounterRemoved = 17,
  AnnotationType_LayeredEffectCreated = 18,
  AnnotationType_LayeredEffectDestroyed = 19,
  AnnotationType_Attachment = 20,
  AnnotationType_Haunt = 21,
  AnnotationType_CopiedObject = 22,
  AnnotationType_RemoveAbility = 23,
  AnnotationType_WinTheGame = 24,
  AnnotationType_ModifiedType = 25,
  AnnotationType_TargetSpec = 26,
  AnnotationType_TextChange = 27,
  AnnotationType_FaceDown = 28,
  AnnotationType_TurnPermanent = 29,
  AnnotationType_DynamicAbility = 30,
  AnnotationType_ObjectsSelected = 31,
  AnnotationType_TriggeringObject = 32,
  AnnotationType_DamageSource = 33,
  AnnotationType_ManaPaid = 34,
  AnnotationType_TokenCreated = 35,
  AnnotationType_AbilityInstanceCreated = 36,
  AnnotationType_AbilityInstanceDeleted = 37,
  AnnotationType_DisplayCardUnderCard = 38,
  AnnotationType_AbilityWordActive = 39,
  AnnotationType_LinkInfo = 40,
  AnnotationType_TokenDeleted = 41,
  AnnotationType_Qualification = 42,
  AnnotationType_ResolutionStart = 43,
  AnnotationType_ResolutionComplete = 44,
  AnnotationType_Designation = 45,
  AnnotationType_GainDesignation = 46,
  AnnotationType_CardRevealed = 47,
  AnnotationType_NewTurnStarted = 48,
  AnnotationType_ManaDetails = 49,
  AnnotationType_DisqualifiedEffect = 50,
  AnnotationType_LayeredEffect = 51,
  AnnotationType_MiscContinuousEffect = 52,
  AnnotationType_ShouldntPlay = 53,
  AnnotationType_UseOrCostsManaCost = 54,
  AnnotationType_RemainingSelections = 55,
  AnnotationType_Shuffle = 56,
  AnnotationType_CoinFlip = 57,
  AnnotationType_ChoiceResult = 58,
  AnnotationType_RevealedCardCreated = 59,
  AnnotationType_RevealedCardDeleted = 60,
  AnnotationType_SuspendLike = 61,
  AnnotationType_ReplacementEffect = 62,
  AnnotationType_EnteredZoneThisTurn = 63,
  AnnotationType_CastingTimeOption = 64,
  AnnotationType_Scry = 65,
  AnnotationType_PredictedDirectDamage = 66,
  AnnotationType_SwitchPowerToughness = 67,
  AnnotationType_SupplementalText = 68,
  AnnotationType_PendingEffect = 69,
  AnnotationType_AttachmentCreated = 70,
  AnnotationType_PowerToughnessModCreated = 71,
  AnnotationType_SyntheticEvent = 72,
  AnnotationType_UserActionTaken = 73,
  AnnotationType_DelayedTriggerAffectees = 74,
  AnnotationType_InstanceRevealedToOpponent = 75,
  AnnotationType_ModifiedName = 76,
  AnnotationType_ReplacementEffectApplied = 77,
  AnnotationType_ReferencedObjects = 78,
  AnnotationType_ChoosingAttachments = 79,
  AnnotationType_TemporaryPermanent = 80,
  AnnotationType_GamewideHistoryCount = 81,
}

export type AnnotationType = keyof typeof EnumAnnotationType;

export enum EnumAnswer {
  Answer_None = 0,
  Answer_Yes = 1,
  Answer_No = 2,
}

export type Answer = keyof typeof EnumAnswer;

export enum EnumAttackState {
  AttackState_None = 0,
  AttackState_Declared = 1,
  AttackState_Attacking = 2,
}

export type AttackState = keyof typeof EnumAttackState;

export enum EnumAttackWarningType {
  AttackWarningType_None = 0,
  AttackWarningType_MustAttackWithAtLeastOne = 1,
  AttackWarningType_CannotAttackAlone = 2,
  AttackWarningType_MustAttack = 3,
}

export type AttackWarningType = keyof typeof EnumAttackWarningType;

export enum EnumAuthenticationType {
  AuthenticationType_Invalid = 0,
  AuthenticationType_Service = 2,
}

export type AuthenticationType = keyof typeof EnumAuthenticationType;

export enum EnumAutoPassOption {
  AutoPassOption_None = 0,
  AutoPassOption_Turn = 1,
  AutoPassOption_UnlessAction = 2,
  AutoPassOption_EndStep = 3,
  AutoPassOption_Clear = 4,
  AutoPassOption_UnlessOpponentAction = 5,
  AutoPassOption_ResolveMyStackEffects = 6,
  AutoPassOption_FullControl = 7,
  AutoPassOption_ArenaDefault = 8,
}

export type AutoPassOption = keyof typeof EnumAutoPassOption;

export enum EnumAutoPassPriority {
  AutoPassPriority_None = 0,
  AutoPassPriority_No = 1,
  AutoPassPriority_Yes = 2,
}

export type AutoPassPriority = keyof typeof EnumAutoPassPriority;

export enum EnumAutoTapStopsSetting {
  AutoTapStopsSetting_None = 0,
  AutoTapStopsSetting_Enable = 1,
  AutoTapStopsSetting_Disable = 2,
}

export type AutoTapStopsSetting = keyof typeof EnumAutoTapStopsSetting;

export enum EnumBlockState {
  BlockState_None = 0,
  BlockState_Declared = 1,
  BlockState_Blocking = 2,
  BlockState_Blocked = 3,
  BlockState_Unblocked = 4,
}

export type BlockState = keyof typeof EnumBlockState;

export enum EnumBlockWarningType {
  BlockWarningType_None = 0,
  BlockWarningType_InsufficientBlockers = 1,
  BlockWarningType_CannotBlockAlone = 2,
  BlockWarningType_MustBeBlocked = 3,
  BlockWarningType_MustBlock = 4,
  BlockWarningType_MustBeBlockedByAll = 5,
}

export type BlockWarningType = keyof typeof EnumBlockWarningType;

export enum EnumCardColor {
  CardColor_Colorless = 0,
  CardColor_White = 1,
  CardColor_Blue = 2,
  CardColor_Black = 3,
  CardColor_Red = 4,
  CardColor_Green = 5,
  CardColor_Land = 6,
  CardColor_Artifact = 7,
}

export type CardColor = keyof typeof EnumCardColor;

export enum EnumCardMechanicType {
  CardMechanicType_None = 0,
  CardMechanicType_AddAbility = 2,
  CardMechanicType_AddAttachment = 3,
  CardMechanicType_DealDamage = 4,
  CardMechanicType_DestroyPermanent = 5,
  CardMechanicType_Discard = 6,
  CardMechanicType_DrawCard = 7,
  CardMechanicType_LossOfGame = 8,
  CardMechanicType_SetColor = 9,
  CardMechanicType_ModifyLife = 10,
  CardMechanicType_ModifyPower = 11,
  CardMechanicType_ModifyToughness = 12,
  CardMechanicType_PhaseOrStepTransition = 13,
  CardMechanicType_PutCounterOnObject = 14,
  CardMechanicType_CreateToken = 15,
  CardMechanicType_RemoveCounterFromObject = 16,
  CardMechanicType_ResolveAbility = 17,
  CardMechanicType_Reveal = 18,
  CardMechanicType_TapPermanent = 19,
  CardMechanicType_UntapPermanent = 21,
  CardMechanicType_ZoneTransfer = 22,
  CardMechanicType_RegeneratePermanent = 23,
  CardMechanicType_SacrificePermanent = 24,
  CardMechanicType_SetController = 25,
  CardMechanicType_DeclaredAttacker = 26,
  CardMechanicType_DeclaredBlocker = 27,
  CardMechanicType_BecomeTarget = 28,
  CardMechanicType_AddToManaPool = 29,
  CardMechanicType_EnterZone = 30,
  CardMechanicType_ShuffleLibrary = 31,
  CardMechanicType_CounterObjectOnStack = 32,
  CardMechanicType_ExileGameObject = 33,
  CardMechanicType_DamageDealt = 34,
  CardMechanicType_PhaseInPermanent = 35,
  CardMechanicType_PhaseOutPermanent = 36,
  CardMechanicType_AttackerBlocked = 37,
  CardMechanicType_AttackersSubmitted = 38,
  CardMechanicType_BlockersDetermined = 39,
  CardMechanicType_SetPower = 40,
  CardMechanicType_SetToughness = 41,
  CardMechanicType_BeginTurn = 42,
  CardMechanicType_TurnFaceUp = 43,
  CardMechanicType_Transform = 44,
  CardMechanicType_Dredge = 45,
  CardMechanicType_Explore = 46,
  CardMechanicType_Provoke = 47,
  CardMechanicType_Riot = 48,
  CardMechanicType_Mutate = 49,
  CardMechanicType_GraveyardExile = 50,
  CardMechanicType_Placeholder1 = 51,
  CardMechanicType_Placeholder2 = 52,
  CardMechanicType_Placeholder3 = 53,
  CardMechanicType_Placeholder4 = 54,
  CardMechanicType_Placeholder5 = 55,
}

export type CardMechanicType = keyof typeof EnumCardMechanicType;

export enum EnumCardType {
  CardType_None = 0,
  CardType_Artifact = 1,
  CardType_Creature = 2,
  CardType_Enchantment = 3,
  CardType_Instant = 4,
  CardType_Land = 5,
  CardType_Phenomenon = 6,
  CardType_Plane = 7,
  CardType_Planeswalker = 8,
  CardType_Scheme = 9,
  CardType_Sorcery = 10,
  CardType_Tribal = 11,
  CardType_Vanguard = 12,
}

export type CardType = keyof typeof EnumCardType;

export enum EnumCastingTimeOptionType {
  CastingTimeOptionType_None = 0,
  CastingTimeOptionType_Done = 1,
  CastingTimeOptionType_ChooseX = 2,
  CastingTimeOptionType_Kicker = 3,
  CastingTimeOptionType_Multikicker = 4,
  CastingTimeOptionType_AdditionalCost = 5,
  CastingTimeOptionType_OptionalCost = 6,
  CastingTimeOptionType_Replicate = 7,
  CastingTimeOptionType_Conspire = 8,
  CastingTimeOptionType_ManaType = 9,
  CastingTimeOptionType_Modal = 10,
  CastingTimeOptionType_ChooseOrCost = 11,
  CastingTimeOptionType_Selection = 12,
  CastingTimeOptionType_CastThroughAbility = 13,
}

export type CastingTimeOptionType = keyof typeof EnumCastingTimeOptionType;

export enum EnumChoicePersistence {
  ChoicePersistence_None = 0,
  ChoicePersistence_ChooseOnce = 1,
  ChoicePersistence_ChooseAlways = 2,
}

export type ChoicePersistence = keyof typeof EnumChoicePersistence;

export enum EnumClientMessageType {
  ClientMessageType_None = 0,
  ClientMessageType_ConnectReq = 1,
  ClientMessageType_CancelActionReq = 5,
  ClientMessageType_ChooseModalResp = 6,
  ClientMessageType_ConcedeReq = 7,
  ClientMessageType_EnterSideboardingReq = 8,
  ClientMessageType_ForceDrawReq = 9,
  ClientMessageType_GetSettingsReq = 11,
  ClientMessageType_GroupResp = 12,
  ClientMessageType_MulliganResp = 13,
  ClientMessageType_OrderResp = 14,
  ClientMessageType_PerformActionResp = 15,
  ClientMessageType_ControlReq = 17,
  ClientMessageType_SelectNResp = 18,
  ClientMessageType_SetSettingsReq = 20,
  ClientMessageType_UndoReq = 22,
  ClientMessageType_ChooseStartingPlayerResp = 24,
  ClientMessageType_OptionalActionResp = 25,
  ClientMessageType_AllowForceDrawResp = 26,
  ClientMessageType_RevealHandResp = 28,
  ClientMessageType_DeclareAttackersResp = 30,
  ClientMessageType_SubmitAttackersReq = 31,
  ClientMessageType_DeclareBlockersResp = 32,
  ClientMessageType_SubmitBlockersReq = 33,
  ClientMessageType_OrderCombatDamageResp = 34,
  ClientMessageType_AssignDamageResp = 35,
  ClientMessageType_SelectTargetsResp = 36,
  ClientMessageType_SubmitTargetsReq = 37,
  ClientMessageType_DrawCardResp = 38,
  ClientMessageType_SelectReplacementResp = 39,
  ClientMessageType_SelectNGroupResp = 40,
  ClientMessageType_DistributionResp = 42,
  ClientMessageType_NumericInputResp = 43,
  ClientMessageType_SearchResp = 44,
  ClientMessageType_EffectCostResp = 45,
  ClientMessageType_CastingTimeOptionsResp = 46,
  ClientMessageType_SelectManaTypeResp = 47,
  ClientMessageType_SelectFromGroupsResp = 48,
  ClientMessageType_SearchFromGroupsResp = 49,
  ClientMessageType_GatherResp = 50,
  ClientMessageType_SubmitPaymentResp = 51,
  ClientMessageType_AutoResp = 52,
  ClientMessageType_UIMessage = 53,
  ClientMessageType_SubmitDeckResp = 54,
  ClientMessageType_TakeTimeoutReq = 55,
  ClientMessageType_PerformAutoTapActionsResp = 56,
}

export type ClientMessageType = keyof typeof EnumClientMessageType;

export enum EnumClientToMatchServiceMessageType {
  ClientToMatchServiceMessageType_None = 0,
  ClientToMatchServiceMessageType_ClientToMatchDoorConnectRequest = 1,
  ClientToMatchServiceMessageType_ClientToGREMessage = 2,
  ClientToMatchServiceMessageType_ClientToGREUIMessage = 3,
  ClientToMatchServiceMessageType_AuthenticateRequest = 4,
  ClientToMatchServiceMessageType_CreateMatchGameRoomRequest = 5,
  ClientToMatchServiceMessageType_EchoRequest = 8,
}

export type ClientToMatchServiceMessageType = keyof typeof EnumClientToMatchServiceMessageType;

export enum EnumClientType {
  ClientType_Invalid = 0,
  ClientType_User = 1,
  ClientType_Service = 2,
  ClientType_Familiar = 3,
}

export type ClientType = keyof typeof EnumClientType;

export enum EnumConnectionState {
  ConnectionState_Invalid = 0,
  ConnectionState_Open = 1,
  ConnectionState_Closed = 2,
  ConnectionState_Connecting = 3,
  ConnectionState_Closing = 4,
}

export type ConnectionState = keyof typeof EnumConnectionState;

export enum EnumConnectionStateChangedEventType {
  ConnectionStateChangedEventType_Invalid = 0,
  ConnectionStateChangedEventType_Connected = 1,
  ConnectionStateChangedEventType_Disconnected = 2,
}

export type ConnectionStateChangedEventType = keyof typeof EnumConnectionStateChangedEventType;

export enum EnumConnectionStatus {
  ConnectionStatus_None = 0,
  ConnectionStatus_Success = 1,
  ConnectionStatus_GRPVersionIncompat = 2,
  ConnectionStatus_ProtoVersionIncompat = 3,
}

export type ConnectionStatus = keyof typeof EnumConnectionStatus;

export enum EnumConstructedMatchType {
  Precon = 0,
  Unranked = 1,
  Ranked = 2,
}

export type ConstructedMatchType = keyof typeof EnumConstructedMatchType;

export enum EnumControllerType {
  ControllerType_None = 0,
  ControllerType_Player = 1,
  ControllerType_AI = 2,
  ControllerType_AI_Goldfish = 3,
  ControllerType_AI_PetRock = 4,
}

export type ControllerType = keyof typeof EnumControllerType;

export enum EnumCostCategory {
  CostCategory_None = 0,
  CostCategory_Automatic = 1,
  CostCategory_Confirmation = 2,
  CostCategory_Manual = 3,
}

export type CostCategory = keyof typeof EnumCostCategory;

export enum EnumCounterType {
  CounterType_None = 0,
  CounterType_P1P1 = 1,
  CounterType_M1M1 = 2,
  CounterType_Poison = 3,
  CounterType_Wind = 4,
  CounterType_Time = 5,
  CounterType_Fade = 6,
  CounterType_Loyalty = 7,
  CounterType_Wish = 8,
  CounterType_Age = 9,
  CounterType_Aim = 10,
  CounterType_Arrow = 11,
  CounterType_Arrowhead = 12,
  CounterType_Awakening = 13,
  CounterType_Blaze = 14,
  CounterType_Blood = 15,
  CounterType_Bounty = 16,
  CounterType_Bribery = 17,
  CounterType_Carrion = 18,
  CounterType_Charge = 19,
  CounterType_Control = 20,
  CounterType_Corpse = 21,
  CounterType_Credit = 22,
  CounterType_Cube = 23,
  CounterType_Currency = 24,
  CounterType_Death = 25,
  CounterType_Delay = 26,
  CounterType_Depletion = 27,
  CounterType_Despair = 28,
  CounterType_Devotion = 29,
  CounterType_Divinity = 30,
  CounterType_Doom = 31,
  CounterType_Dream = 32,
  CounterType_Echo = 33,
  CounterType_Elixir = 34,
  CounterType_Energy = 35,
  CounterType_Eon = 36,
  CounterType_Eyeball = 37,
  CounterType_Fate = 38,
  CounterType_Feather = 39,
  CounterType_Filibuster = 40,
  CounterType_Flame = 41,
  CounterType_Flood = 42,
  CounterType_Fungus = 43,
  CounterType_Fuse = 44,
  CounterType_Glyph = 45,
  CounterType_Gold = 46,
  CounterType_Growth = 47,
  CounterType_Hatchling = 48,
  CounterType_Healing = 49,
  CounterType_Hoofprint = 50,
  CounterType_Hourglass = 51,
  CounterType_Hunger = 52,
  CounterType_Ice = 53,
  CounterType_Infection = 54,
  CounterType_Intervention = 55,
  CounterType_Javelin = 56,
  CounterType_Ki = 57,
  CounterType_Level = 58,
  CounterType_Luck = 59,
  CounterType_Magnet = 60,
  CounterType_Mannequin = 61,
  CounterType_Matrix = 62,
  CounterType_May = 63,
  CounterType_Mine = 64,
  CounterType_Mining = 65,
  CounterType_Mire = 66,
  CounterType_Muster = 67,
  CounterType_Net = 68,
  CounterType_Omen = 69,
  CounterType_Ore = 70,
  CounterType_Page = 71,
  CounterType_Pain = 72,
  CounterType_Paralyzation = 73,
  CounterType_Petal = 74,
  CounterType_Petrification = 75,
  CounterType_Phylactery = 76,
  CounterType_Pin = 77,
  CounterType_Plague = 78,
  CounterType_Polyp = 79,
  CounterType_Pressure = 80,
  CounterType_Pupa = 81,
  CounterType_Quest = 82,
  CounterType_Scream = 83,
  CounterType_Scroll = 84,
  CounterType_Shell = 85,
  CounterType_Shield = 86,
  CounterType_Shred = 87,
  CounterType_Sleep = 88,
  CounterType_Sleight = 89,
  CounterType_Slime = 90,
  CounterType_Soot = 91,
  CounterType_Spell = 92,
  CounterType_Spore = 93,
  CounterType_Storage = 94,
  CounterType_Strife = 95,
  CounterType_Study = 96,
  CounterType_Theft = 97,
  CounterType_Tide = 98,
  CounterType_Tower = 100,
  CounterType_Training = 101,
  CounterType_Trap = 102,
  CounterType_Treasure = 103,
  CounterType_Verse = 104,
  CounterType_Vitality = 105,
  CounterType_Wage = 106,
  CounterType_Winch = 107,
  CounterType_Lore = 108,
  CounterType_P1P2 = 109,
  CounterType_P0P1 = 110,
  CounterType_P0P2 = 111,
  CounterType_P1P0 = 112,
  CounterType_P2P2 = 113,
  CounterType_M0M1 = 114,
  CounterType_M0M2 = 115,
  CounterType_M1M0 = 116,
  CounterType_M2M1 = 117,
  CounterType_M2M2 = 118,
  CounterType_Manifestation = 119,
  CounterType_Gem = 120,
  CounterType_Crystal = 121,
  CounterType_Isolation = 122,
  CounterType_Hour = 123,
  CounterType_Unity = 124,
  CounterType_Velocity = 125,
  CounterType_Brick = 126,
  CounterType_Landmark = 127,
  CounterType_Prey = 128,
  CounterType_Silver = 129,
  CounterType_Egg = 130,
  CounterType_Hit = 131,
  CounterType_Knowledge = 132,
  CounterType_Task = 133,
  CounterType_Coin = 134,
  CounterType_Deathtouch = 135,
  CounterType_FirstStrike = 136,
  CounterType_Flying = 137,
  CounterType_Hexproof = 138,
  CounterType_Lifelink = 139,
  CounterType_Menace = 140,
  CounterType_Reach = 141,
  CounterType_Trample = 142,
  CounterType_Vigilance = 143,
  CounterType_Foreshadow = 144,
  CounterType_Incarnation = 145,
  CounterType_Soul = 146,
  CounterType_PlaceholderCounterType15 = 147,
  CounterType_PlaceholderCounterType1 = 148,
  CounterType_PlaceholderCounterType2 = 149,
  CounterType_PlaceholderCounterType3 = 150,
  CounterType_PlaceholderCounterType4 = 151,
  CounterType_PlaceholderCounterType5 = 152,
  CounterType_PlaceholderCounterType6 = 153,
  CounterType_PlaceholderCounterType7 = 154,
  CounterType_PlaceholderCounterType8 = 155,
  CounterType_PlaceholderCounterType9 = 156,
  CounterType_PlaceholderCounterType10 = 157,
  CounterType_PlaceholderCounterType11 = 158,
  CounterType_PlaceholderCounterType12 = 159,
}

export type CounterType = keyof typeof EnumCounterType;

export enum EnumDamageRecType {
  DamageRecType_None = 0,
  DamageRecType_Team = 1,
  DamageRecType_Player = 2,
  DamageRecType_PlanesWalker = 3,
}

export type DamageRecType = keyof typeof EnumDamageRecType;

export enum EnumDropMatchmakingResponseCode {
  DropUnknownError = 0,
  DropSuccess = 1,
  DropErrorNotJoined = 2,
  DropErrorEventNotFound = 3,
  DropErrorCourseNotFound = 4,
  DropServiceError = 5,
  DropErrorUnavailable = 6,
}

export type DropMatchmakingResponseCode = keyof typeof EnumDropMatchmakingResponseCode;

export enum EnumEffectCostType {
  EffectCostType_None = 0,
  EffectCostType_Select = 1,
  EffectCostType_SelectCounter = 2,
  EffectCostType_Autoselect = 3,
  EffectCostType_SelectFromGroups = 4,
}

export type EffectCostType = keyof typeof EnumEffectCostType;

export enum EnumFailureReason {
  FailureReason_None = 0,
  FailureReason_Expired = 1,
  FailureReason_OutOfTurn = 2,
  FailureReason_ReqRespMismatch = 3,
  FailureReason_ActionNotBatchable = 4,
  FailureReason_ActionInvalid = 5,
  FailureReason_IncompleteMessage = 6,
  FailureReason_IllegalOption = 7,
  FailureReason_UnrecognizedValue = 8,
  FailureReason_TargetsUnavailable = 9,
  FailureReason_TargetIndexOutOfRange = 10,
  FailureReason_TargetIllegal = 11,
  FailureReason_UnrecognizedManaId = 12,
  FailureReason_InvalidOptionSelection = 13,
  FailureReason_UnexpectedMessage = 14,
  FailureReason_LimitViolation = 15,
  FailureReason_RestrictionViolated = 16,
  FailureReason_RequirementViolated = 17,
  FailureReason_UnpayableCost = 18,
  FailureReason_InvalidSeatId = 19,
  FailureReason_InvalidTeamId = 20,
  FailureReason_InvalidMatchState = 21,
  FailureReason_InvalidMatchScope = 22,
  FailureReason_InvalidDeck = 23,
  FailureReason_InvalidCancelState = 24,
  FailureReason_InvalidUndoState = 25,
  FailureReason_PermissionDenied = 26,
  FailureReason_NoTimeout = 27,
  FailureReason_InvalidColor = 28,
  FailureReason_InvalidManaColor = 29,
  FailureReason_InvalidCoinFace = 30,
  FailureReason_InvalidCard = 31,
  FailureReason_InvalidCardName = 32,
  FailureReason_InvalidCardType = 33,
  FailureReason_InvalidSubType = 34,
  FailureReason_InvalidSuperType = 35,
  FailureReason_InvalidCounterType = 36,
  FailureReason_InvalidAbilityType = 37,
  FailureReason_InvalidBasicLandType = 38,
  FailureReason_InvalidOptionIndex = 39,
  FailureReason_InvalidOptionContext = 40,
  FailureReason_InvalidSideboard = 41,
  FailureReason_InvalidCommander = 42,
  FailureReason_DuplicateAttacker = 43,
  FailureReason_UnexpectedDamageRecipient = 44,
  FailureReason_InvalidAttacker = 45,
  FailureReason_RedundantAttacker = 46,
  FailureReason_InvalidBatchAttack = 47,
  FailureReason_MissingDamageRecipient = 48,
  FailureReason_InvalidDamageRecipient = 49,
  FailureReason_InvalidObjective = 50,
  FailureReason_InvalidAlternativeAttack = 51,
  FailureReason_MissingAttackers = 52,
  FailureReason_UnexpectedAttackers = 53,
  FailureReason_InvalidParity = 54,
}

export type FailureReason = keyof typeof EnumFailureReason;

export enum EnumGREMessageType {
  GREMessageType_None = 0,
  GREMessageType_GameStateMessage = 1,
  GREMessageType_ActionsAvailableReq = 2,
  GREMessageType_ChooseStartingPlayerReq = 6,
  GREMessageType_ConnectResp = 7,
  GREMessageType_GetSettingsResp = 9,
  GREMessageType_SetSettingsResp = 10,
  GREMessageType_GroupReq = 11,
  GREMessageType_IllegalRequest = 12,
  GREMessageType_ModalReq = 14,
  GREMessageType_MulliganReq = 15,
  GREMessageType_OrderReq = 17,
  GREMessageType_PromptReq = 18,
  GREMessageType_RevealHandReq = 21,
  GREMessageType_SelectNReq = 22,
  GREMessageType_AllowForceDraw = 24,
  GREMessageType_BinaryGameState = 25,
  GREMessageType_DeclareAttackersReq = 26,
  GREMessageType_SubmitAttackersResp = 27,
  GREMessageType_DeclareBlockersReq = 28,
  GREMessageType_SubmitBlockersResp = 29,
  GREMessageType_AssignDamageReq = 30,
  GREMessageType_AssignDamageConfirmation = 31,
  GREMessageType_OrderCombatDamageReq = 32,
  GREMessageType_OrderDamageConfirmation = 33,
  GREMessageType_SelectTargetsReq = 34,
  GREMessageType_SubmitTargetsResp = 35,
  GREMessageType_PayCostsReq = 36,
  GREMessageType_IntermissionReq = 37,
  GREMessageType_DieRollResultsResp = 38,
  GREMessageType_SelectReplacementReq = 39,
  GREMessageType_SelectNGroupReq = 40,
  GREMessageType_DistributionReq = 42,
  GREMessageType_NumericInputReq = 43,
  GREMessageType_SearchReq = 44,
  GREMessageType_OptionalActionMessage = 45,
  GREMessageType_CastingTimeOptionsReq = 46,
  GREMessageType_SelectManaTypeReq = 47,
  GREMessageType_SelectFromGroupsReq = 48,
  GREMessageType_SearchFromGroupsReq = 49,
  GREMessageType_GatherReq = 50,
  GREMessageType_QueuedGameStateMessage = 51,
  GREMessageType_UIMessage = 52,
  GREMessageType_SubmitDeckReq = 53,
  GREMessageType_EdictalMessage = 54,
  GREMessageType_TimeoutMessage = 55,
  GREMessageType_TimerStateMessage = 56,
}

export type GREMessageType = keyof typeof EnumGREMessageType;

export enum EnumGRETHHostErrorCode {
  GRETHHostErrorCode_Success = 0,
  GRETHHostErrorCode_NullPayload = 1,
  GRETHHostErrorCode_ParseFailed = 2,
  GRETHHostErrorCode_IncompletePayload = 3,
  GRETHHostErrorCode_GreCreateFailed = 4,
  GRETHHostErrorCode_GreDestroyFailed = 5,
  GRETHHostErrorCode_AICreateFailed = 6,
  GRETHHostErrorCode_AIDestroyFailed = 7,
  GRETHHostErrorCode_UnrecognizedGreID = 8,
  GRETHHostErrorCode_InvalidPointer = 9,
  GRETHHostErrorCode_UnknownError = 10,
}

export type GRETHHostErrorCode = keyof typeof EnumGRETHHostErrorCode;

export enum EnumGameObjectType {
  GameObjectType_None = 0,
  GameObjectType_Card = 1,
  GameObjectType_Token = 2,
  GameObjectType_Ability = 3,
  GameObjectType_Emblem = 4,
  GameObjectType_SplitCard = 5,
  GameObjectType_SplitLeft = 6,
  GameObjectType_SplitRight = 7,
  GameObjectType_RevealedCard = 8,
  GameObjectType_TriggerHolder = 9,
  GameObjectType_Adventure = 10,
}

export type GameObjectType = keyof typeof EnumGameObjectType;

export enum EnumGameRoomType {
  GameRoomType_Invalid = 0,
  GameRoomType_Match = 1,
  GameRoomType_Draft = 2,
}

export type GameRoomType = keyof typeof EnumGameRoomType;

export enum EnumGameStage {
  GameStage_None = 0,
  GameStage_Start = 1,
  GameStage_Play = 2,
  GameStage_GameOver = 3,
}

export type GameStage = keyof typeof EnumGameStage;

export enum EnumGameStateType {
  GameStateType_None = 0,
  GameStateType_Full = 1,
  GameStateType_Diff = 2,
  GameStateType_Binary = 3,
}

export type GameStateType = keyof typeof EnumGameStateType;

export enum EnumGameStateUpdate {
  GameStateUpdate_None = 0,
  GameStateUpdate_Send = 1,
  GameStateUpdate_SendAndRecord = 2,
  GameStateUpdate_SendHiFi = 3,
  GameStateUpdate_Undo = 4,
  GameStateUpdate_Restore = 5,
}

export type GameStateUpdate = keyof typeof EnumGameStateUpdate;

export enum EnumGameType {
  GameType_None = 0,
  GameType_Duel = 1,
  GameType_MultiPlayer = 2,
  GameType_Solitaire = 3,
}

export type GameType = keyof typeof EnumGameType;

export enum EnumGameVariant {
  GameVariant_None = 0,
  GameVariant_Normal = 1,
  GameVariant_Planechase = 2,
  GameVariant_Vanguard = 3,
  GameVariant_Commander = 4,
  GameVariant_Archenemy = 5,
  GameVariant_TeamVsTeam = 6,
  GameVariant_TwoHeadedGiant = 7,
  GameVariant_Brawl = 8,
  GameVariant_Placeholder1 = 9,
  GameVariant_Placeholder2 = 10,
  GameVariant_Placeholder3 = 11,
  GameVariant_Placeholder4 = 12,
  GameVariant_Placeholder5 = 13,
}

export type GameVariant = keyof typeof EnumGameVariant;

export enum EnumGroupType {
  GroupType_None = 0,
  GroupType_Ordered = 1,
  GroupType_Arbitrary = 2,
}

export type GroupType = keyof typeof EnumGroupType;

export enum EnumGroupingContext {
  GroupingContext_None = 0,
  GroupingContext_Scry = 1,
  GroupingContext_Surveil = 2,
  GroupingContext_LondonMulligan = 3,
}

export type GroupingContext = keyof typeof EnumGroupingContext;

export enum EnumGroupingStyle {
  GroupingStyle_None = 0,
  GroupingStyle_SingleGroup = 1,
  GroupingStyle_AllGroups = 2,
  GroupingStyle_Mixed = 3,
}

export type GroupingStyle = keyof typeof EnumGroupingStyle;

export enum EnumHighlightType {
  HighlightType_None = 0,
  HighlightType_Cold = 1,
  HighlightType_Tepid = 2,
  HighlightType_Hot = 3,
  HighlightType_Counterspell = 4,
  HighlightType_Random = 5,
}

export type HighlightType = keyof typeof EnumHighlightType;

export enum EnumIdType {
  IdType_None = 0,
  IdType_InstanceId = 1,
  IdType_PromptParameterIndex = 2,
  IdType_ZoneInstanceId = 3,
}

export type IdType = keyof typeof EnumIdType;

export enum EnumJoinMatchmakingResponseCode {
  JoinUnknownError = 0,
  JoinSuccess = 1,
  JoinErrorAlreadyJoined = 2,
  JoinErrorEventNotFound = 3,
  JoinErrorCourseNotFound = 4,
  JoinServiceError = 5,
  JoinErrorUnavailable = 6,
  JoinErrorNoValidDeck = 7,
  JoinErrorCourseNotActive = 8,
}

export type JoinMatchmakingResponseCode = keyof typeof EnumJoinMatchmakingResponseCode;

export enum EnumKeyValuePairValueType {
  KeyValuePairValueType_None = 0,
  KeyValuePairValueType_uint32 = 1,
  KeyValuePairValueType_int32 = 2,
  KeyValuePairValueType_uint64 = 3,
  KeyValuePairValueType_int64 = 4,
  KeyValuePairValueType_bool = 5,
  KeyValuePairValueType_string = 6,
  KeyValuePairValueType_float = 7,
  KeyValuePairValueType_double = 8,
}

export type KeyValuePairValueType = keyof typeof EnumKeyValuePairValueType;

export enum EnumLobbyErrorCode {
  LobbyErrorCode_Invalid = 0,
  LobbyErrorCode_Success = 1,
  LobbyErrorCode_ProtobufParseError = 11,
  LobbyErrorCode_InvalidMessageType = 12,
  LobbyErrorCode_InvalidMessageField = 13,
  LobbyErrorCode_BufferOverflow = 14,
  LobbyErrorCode_Unauthorized = 20,
  LobbyErrorCode_Forbidden = 21,
  LobbyErrorCode_OperationCanceled = 30,
  LobbyErrorCode_RequestTimeout = 31,
  LobbyErrorCode_InvalidOperation = 32,
  LobbyErrorCode_NotFound = 40,
  LobbyErrorCode_UserNotFound = 41,
  LobbyErrorCode_QueueNotFound = 42,
  LobbyErrorCode_DeckNotFound = 43,
  LobbyErrorCode_EventNotFound = 44,
  LobbyErrorCode_AlreadyInQueue = 50,
  LobbyErrorCode_AlreadyInMatch = 51,
  LobbyErrorCode_DraftStartError = 60,
  LobbyErrorCode_InternalServerError = 500,
  LobbyErrorCode_NotImplemented = 501,
  LobbyErrorCode_ServiceUnavailable = 503,
}

export type LobbyErrorCode = keyof typeof EnumLobbyErrorCode;

export enum EnumLobbyUserStateType {
  LobbyUserStateType_Invalid = 0,
  LobbyUserStateType_Idle = 1,
  LobbyUserStateType_JoiningQueue = 2,
  LobbyUserStateType_JoinedQueue = 3,
  LobbyUserStateType_DroppingQueue = 4,
  LobbyUserStateType_Matchmade = 10,
  LobbyUserStateType_InDraft = 15,
  LobbyUserStateType_CreatingMatch = 20,
  LobbyUserStateType_PlayingMatch = 21,
}

export type LobbyUserStateType = keyof typeof EnumLobbyUserStateType;

export enum EnumManaColor {
  ManaColor_None = 0,
  ManaColor_White = 1,
  ManaColor_Blue = 2,
  ManaColor_Black = 3,
  ManaColor_Red = 4,
  ManaColor_Green = 5,
  ManaColor_Phyrexian = 6,
  ManaColor_Generic = 7,
  ManaColor_X = 8,
  ManaColor_Y = 9,
  ManaColor_TwoGeneric = 10,
  ManaColor_AnyColor = 11,
  ManaColor_Colorless = 12,
}

export type ManaColor = keyof typeof EnumManaColor;

export enum EnumManaPaymentStrategyType {
  ManaPaymentStrategyType_None = 0,
  ManaPaymentStrategyType_Auto = 1,
  ManaPaymentStrategyType_Manual = 2,
  ManaPaymentStrategyType_Legacy = 3,
}

export type ManaPaymentStrategyType = keyof typeof EnumManaPaymentStrategyType;

export enum EnumManaSelectionType {
  ManaSelectionType_None = 0,
  ManaSelectionType_Auto = 1,
  ManaSelectionType_Manual = 2,
}

export type ManaSelectionType = keyof typeof EnumManaSelectionType;

export enum EnumManaSpecType {
  ManaSpecType_None = 0,
  ManaSpecType_FromBasic = 1,
  ManaSpecType_Predictive = 2,
  ManaSpecType_Restricted = 3,
  ManaSpecType_Trigger = 4,
  ManaSpecType_FromCreature = 5,
  ManaSpecType_FromSnow = 6,
  ManaSpecType_DoesNotEmpty = 7,
  ManaSpecType_AdditionalEffect = 8,
}

export type ManaSpecType = keyof typeof EnumManaSpecType;

export enum EnumMatchCompletedReasonType {
  MatchCompletedReasonType_Invalid = 0,
  MatchCompletedReasonType_Success = 1,
  MatchCompletedReasonType_ForceResultRequest = 2,
  MatchCompletedReasonType_Canceled = 3,
  MatchCompletedReasonType_PlayerJoinTimeout = 10,
  MatchCompletedReasonType_PlayerInactivityTimeout = 11,
  MatchCompletedReasonType_PlayerDisconnectTimeout = 12,
  MatchCompletedReasonType_SystemShutdown = 30,
  MatchCompletedReasonType_GreError = 31,
  MatchCompletedReasonType_ServiceFabricError = 33,
  MatchCompletedReasonType_CodeContractError = 34,
  MatchCompletedReasonType_UnknownServerError = 40,
}

export type MatchCompletedReasonType = keyof typeof EnumMatchCompletedReasonType;

export enum EnumMatchControllerEventType {
  MatchControllerEventType_Invalid = 0,
  MatchControllerEventType_MatchGameRoomStateChanged = 1,
  MatchControllerEventType_MatchControllerStateChanged = 2,
  MatchControllerEventType_MatchControllerHealthReport = 3,
}

export type MatchControllerEventType = keyof typeof EnumMatchControllerEventType;

export enum EnumMatchControllerState {
  MatchControllerState_Invalid = 0,
  MatchControllerState_Opening = 1,
  MatchControllerState_Running = 2,
  MatchControllerState_Recovering = 3,
  MatchControllerState_Draining = 4,
  MatchControllerState_Closing = 20,
  MatchControllerState_Closed = 21,
}

export type MatchControllerState = keyof typeof EnumMatchControllerState;

export enum EnumMatchGameRoomStateType {
  MatchGameRoomStateType_Invalid = 0,
  MatchGameRoomStateType_WaitingForPlayersToJoin = 1,
  MatchGameRoomStateType_StartPending = 2,
  MatchGameRoomStateType_WaitingForGreConnections = 3,
  MatchGameRoomStateType_Playing = 5,
  MatchGameRoomStateType_MatchCompleted = 15,
  MatchGameRoomStateType_MatchResultsProcessed = 20,
  MatchGameRoomStateType_GameRoomClosing = 21,
  MatchGameRoomStateType_GameRoomClosed = 22,
}

export type MatchGameRoomStateType = keyof typeof EnumMatchGameRoomStateType;

export enum EnumMatchScope {
  MatchScope_None = 0,
  MatchScope_Game = 1,
  MatchScope_Match = 2,
}

export type MatchScope = keyof typeof EnumMatchScope;

export enum EnumMatchServiceErrorCode {
  MatchServiceErrorCode_Invalid = 0,
  MatchServiceErrorCode_Success = 1,
  MatchServiceErrorCode_GreError = 100,
  MatchServiceErrorCode_OperationCanceled = 101,
  MatchServiceErrorCode_InvalidUser = 102,
  MatchServiceErrorCode_InvalidState = 103,
  MatchServiceErrorCode_CreateRoomFailed = 104,
  MatchServiceErrorCode_AuthRequired = 105,
  MatchServiceErrorCode_NotFound = 106,
  MatchServiceErrorCode_ServiceFabricTransactionError = 107,
  MatchServiceErrorCode_BadRequest = 108,
  MatchServiceErrorCode_GameRoomFull = 110,
  MatchServiceErrorCode_NotAuthorized = 111,
  MatchServiceErrorCode_BufferOverflow = 112,
  MatchServiceErrorCode_ImmutableProperty = 113,
  MatchServiceErrorCode_ServerBusy = 114,
  MatchServiceErrorCode_RequestQueueOverflow = 115,
  MatchServiceErrorCode_UnknownServerError = 500,
}

export type MatchServiceErrorCode = keyof typeof EnumMatchServiceErrorCode;

export enum EnumMatchState {
  MatchState_None = 0,
  MatchState_GameInProgress = 1,
  MatchState_GameComplete = 2,
  MatchState_MatchComplete = 3,
  MatchState_Sideboarding = 4,
}

export type MatchState = keyof typeof EnumMatchState;

export enum EnumMatchWinCondition {
  MatchWinCondition_None = 0,
  MatchWinCondition_SingleElimination = 1,
  MatchWinCondition_Best2of3 = 2,
  MatchWinCondition_Best3of5 = 3,
}

export type MatchWinCondition = keyof typeof EnumMatchWinCondition;

export enum EnumMechanicType {
  MechanicType_None = 0,
  MechanicType_CombatEnhancingSorcery = 1,
  MechanicType_CombatEnhancingInstant = 2,
  MechanicType_Haste = 3,
  MechanicType_Flash = 4,
  MechanicType_ReplaceOpponentBeginningPhase = 5,
  MechanicType_ReplaceAIBeginningPhase = 6,
  MechanicType_DirectDamagePlayer = 7,
  MechanicType_Evasion = 9,
  MechanicType_MustAttack = 10,
  MechanicType_MustBlock = 11,
  MechanicType_CombatEnhancingAbility = 12,
  MechanicType_Main2Creature = 13,
  MechanicType_DirectDamageCreature_Sorcery = 14,
  MechanicType_DirectDamageCreature_Instant = 15,
  MechanicType_Placeholder1 = 16,
  MechanicType_Placeholder2 = 17,
  MechanicType_Placeholder3 = 18,
  MechanicType_Placeholder4 = 19,
  MechanicType_Placeholder5 = 20,
}

export type MechanicType = keyof typeof EnumMechanicType;

export enum EnumMulliganOption {
  MulliganOption_None = 0,
  MulliganOption_Mulligan = 1,
  MulliganOption_AcceptHand = 2,
}

export type MulliganOption = keyof typeof EnumMulliganOption;

export enum EnumMulliganType {
  MulliganType_None = 0,
  MulliganType_Paris = 1,
  MulliganType_Vancouver = 2,
  MulliganType_London = 3,
}

export type MulliganType = keyof typeof EnumMulliganType;

export enum EnumOptionContext {
  OptionContext_None = 0,
  OptionContext_ManaAbility = 1,
  OptionContext_Payment = 2,
  OptionContext_Stacking = 3,
  OptionContext_Targeting = 4,
  OptionContext_Resolution = 5,
  OptionContext_TurnBased = 6,
  OptionContext_Replacement = 7,
  OptionContext_ActivateCast = 8,
  OptionContext_TurnFaceUp = 9,
}

export type OptionContext = keyof typeof EnumOptionContext;

export enum EnumOptionResponse {
  OptionResponse_None = 0,
  OptionResponse_Allow_Yes = 1,
  OptionResponse_Cancel_No = 2,
}

export type OptionResponse = keyof typeof EnumOptionResponse;

export enum EnumOptionType {
  OptionType_None = 0,
  OptionType_Modal = 1,
  OptionType_Splice = 2,
  OptionType_AlternativeCost = 3,
  OptionType_Numeric = 4,
  OptionType_VariableCost = 5,
  OptionType_ManaType = 6,
  OptionType_Order = 7,
  OptionType_Search = 8,
  OptionType_Group = 9,
  OptionType_Select = 10,
  OptionType_SelectGroup = 11,
  OptionType_Distribution = 12,
  OptionType_OptionalAction = 13,
  OptionType_ActionsAvailable = 14,
  OptionType_SelectFromGroups = 15,
  OptionType_SearchFromGroups = 16,
  OptionType_Gathering = 17,
}

export type OptionType = keyof typeof EnumOptionType;

export enum EnumOrderCombatDamageType {
  OrderCombatDamageType_None = 0,
  OrderCombatDamageType_Attacker = 1,
  OrderCombatDamageType_Blocker = 2,
}

export type OrderCombatDamageType = keyof typeof EnumOrderCombatDamageType;

export enum EnumOrderingContext {
  OrderingContext_None = 0,
  OrderingContext_OrderingForBottom = 1,
  OrderingContext_OrderingForTop = 2,
}

export type OrderingContext = keyof typeof EnumOrderingContext;

export enum EnumOrderingFunctionType {
  OrderingFunctionType_None = 0,
  OrderingFunctionType_ConstantValue = 1,
  OrderingFunctionType_ObjectScore = 2,
  OrderingFunctionType_CheckCardMechanic = 3,
  OrderingFunctionType_CheckBlockers = 4,
  OrderingFunctionType_CheckAttackers = 5,
  OrderingFunctionType_CheckCardMechanicIfNoAttackers = 6,
  OrderingFunctionType_CheckAbilityMechanic = 7,
  OrderingFunctionType_CheckAbilityMechanicIfNoAttackers = 8,
  OrderingFunctionType_CheckPredefinedCardMechanics = 9,
  OrderingFunctionType_CheckPredefinedAbilityMechanics = 10,
  OrderingFunctionType_CheckPredefinedCardMechanicsIfNoAttackers = 11,
  OrderingFunctionType_CheckPredefinedAbilityMechanicsIfNoAttackers = 12,
  OrderingFunctionType_Mulligan = 13,
  OrderingFunctionType_PlayLand = 14,
  OrderingFunctionType_CheckHasAbility = 15,
  OrderingFunctionType_ManaSelect = 16,
}

export type OrderingFunctionType = keyof typeof EnumOrderingFunctionType;

export enum EnumOrderingParameterId {
  OrderingParameterId_None = 0,
  OrderingParameterId_BestSingleBlock = 1,
  OrderingParameterId_GoodSingleBlock = 2,
  OrderingParameterId_GoodSingleTrade = 3,
  OrderingParameterId_GoodMultiTrade = 4,
  OrderingParameterId_ChumpBlock = 5,
  OrderingParameterId_PlayerDeath = 6,
  OrderingParameterId_MustBlock = 7,
  OrderingParameterId_AttackWithEvasion = 9,
  OrderingParameterId_MustAttack = 10,
  OrderingParameterId_FavorableTrade = 11,
  OrderingParameterId_UnfavorableTrade = 12,
  OrderingParameterId_OpponentDamage = 13,
}

export type OrderingParameterId = keyof typeof EnumOrderingParameterId;

export enum EnumOrderingType {
  OrderingType_None = 0,
  OrderingType_OrderAsIndicated = 1,
  OrderingType_OrderArbitraryOnce = 2,
  OrderingType_OrderArbitraryAlways = 3,
  OrderingType_PromptAlways = 4,
}

export type OrderingType = keyof typeof EnumOrderingType;

export enum EnumParameterType {
  ParameterType_None = 0,
  ParameterType_NonLocalizedString = 1,
  ParameterType_Number = 2,
  ParameterType_Reference = 3,
  ParameterType_PromptId = 5,
}

export type ParameterType = keyof typeof EnumParameterType;

export enum EnumPhase {
  Phase_None = 0,
  Phase_Beginning = 1,
  Phase_Main1 = 2,
  Phase_Combat = 3,
  Phase_Main2 = 4,
  Phase_Ending = 5,
}

export type Phase = keyof typeof EnumPhase;

export enum EnumPlayerIs {
  PlayerIs_None = 0,
  PlayerIs_DontCare = 1,
  PlayerIs_AI = 2,
  PlayerIs_Opponent = 3,
}

export type PlayerIs = keyof typeof EnumPlayerIs;

export enum EnumPresenceState {
  PresenceState_Invalid = 0,
  PresenceState_Offline = 1,
  PresenceState_Online = 2,
}

export type PresenceState = keyof typeof EnumPresenceState;

export enum EnumProtoVersion {
  ProtoVersion_None = 0,
  ProtoVersion_HiFiGameStates = 1,
  ProtoVersion_PreviousGameStateId = 2,
  ProtoVersion_Timers = 3,
  ProtoVersion_ManaRequirement = 4,
  ProtoVersion_AutoTapActions = 5,
  ProtoVersion_UIMessages = 6,
  ProtoVersion_AutoTapStopsSetting = 7,
  ProtoVersion_Sideboarding = 8,
  ProtoVersion_AutoOptionalPaymentCancellationSetting = 9,
  ProtoVersion_CostCategory = 10,
  ProtoVersion_TimersV2 = 11,
  ProtoVersion_Control = 12,
  ProtoVersion_TimersV3 = 13,
  ProtoVersion_AutoAcceptHand = 14,
  ProtoVersion_TimersV4 = 15,
  ProtoVersion_TimersV5 = 16,
  ProtoVersion_ManaPaymentStrategyType = 17,
  ProtoVersion_TimersV6 = 18,
  ProtoVersion_TimersV7 = 19,
  ProtoVersion_TimersV8 = 20,
  ProtoVersion_TransientStops = 21,
  ProtoVersion_Cosmetics = 22,
  ProtoVersion_ResultSpec = 23,
  ProtoVersion_ResultReason = 24,
  ProtoVersion_SuperFormat = 25,
  ProtoVersion_AutoSelectReplacementSetting = 26,
  ProtoVersion_MulliganType = 27,
  ProtoVersion_PendingMessageType = 28,
  ProtoVersion_AutoDeclareAttackersThatMustAttackSetting = 29,
  ProtoVersion_DeceptiveActions = 30,
  ProtoVersion_PerformAutoTapActions = 31,
  ProtoVersion_MulliganReq = 32,
  ProtoVersion_AutoTapSolution = 33,
  ProtoVersion_ManaPaymentDeprecated = 34,
  ProtoVersion_SelectFromGroupRespGroups = 35,
}

export type ProtoVersion = keyof typeof EnumProtoVersion;

export enum EnumQueueType {
  QueueType_Invalid = 0,
  QueueType_MatchQueue = 1,
  QueueType_DraftQueue = 2,
}

export type QueueType = keyof typeof EnumQueueType;

export enum EnumReferenceType {
  ReferenceType_None = 0,
  ReferenceType_InstanceId = 1,
  ReferenceType_CatalogId = 2,
  ReferenceType_LocalizationId = 3,
  ReferenceType_PlayerSeatId = 4,
}

export type ReferenceType = keyof typeof EnumReferenceType;

export enum EnumResultCode {
  ResultCode_None = 0,
  ResultCode_Success = 1,
  ResultCode_Failure = 2,
  ResultCode_CannotAttack = 3,
  ResultCode_AttackCostUnpaid = 4,
  ResultCode_CannotBlock = 5,
  ResultCode_IllegalBlock = 6,
  ResultCode_OrderMismatch = 7,
  ResultCode_MissingDamageSource = 8,
  ResultCode_InvalidDamageSource = 9,
  ResultCode_NonlethalAssignment = 10,
  ResultCode_InvalidAssignment = 11,
  ResultCode_TooManyTargets = 12,
  ResultCode_NotEnoughTargets = 13,
  ResultCode_IllegalTarget = 14,
  ResultCode_RestrictionViolated = 15,
  ResultCode_RequirementViolated = 16,
}

export type ResultCode = keyof typeof EnumResultCode;

export enum EnumResultReason {
  ResultReason_None = 0,
  ResultReason_Game = 1,
  ResultReason_Concede = 2,
  ResultReason_Timeout = 3,
  ResultReason_Loop = 4,
  ResultReason_Force = 5,
}

export type ResultReason = keyof typeof EnumResultReason;

export enum EnumResultType {
  ResultType_None = 0,
  ResultType_Suspended = 1,
  ResultType_Draw = 2,
  ResultType_WinLoss = 3,
}

export type ResultType = keyof typeof EnumResultType;

export enum EnumSelectAction {
  SelectAction_None = 0,
  SelectAction_Select = 1,
  SelectAction_Unselect = 2,
}

export type SelectAction = keyof typeof EnumSelectAction;

export enum EnumSelectionContext {
  SelectionContext_None = 0,
  SelectionContext_Discard = 1,
  SelectionContext_ManaPool = 2,
  SelectionContext_Resolution = 3,
  SelectionContext_TriggeredAbility = 4,
  SelectionContext_Modal = 5,
  SelectionContext_Replacement = 6,
  SelectionContext_NonMana_Payment = 7,
  SelectionContext_ManaFromAbility = 8,
}

export type SelectionContext = keyof typeof EnumSelectionContext;

export enum EnumSelectionListType {
  SelectionListType_None = 0,
  SelectionListType_Static = 1,
  SelectionListType_Dynamic = 2,
  SelectionListType_StaticSubset = 3,
}

export type SelectionListType = keyof typeof EnumSelectionListType;

export enum EnumSelectionValidationType {
  SelectionValidationType_None = 0,
  SelectionValidationType_NonRepeatable = 1,
  SelectionValidationType_ArbitraryRepeats = 2,
  SelectionValidationType_ConstrainedRepeats = 3,
}

export type SelectionValidationType = keyof typeof EnumSelectionValidationType;

export enum EnumSetting {
  Setting_None = 0,
  Setting_Enable = 1,
  Setting_Disable = 2,
}

export type Setting = keyof typeof EnumSetting;

export enum EnumSettingKey {
  SettingKey_None = 0,
  SettingKey_ByAbility = 1,
  SettingKey_ByCardTitle = 2,
}

export type SettingKey = keyof typeof EnumSettingKey;

export enum EnumSettingScope {
  SettingScope_None = 0,
  SettingScope_AnyPlayer = 1,
  SettingScope_Opponents = 2,
  SettingScope_Team = 3,
}

export type SettingScope = keyof typeof EnumSettingScope;

export enum EnumSettingStatus {
  SettingStatus_None = 0,
  SettingStatus_Set = 1,
  SettingStatus_Clear = 2,
}

export type SettingStatus = keyof typeof EnumSettingStatus;

export enum EnumShuffleRestriction {
  ShuffleRestriction_None = 0,
  ShuffleRestriction_OpeningHand = 1,
  ShuffleRestriction_All = 2,
}

export type ShuffleRestriction = keyof typeof EnumShuffleRestriction;

export enum EnumSmartStopsSetting {
  SmartStopsSetting_None = 0,
  SmartStopsSetting_Enable = 1,
  SmartStopsSetting_Disable = 2,
}

export type SmartStopsSetting = keyof typeof EnumSmartStopsSetting;

export enum EnumSortBy {
  SortBy_None = 0,
  SortBy_HighToLow = 1,
  SortBy_LowToHigh = 2,
}

export type SortBy = keyof typeof EnumSortBy;

export enum EnumStaticList {
  StaticList_None = 0,
  StaticList_CardColors = 1,
  StaticList_ManaColors = 2,
  StaticList_SuperTypes = 3,
  StaticList_CardTypes = 4,
  StaticList_SubTypes = 5,
  StaticList_Colors = 6,
  StaticList_CoinFaces = 7,
  StaticList_WishCards = 8,
  StaticList_BasicLandTypes = 9,
  StaticList_CreatureTypes = 10,
  StaticList_CounterTypes = 11,
  StaticList_Keywords = 12,
  StaticList_CardNames = 13,
  StaticList_Parities = 14,
}

export type StaticList = keyof typeof EnumStaticList;

export enum EnumStep {
  Step_None = 0,
  Step_Untap = 1,
  Step_Upkeep = 2,
  Step_Draw = 3,
  Step_BeginCombat = 4,
  Step_DeclareAttack = 5,
  Step_DeclareBlock = 6,
  Step_CombatDamage = 7,
  Step_EndCombat = 8,
  Step_End = 9,
  Step_Cleanup = 10,
  Step_FirstStrikeDamage = 11,
}

export type Step = keyof typeof EnumStep;

export enum EnumStopType {
  StopType_None = 0,
  StopType_UpkeepStep = 1,
  StopType_DrawStep = 2,
  StopType_PrecombatMainPhase = 3,
  StopType_BeginCombatStep = 4,
  StopType_DeclareAttackersStep = 5,
  StopType_DeclareBlockersStep = 6,
  StopType_CombatDamageStep = 7,
  StopType_EndCombatStep = 8,
  StopType_PostcombatMainPhase = 9,
  StopType_EndStep = 10,
  StopType_FirstStrikeDamageStep = 11,
}

export type StopType = keyof typeof EnumStopType;

export enum EnumSubType {
  SubType_None = 0,
  SubType_Angel = 1,
  SubType_Archer = 2,
  SubType_Archon = 3,
  SubType_Artificer = 4,
  SubType_Assassin = 5,
  SubType_Aura = 6,
  SubType_Basilisk = 7,
  SubType_Bat = 8,
  SubType_Bear = 9,
  SubType_Beast = 10,
  SubType_Berserker = 11,
  SubType_Bird = 12,
  SubType_Boar = 13,
  SubType_Cat = 14,
  SubType_Chandra = 15,
  SubType_Cleric = 16,
  SubType_Construct = 17,
  SubType_Crocodile = 18,
  SubType_Demon = 19,
  SubType_Djinn = 20,
  SubType_Dragon = 21,
  SubType_Drake = 22,
  SubType_Druid = 23,
  SubType_Fish = 24,
  SubType_Elemental = 25,
  SubType_Elephant = 26,
  SubType_Elf = 27,
  SubType_Equipment = 28,
  SubType_Forest = 29,
  SubType_Garruk = 30,
  SubType_Gate = 31,
  SubType_Giant = 32,
  SubType_Gideon = 33,
  SubType_Goblin = 34,
  SubType_Golem = 35,
  SubType_Griffin = 36,
  SubType_Horse = 37,
  SubType_Human = 39,
  SubType_Hydra = 40,
  SubType_Illusion = 41,
  SubType_Insect = 42,
  SubType_Island = 43,
  SubType_Jace = 44,
  SubType_Knight = 45,
  SubType_Merfolk = 46,
  SubType_Minotaur = 47,
  SubType_Monk = 48,
  SubType_Mountain = 49,
  SubType_Ogre = 50,
  SubType_Ooze = 51,
  SubType_Pegasus = 52,
  SubType_Phoenix = 53,
  SubType_Plains = 54,
  SubType_Rhino = 55,
  SubType_Rogue = 56,
  SubType_Salamander = 57,
  SubType_Scout = 58,
  SubType_Serpent = 59,
  SubType_Shade = 60,
  SubType_Shaman = 61,
  SubType_Siren = 62,
  SubType_Skeleton = 63,
  SubType_Soldier = 64,
  SubType_Sorin = 65,
  SubType_Sphinx = 66,
  SubType_Spider = 67,
  SubType_Spirit = 68,
  SubType_Swamp = 69,
  SubType_Tower = 70,
  SubType_Treefolk = 71,
  SubType_Troll = 72,
  SubType_Urzas = 73,
  SubType_Vampire = 74,
  SubType_Vedalken = 75,
  SubType_Wall = 76,
  SubType_Warrior = 77,
  SubType_Wizard = 78,
  SubType_Wolf = 79,
  SubType_Wurm = 80,
  SubType_Zombie = 81,
  SubType_Mine = 82,
  SubType_Power_Plant = 83,
  SubType_Saproling = 84,
  SubType_Avatar = 85,
  SubType_Sliver = 86,
  SubType_Samurai = 87,
  SubType_Pest = 88,
  SubType_Thalakos = 89,
  SubType_Dauthi = 90,
  SubType_Minion = 91,
  SubType_Advisor = 92,
  SubType_Ajani = 93,
  SubType_Alara = 94,
  SubType_Ally = 95,
  SubType_Antelope = 97,
  SubType_Ape = 98,
  SubType_Arcane = 99,
  SubType_Arkhos = 100,
  SubType_Ashiok = 101,
  SubType_AssemblyWorker = 102,
  SubType_Atog = 103,
  SubType_Aurochs = 104,
  SubType_Azgol = 105,
  SubType_Badger = 106,
  SubType_Barbarian = 107,
  SubType_Beeble = 108,
  SubType_Belenon = 109,
  SubType_Bolas = 110,
  SubType_Bolass = 111,
  SubType_Bringer = 112,
  SubType_Brushwagg = 113,
  SubType_Camel = 114,
  SubType_Carrier = 115,
  SubType_Centaur = 116,
  SubType_Cephalid = 117,
  SubType_Chimera = 118,
  SubType_Cockatrice = 119,
  SubType_Crab = 120,
  SubType_Curse = 121,
  SubType_Cyclops = 122,
  SubType_Desert = 123,
  SubType_Devil = 124,
  SubType_Dominaria = 125,
  SubType_Domri = 126,
  SubType_Dreadnought = 127,
  SubType_Drone = 128,
  SubType_Dryad = 129,
  SubType_Dwarf = 130,
  SubType_Efreet = 131,
  SubType_Elder = 132,
  SubType_Eldrazi = 133,
  SubType_Elk = 134,
  SubType_Elspeth = 135,
  SubType_Equilor = 136,
  SubType_Ergamon = 137,
  SubType_Eye = 138,
  SubType_Fabacin = 139,
  SubType_Faerie = 140,
  SubType_Ferret = 141,
  SubType_Flagbearer = 142,
  SubType_Fortification = 143,
  SubType_Fox = 144,
  SubType_Frog = 145,
  SubType_Fungus = 146,
  SubType_Gargoyle = 147,
  SubType_Gnome = 148,
  SubType_Goat = 149,
  SubType_God = 150,
  SubType_Gorgon = 151,
  SubType_Gremlin = 152,
  SubType_Hag = 153,
  SubType_Harpy = 154,
  SubType_Hellion = 155,
  SubType_Hippo = 156,
  SubType_Hippogriff = 157,
  SubType_Homarid = 158,
  SubType_Homunculus = 159,
  SubType_Horror = 160,
  SubType_Hyena = 161,
  SubType_Imp = 162,
  SubType_Incarnation = 163,
  SubType_Innistrad = 164,
  SubType_Iquatana = 165,
  SubType_Ir = 166,
  SubType_Jellyfish = 167,
  SubType_Juggernaut = 168,
  SubType_Kaldheim = 169,
  SubType_Kamigawa = 170,
  SubType_Karn = 171,
  SubType_Karsus = 172,
  SubType_Kavu = 173,
  SubType_Kephalai = 174,
  SubType_Kirin = 175,
  SubType_Kithkin = 176,
  SubType_Kobold = 177,
  SubType_Kolbahan = 178,
  SubType_Kor = 179,
  SubType_Koth = 180,
  SubType_Kraken = 181,
  SubType_Kyneth = 182,
  SubType_Lair = 183,
  SubType_Lammasu = 184,
  SubType_Leech = 185,
  SubType_Leviathan = 186,
  SubType_Lhurgoyf = 187,
  SubType_Licid = 188,
  SubType_Liliana = 189,
  SubType_Lizard = 190,
  SubType_Locus = 191,
  SubType_Lorwyn = 192,
  SubType_Luvion = 193,
  SubType_Manticore = 194,
  SubType_Masticore = 195,
  SubType_Meditation = 196,
  SubType_Mercadia = 197,
  SubType_Mercenary = 198,
  SubType_Metathran = 199,
  SubType_Mirrodin = 200,
  SubType_Moag = 201,
  SubType_Monger = 202,
  SubType_Mongoose = 203,
  SubType_Mongseng = 204,
  SubType_Moonfolk = 205,
  SubType_Muraganda = 206,
  SubType_Mutant = 207,
  SubType_Myr = 208,
  SubType_Mystic = 209,
  SubType_Nautilus = 210,
  SubType_Nephilim = 211,
  SubType_New = 212,
  SubType_Nightmare = 213,
  SubType_Nightstalker = 214,
  SubType_Ninja = 215,
  SubType_Nissa = 216,
  SubType_Noggle = 217,
  SubType_Nomad = 218,
  SubType_Nymph = 219,
  SubType_Octopus = 220,
  SubType_Orc = 221,
  SubType_Orgg = 222,
  SubType_Ouphe = 223,
  SubType_Ox = 224,
  SubType_Oyster = 225,
  SubType_Phelddagrif = 226,
  SubType_Phyrexia = 227,
  SubType_Pirate = 228,
  SubType_Plant = 229,
  SubType_Praetor = 230,
  SubType_Pyrulea = 231,
  SubType_Rabbit = 232,
  SubType_Rabiah = 233,
  SubType_Ral = 234,
  SubType_Rat = 235,
  SubType_Rath = 236,
  SubType_Ravnica = 237,
  SubType_Realm = 238,
  SubType_Rebel = 239,
  SubType_Regatha = 240,
  SubType_Rigger = 241,
  SubType_Sable = 242,
  SubType_Sarkhan = 243,
  SubType_Satyr = 244,
  SubType_Scarecrow = 245,
  SubType_Scorpion = 246,
  SubType_Segovia = 247,
  SubType_Serras = 248,
  SubType_Shadowmoor = 249,
  SubType_Shandalar = 250,
  SubType_Shapeshifter = 251,
  SubType_Sheep = 252,
  SubType_Shrine = 253,
  SubType_Slith = 254,
  SubType_Slug = 255,
  SubType_Snake = 256,
  SubType_Soltari = 257,
  SubType_Spawn = 258,
  SubType_Specter = 259,
  SubType_Spellshaper = 260,
  SubType_Spike = 261,
  SubType_Sponge = 262,
  SubType_Squid = 263,
  SubType_Squirrel = 264,
  SubType_Starfish = 265,
  SubType_Surrakar = 266,
  SubType_Tamiyo = 267,
  SubType_Tezzeret = 268,
  SubType_Thopter = 269,
  SubType_Thrull = 270,
  SubType_Tibalt = 271,
  SubType_Trap = 272,
  SubType_Turtle = 273,
  SubType_Ulgrotha = 274,
  SubType_Unicorn = 275,
  SubType_Valla = 276,
  SubType_Venser = 277,
  SubType_Viashino = 278,
  SubType_Volver = 279,
  SubType_Vraska = 280,
  SubType_Vryn = 281,
  SubType_Weird = 282,
  SubType_Werewolf = 283,
  SubType_Whale = 284,
  SubType_Wildfire = 285,
  SubType_Wolverine = 286,
  SubType_Wombat = 287,
  SubType_Worm = 288,
  SubType_Wraith = 289,
  SubType_Xenagos = 290,
  SubType_Xerex = 291,
  SubType_Yeti = 292,
  SubType_Zendikar = 293,
  SubType_Zubera = 294,
  SubType_Germ = 295,
  SubType_Contraption = 296,
  SubType_Citizen = 297,
  SubType_Coward = 298,
  SubType_Deserter = 299,
  SubType_Prism = 300,
  SubType_Reflection = 301,
  SubType_Sand = 302,
  SubType_Serf = 303,
  SubType_Dack = 304,
  SubType_Kiora = 305,
  SubType_AllCreatureTypes = 306,
  SubType_Blinkmoth = 307,
  SubType_Camarid = 308,
  SubType_Caribou = 309,
  SubType_Graveborn = 310,
  SubType_Lamia = 311,
  SubType_Orb = 312,
  SubType_Pentavite = 313,
  SubType_Pincher = 314,
  SubType_Splinter = 315,
  SubType_Survivor = 316,
  SubType_Tetravite = 317,
  SubType_Triskelavite = 318,
  SubType_Scion = 319,
  SubType_Processor = 320,
  SubType_Arlinn = 321,
  SubType_Mole = 322,
  SubType_Nahiri = 323,
  SubType_Clue = 324,
  SubType_Teferi = 325,
  SubType_Daretti = 326,
  SubType_Freyalise = 327,
  SubType_Nixilis = 328,
  SubType_Narset = 329,
  SubType_Ugin = 330,
  SubType_Vehicle = 331,
  SubType_Servo = 332,
  SubType_Dovin = 333,
  SubType_Saheeli = 334,
  SubType_Monkey = 335,
  SubType_Aetherborn = 336,
  SubType_Pilot = 337,
  SubType_Jackal = 338,
  SubType_Naga = 339,
  SubType_Cartouche = 340,
  SubType_Samut = 341,
  SubType_Dinosaur = 342,
  SubType_Treasure = 343,
  SubType_Huatli = 344,
  SubType_Angrath = 345,
  SubType_Trilobite = 346,
  SubType_Saga = 347,
  SubType_Jaya = 348,
  SubType_Vivien = 349,
  SubType_Egg = 350,
  SubType_Kaya = 351,
  SubType_Aminatou = 352,
  SubType_Estrid = 353,
  SubType_Rowan = 354,
  SubType_Will = 355,
  SubType_Windgrace = 356,
  SubType_Yanggu = 357,
  SubType_Yanling = 358,
  SubType_Army = 359,
  SubType_Teyo = 360,
  SubType_Kasmina = 361,
  SubType_Davriel = 362,
  SubType_Food = 363,
  SubType_Mouse = 364,
  SubType_Noble = 365,
  SubType_Peasant = 366,
  SubType_Oko = 367,
  SubType_Warlock = 368,
  SubType_Adventure = 369,
  SubType_Demigod = 370,
  SubType_Gold = 371,
  SubType_Tentacle = 372,
  SubType_Azra = 373,
  SubType_Pangolin = 374,
  SubType_Calix = 375,
  SubType_Lukka = 376,
  SubType_Otter = 377,
  SubType_Shark = 378,
  SubType_Dog = 379,
  SubType_Basri = 380,
  SubType_PlaceholderSubType3 = 381,
  SubType_PlaceholderSubType4 = 382,
  SubType_PlaceholderSubType5 = 383,
  SubType_PlaceholderSubType6 = 384,
  SubType_PlaceholderSubType10 = 385,
}

export type SubType = keyof typeof EnumSubType;

export enum EnumSubZoneType {
  SubZoneType_None = 0,
  SubZoneType_Top = 1,
  SubZoneType_Bottom = 2,
}

export type SubZoneType = keyof typeof EnumSubZoneType;

export enum EnumSuperFormat {
  SuperFormat_None = 0,
  SuperFormat_Limited = 1,
  SuperFormat_Constructed = 2,
}

export type SuperFormat = keyof typeof EnumSuperFormat;

export enum EnumSuperType {
  SuperType_None = 0,
  SuperType_Basic = 1,
  SuperType_Legendary = 2,
  SuperType_Ongoing = 3,
  SuperType_Snow = 4,
  SuperType_World = 5,
}

export type SuperType = keyof typeof EnumSuperType;

export enum EnumTargetType {
  TargetType_None = 0,
  TargetType_Player = 1,
  TargetType_GameObject = 2,
}

export type TargetType = keyof typeof EnumTargetType;

export enum EnumTeamType {
  TeamType_None = 0,
  TeamType_Individual = 1,
  TeamType_SharedTeam = 2,
}

export type TeamType = keyof typeof EnumTeamType;

export enum EnumTimeoutType {
  TimeoutType_None = 0,
  TimeoutType_ChessClock = 1,
  TimeoutType_Inactivity = 2,
}

export type TimeoutType = keyof typeof EnumTimeoutType;

export enum EnumTimerBehavior {
  TimerBehavior_None = 0,
  TimerBehavior_Timeout = 1,
  TimerBehavior_AutoRespond = 2,
  TimerBehavior_TakeControl = 3,
  TimerBehavior_ReleaseControl = 4,
  TimerBehavior_Start = 5,
  TimerBehavior_Restart = 6,
  TimerBehavior_Stop = 7,
  TimerBehavior_Reset = 8,
  TimerBehavior_Activate = 9,
  TimerBehavior_Deactivate = 10,
  TimerBehavior_StartDelayedTimer = 11,
}

export type TimerBehavior = keyof typeof EnumTimerBehavior;

export enum EnumTimerEvent {
  TimerEvent_None = 0,
  TimerEvent_OnRequestSent = 1,
  TimerEvent_OnResponseReceived = 2,
  TimerEvent_OnExpiration = 3,
  TimerEvent_OnMatchStart = 4,
  TimerEvent_OnGameStart = 5,
  TimerEvent_OnPlayStart = 6,
  TimerEvent_OnTurnChanged = 7,
  TimerEvent_OnActivePlayer = 8,
  TimerEvent_OnNonActivePlayer = 9,
  TimerEvent_Beginning = 10,
  TimerEvent_Main1 = 11,
  TimerEvent_Combat = 12,
  TimerEvent_Main2 = 13,
  TimerEvent_Ending = 14,
  TimerEvent_OnWin = 15,
  TimerEvent_OnLoss = 16,
  TimerEvent_OnDraw = 17,
  TimerEvent_OnGameOver = 18,
  TimerEvent_OnMatchOver = 19,
  TimerEvent_OnTurnOver = 20,
  TimerEvent_Upkeep = 21,
  TimerEvent_Draw = 22,
  TimerEvent_BeginCombat = 23,
  TimerEvent_DeclareAttack = 24,
  TimerEvent_DeclareBlock = 25,
  TimerEvent_CombatDamage = 26,
  TimerEvent_EndCombat = 27,
  TimerEvent_End = 28,
  TimerEvent_Cleanup = 29,
  TimerEvent_FirstStrikeDamage = 30,
}

export type TimerEvent = keyof typeof EnumTimerEvent;

export enum EnumTimerPackage {
  TimerPackage_None = 0,
  TimerPackage_V1 = 1,
  TimerPackage_V2 = 2,
  TimerPackage_V3 = 3,
  TimerPackage_V4 = 4,
  TimerPackage_V5 = 5,
  TimerPackage_DirectChallenge = 6,
  TimerPackage_Default = 7,
  TimerPackage_BestOfThree = 8,
}

export type TimerPackage = keyof typeof EnumTimerPackage;

export enum EnumTimerType {
  TimerType_None = 0,
  TimerType_Decision = 1,
  TimerType_Inactivity = 2,
  TimerType_ActivePlayer = 3,
  TimerType_NonActivePlayer = 4,
  TimerType_Prologue = 5,
  TimerType_Epilogue = 6,
  TimerType_Delay = 7,
  TimerType_MatchClock = 8,
}

export type TimerType = keyof typeof EnumTimerType;

export enum EnumVisibility {
  Visibility_None = 0,
  Visibility_Public = 1,
  Visibility_Private = 2,
  Visibility_Hidden = 3,
  Visibility_Deceptive = 4,
}

export type Visibility = keyof typeof EnumVisibility;

export enum EnumZoneType {
  ZoneType_None = 0,
  ZoneType_Library = 1,
  ZoneType_Hand = 2,
  ZoneType_Battlefield = 3,
  ZoneType_Stack = 4,
  ZoneType_Graveyard = 5,
  ZoneType_Exile = 6,
  ZoneType_Command = 7,
  ZoneType_Revealed = 8,
  ZoneType_Limbo = 9,
  ZoneType_Sideboard = 10,
  ZoneType_Pending = 11,
  ZoneType_PhasedOut = 12,
  ZoneType_Suppressed = 13,
}

export type ZoneType = keyof typeof EnumZoneType;
