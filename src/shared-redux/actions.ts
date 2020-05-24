import * as SettingsSlice from "./slices/settingsSlice";
import * as PlayerDataSlice from "./slices/playerDataSlice";
import * as AppSettingsSlice from "./slices/appSettingsSlice";
import * as RendererSlice from "./slices/rendererSlice";
import * as HoverSlice from "./slices/hoverSlice";
import * as LoginSlice from "./slices/loginSlice";
import * as HomeSlice from "./slices/homeSlice";
import * as CollectionSlice from "./slices/collectionSlice";
import * as ExploreSlice from "./slices/exploreSlice";
import * as MatchesSlice from "./slices/matchesSlice";
import * as EventsSlice from "./slices/eventsSlice";
import * as DecksSlice from "./slices/decksSlice";
import * as EconomySlice from "./slices/economySlice";
import * as DraftsSlice from "./slices/draftsSlice";
import * as SeasonalSlice from "./slices/seasonalSlice";
import * as DeckChangesSlice from "./slices/deckChangesSlice";

export type DispatchParameter<K extends Actions> = {
  type: K;
  arg: Parameters<typeof actions[K]>[0];
};

export type Actions = keyof typeof actions;

const actions = {
  SET_SETTINGS: SettingsSlice.setSettings,
  SET_APP_SETTINGS: AppSettingsSlice.setAppSettings,
  SET_ARCHIVED: RendererSlice.setArchived,
  SET_BACK_COLOR: RendererSlice.setBackgroundColor,
  SET_BACK_GRPID: RendererSlice.setBackgroundGrpId,
  SET_BACK_IMAGE: RendererSlice.setBackgroundImage,
  SET_LOADING: RendererSlice.setLoading,
  SET_NO_LOG: RendererSlice.setNoLog,
  SET_OFFLINE: RendererSlice.setOffline,
  SET_PATREON: RendererSlice.setPatreon,
  SET_POPUP: RendererSlice.setPopup,
  SET_SHARE_DIALOG: RendererSlice.setShareDialog,
  SET_SHARE_DIALOG_OPEN: RendererSlice.setShareDialogOpen,
  SET_SHARE_DIALOG_URL: RendererSlice.setShareDialogUrl,
  SET_NAV_INDEX: RendererSlice.setNavIndex,
  SET_SUBNAV: RendererSlice.setSubNav,
  SET_TOPARTIST: RendererSlice.setTopArtist,
  SET_TOPNAV: RendererSlice.setTopNav,
  SET_UPDATE_STATE: RendererSlice.setUpdateState,
  SET_SYNC_STATE: RendererSlice.setSyncState,
  SET_TO_PUSH: RendererSlice.setSyncToPush,
  SET_HOVER_IN: HoverSlice.setHoverIn,
  SET_HOVER_OUT: HoverSlice.setHoverOut,
  SET_CAN_LOGIN: LoginSlice.setCanLogin,
  SET_LOGIN_EMAIL: LoginSlice.setLoginEmail,
  SET_LOGIN_FORM: LoginSlice.setLoginForm,
  SET_LOGIN_PASSWORD: LoginSlice.setLoginPassword,
  SET_LOGIN_REMEMBER: LoginSlice.setLoginRemember,
  SET_LOGIN_STATE: LoginSlice.setLoginState,
  SET_HOME_DATA: HomeSlice.setHomeData,
  SET_BOOSTER_WIN_FACTOR: CollectionSlice.setBoosterWinFactor,
  SET_COUNT_MODE: CollectionSlice.setCountMode,
  SET_FUTURE_BOOSTERS: CollectionSlice.setFutureBoosters,
  SET_MYTHIC_DRAFT_FACTOR: CollectionSlice.setMythicDraftFactor,
  SET_RARE_DRAFT_FACTOR: CollectionSlice.setRareDraftFactor,
  SET_ACTIVE_EVENTS: ExploreSlice.setActiveEvents,
  SET_EXPLORE_DATA: ExploreSlice.setExploreData,
  SET_EXPLORE_FILTERS: ExploreSlice.setExploreFilters,
  SET_EXPLORE_FILTERS_SKIP: ExploreSlice.setExploreFiltersSkip,
  SET_MATCH: MatchesSlice.setMatch,
  SET_MANY_MATCHES: MatchesSlice.setManyMatches,
  SET_EVENT: EventsSlice.setEvent,
  SET_MANY_EVENTS: EventsSlice.setManyEvents,
  SET_PLAYERDB: PlayerDataSlice.setPlayerDb,
  SET_APPDB: PlayerDataSlice.setAppDb,
  SET_PLAYER_ID: PlayerDataSlice.setPlayerId,
  SET_PLAYER_NAME: PlayerDataSlice.setPlayerName,
  SET_ARENA_VERSION: PlayerDataSlice.setArenaVersion,
  SET_PLAYER_ECONOMY: PlayerDataSlice.setEconomy,
  SET_TAG_COLORS: PlayerDataSlice.setTagColors,
  EDIT_TAG_COLOR: PlayerDataSlice.editTagColor,
  SET_RANK: PlayerDataSlice.setRank,
  ADD_CARD: PlayerDataSlice.addCard,
  ADD_CARDS_LIST: PlayerDataSlice.addCardsList,
  ADD_CARDS_KEYS: PlayerDataSlice.addCardsKeys,
  ADD_CARDS_FROM_STORE: PlayerDataSlice.addCardsFromStore,
  REMOVE_DECK_TAG: PlayerDataSlice.removeDeckTag,
  ADD_DECK_TAG: PlayerDataSlice.addDeckTag,
  SET_DECK_TAGS: PlayerDataSlice.setDeckTags,
  SET_DECK: DecksSlice.setDeck,
  SET_MANY_DECKS: DecksSlice.setManyDecks,
  SET_MANY_STATIC_DECKS: DecksSlice.setManyStaticDecks,
  SET_ECONOMY: EconomySlice.setEconomy,
  SET_MANY_ECONOMY: EconomySlice.setManyEconomy,
  SET_DRAFT: DraftsSlice.setDraft,
  SET_MANY_DRAFT: DraftsSlice.setManyDrafts,
  SET_SEASONAL: SeasonalSlice.setSeasonal,
  SET_MANY_SEASONAL: SeasonalSlice.setManySeasonal,
  SET_DECK_CHANGE: DeckChangesSlice.setChange,
  SET_MANY_DECK_CHANGES: DeckChangesSlice.setManyChanges
};

export default actions;
