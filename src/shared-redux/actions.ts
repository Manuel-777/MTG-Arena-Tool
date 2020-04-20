import settingsSlice from "./slices/settingsSlice";
import playerDataSlice from "./slices/playerDataSlice";
import appSettingsSlice from "./slices/appSettingsSlice";
import rendererSlice from "./slices/rendererSlice";
import hoverSlice from "./slices/hoverSlice";
import loginSlice from "./slices/loginSlice";
import homeSlice from "./slices/homeSlice";
import collectionSlice from "./slices/collectionSlice";
import exploreSlice from "./slices/exploreSlice";
import matchesSlice from "./slices/matchesSlice";
import eventsSlice from "./slices/eventsSlice";
import decksSlice from "./slices/decksSlice";
import economySlice from "./slices/economySlice";
import draftsSlice from "./slices/draftsSlice";
import seasonalSlice from "./slices/seasonalSlice";
import deckChangesSlice from "./slices/deckChangesSlice";
import currentMatchSlice from "./slices/currentMatchSlice";

const actions: Record<string, (arg: any) => any> = {};
actions["SET_SETTINGS"] = settingsSlice.actions.setSettings;
actions["SET_APP_SETTINGS"] = appSettingsSlice.actions.setAppSettings;
actions["SET_ARCHIVED"] = rendererSlice.actions.setArchived;
actions["SET_BACK_COLOR"] = rendererSlice.actions.setBackgroundColor;
actions["SET_BACK_GRPID"] = rendererSlice.actions.setBackgroundGrpId;
actions["SET_BACK_IMAGE"] = rendererSlice.actions.setBackgroundImage;
actions["SET_LOADING"] = rendererSlice.actions.setLoading;
actions["SET_NO_LOG"] = rendererSlice.actions.setNoLog;
actions["SET_OFFLINE"] = rendererSlice.actions.setOffline;
actions["SET_PATREON"] = rendererSlice.actions.setPatreon;
actions["SET_POPUP"] = rendererSlice.actions.setPopup;
actions["SET_SHARE_DIALOG"] = rendererSlice.actions.setShareDialog;
actions["SET_SHARE_DIALOG_OPEN"] = rendererSlice.actions.setShareDialogOpen;
actions["SET_SHARE_DIALOG_URL"] = rendererSlice.actions.setShareDialogUrl;
actions["SET_SUBNAV"] = rendererSlice.actions.setSubNav;
actions["SET_TOPARTIST"] = rendererSlice.actions.setTopArtist;
actions["SET_TOPNAV"] = rendererSlice.actions.setTopNav;
actions["SET_UPDATE_STATE"] = rendererSlice.actions.setUpdateState;
actions["SET_SYNC_STATE"] = rendererSlice.actions.setSyncState;
actions["SET_TO_PUSH"] = rendererSlice.actions.setSyncToPush;
actions["SET_HOVER_IN"] = hoverSlice.actions.setHoverIn;
actions["SET_HOVER_OUT"] = hoverSlice.actions.setHoverOut;
actions["SET_CAN_LOGIN"] = loginSlice.actions.setCanLogin;
actions["SET_LOGIN_EMAIL"] = loginSlice.actions.setLoginEmail;
actions["SET_LOGIN_FORM"] = loginSlice.actions.setLoginForm;
actions["SET_LOGIN_PASSWORD"] = loginSlice.actions.setLoginPassword;
actions["SET_LOGIN_REMEMBER"] = loginSlice.actions.setLoginRemember;
actions["SET_LOGIN_STATE"] = loginSlice.actions.setLoginState;
actions["SET_HOME_DATA"] = homeSlice.actions.setHomeData;
actions["SET_BOOSTER_WIN_FACTOR"] = collectionSlice.actions.setBoosterWinFactor;
actions["SET_COUNT_MODE"] = collectionSlice.actions.setCountMode;
actions["SET_FUTURE_BOOSTERS"] = collectionSlice.actions.setFutureBoosters;
actions["SET_MYTHIC_DRAFT_FACTOR"] =
  collectionSlice.actions.setMythicDraftFactor;
actions["SET_RARE_DRAFT_FACTOR"] = collectionSlice.actions.setRareDraftFactor;
actions["SET_ACTIVE_EVENTS"] = exploreSlice.actions.setActiveEvents;
actions["SET_EXPLORE_DATA"] = exploreSlice.actions.setExploreData;
actions["SET_EXPLORE_FILTERS"] = exploreSlice.actions.setExploreFilters;
actions["SET_EXPLORE_FILTERS_SKIP"] =
  exploreSlice.actions.setExploreFiltersSkip;
actions["SET_MATCH"] = matchesSlice.actions.setMatch;
actions["SET_MANY_MATCHES"] = matchesSlice.actions.setManyMatches;
actions["SET_EVENT"] = eventsSlice.actions.setEvent;
actions["SET_MANY_EVENTS"] = eventsSlice.actions.setManyEvents;
actions["SET_PLAYERDB"] = playerDataSlice.actions.setPlayerDb;
actions["SET_APPDB"] = playerDataSlice.actions.setAppDb;
actions["SET_PLAYER_ID"] = playerDataSlice.actions.setPlayerId;
actions["SET_PLAYER_NAME"] = playerDataSlice.actions.setPlayerName;
actions["SET_ARENA_VERSION"] = playerDataSlice.actions.setArenaVersion;
actions["SET_PLAYER_ECONOMY"] = playerDataSlice.actions.setEconomy;
actions["SET_TAG_COLORS"] = playerDataSlice.actions.setTagColors;
actions["EDIT_TAG_COLOR"] = playerDataSlice.actions.editTagColor;
actions["SET_RANK"] = playerDataSlice.actions.setRank;
actions["ADD_CARD"] = playerDataSlice.actions.addCard;
actions["ADD_CARDS_LIST"] = playerDataSlice.actions.addCardsList;
actions["ADD_CARDS_KEYS"] = playerDataSlice.actions.addCardsKeys;
actions["ADD_CARDS_FROM_STORE"] = playerDataSlice.actions.addCardsFromStore;
actions["REMOVE_DECK_TAG"] = playerDataSlice.actions.removeDeckTag;
actions["ADD_DECK_TAG"] = playerDataSlice.actions.addDeckTag;
actions["SET_DECK_TAGS"] = playerDataSlice.actions.setDeckTags;
actions["SET_DECK"] = decksSlice.actions.setDeck;
actions["SET_MANY_DECKS"] = decksSlice.actions.setManyDecks;
actions["SET_MANY_STATIC_DECKS"] = decksSlice.actions.setManyStaticDecks;
actions["SET_ECONOMY"] = economySlice.actions.setEconomy;
actions["SET_MANY_ECONOMY"] = economySlice.actions.setManyEconomy;
actions["SET_DRAFT"] = draftsSlice.actions.setDraft;
actions["SET_MANY_DRAFT"] = draftsSlice.actions.setManyDrafts;
actions["SET_SEASONAL"] = seasonalSlice.actions.setSeasonal;
actions["SET_MANY_SEASONAL"] = seasonalSlice.actions.setManySeasonal;
actions["SET_DECK_CHANGE"] = deckChangesSlice.actions.setChange;
actions["SET_MANY_DECK_CHANGES"] = deckChangesSlice.actions.setManyChangees;

actions["RESET_CURRENT_GAME"] = currentMatchSlice.actions.resetCurrentGame;
actions["SET_CURRENT_MATCH_MANY"] = currentMatchSlice.actions.setMany;
actions["CLEAR_CARDS_CAST"] = currentMatchSlice.actions.clearCardsCast;
actions["SET_TURNINFO"] = currentMatchSlice.actions.setTurnInfo;
actions["SET_GAMEINFO"] = currentMatchSlice.actions.setGameInfo;
actions["SET_PLAYERS"] = currentMatchSlice.actions.setPlayers;
actions["SET_ZONE"] = currentMatchSlice.actions.setZone;
actions["SET_MANY_ZONES"] = currentMatchSlice.actions.setManyZones;
actions["SET_GAMEOBJ"] = currentMatchSlice.actions.setGameObject;
actions["SET_MANY_GAMEOBJ"] = currentMatchSlice.actions.setManyGameObjects;
actions["SET_ANNOTATION"] = currentMatchSlice.actions.setAnnotation;
actions["SET_MANY_ANNOTATIONS"] = currentMatchSlice.actions.setManyAnnotations;
actions["SET_ANNOTATION_PROC"] =
  currentMatchSlice.actions.setAnnotationProcessed;
actions["CLEAN_ANNOTATIONS"] =
  currentMatchSlice.actions.removeProcessedAnnotations;
actions["SET_IDCHANGE"] = currentMatchSlice.actions.setIdChange;
actions["SET_ONTHEPLAY"] = currentMatchSlice.actions.setOnThePlay;
actions["ADD_CARD_CAST"] = currentMatchSlice.actions.addCardCast;

export default actions;
