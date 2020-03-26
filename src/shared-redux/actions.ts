import {
  SET_SETTINGS,
  SET_ARCHIVED,
  SET_BACK_COLOR,
  SET_BACK_GRPID,
  SET_BACK_IMAGE,
  SET_LOADING,
  SET_NO_LOG,
  SET_OFFLINE,
  SET_PATREON,
  SET_POPUP,
  SET_SHARE_DIALOG,
  SET_SHARE_DIALOG_OPEN,
  SET_SHARE_DIALOG_URL,
  SET_SUBNAV,
  SET_TOPARTIST,
  SET_TOPNAV,
  SET_UPDATE_STATE,
  SET_HOVER_IN,
  SET_HOVER_OUT,
  SET_HOVER_SIZE,
  SET_CAN_LOGIN,
  SET_LOGIN_EMAIL,
  SET_LOGIN_FORM,
  SET_LOGIN_PASSWORD,
  SET_LOGIN_REMEMBER,
  SET_LOGIN_STATE,
  SET_HOME_DATA,
  SET_BOOSTER_WIN_FACTOR,
  SET_COUNT_MODE,
  SET_FUTURE_BOOSTERS,
  SET_MYTHIC_DRAFT_FACTOR,
  SET_RARE_DRAFT_FACTOR,
  SET_ACTIVE_EVENTS,
  SET_EXPLORE_DATA,
  SET_EXPLORE_FILTERS,
  SET_EXPLORE_FILTERS_SKIP
} from "./constants";

import settingsSlice from "./slices/settingsSlice";
import rendererSlice from "./slices/rendererSlice";
import hoverSlice from "./slices/hoverSlice";
import loginSlice from "./slices/loginSlice";
import homeSlice from "./slices/homeSlice";
import collectionSlice from "./slices/collectionSlice";
import exploreSlice from "./slices/exploreSlice";

const actions: Record<string, (arg: any) => any> = {};
actions[SET_SETTINGS] = settingsSlice.actions.setSettings;
actions[SET_ARCHIVED] = rendererSlice.actions.setArchived;
actions[SET_BACK_COLOR] = rendererSlice.actions.setBackgroundColor;
actions[SET_BACK_GRPID] = rendererSlice.actions.setBackgroundGrpId;
actions[SET_BACK_IMAGE] = rendererSlice.actions.setBackgroundImage;
actions[SET_LOADING] = rendererSlice.actions.setLoading;
actions[SET_NO_LOG] = rendererSlice.actions.setNoLog;
actions[SET_OFFLINE] = rendererSlice.actions.setOffline;
actions[SET_PATREON] = rendererSlice.actions.setPatreon;
actions[SET_POPUP] = rendererSlice.actions.setPopup;
actions[SET_SHARE_DIALOG] = rendererSlice.actions.setShareDialog;
actions[SET_SHARE_DIALOG_OPEN] = rendererSlice.actions.setShareDialogOpen;
actions[SET_SHARE_DIALOG_URL] = rendererSlice.actions.setShareDialogUrl;
actions[SET_SUBNAV] = rendererSlice.actions.setSubNav;
actions[SET_TOPARTIST] = rendererSlice.actions.setTopArtist;
actions[SET_TOPNAV] = rendererSlice.actions.setTopNav;
actions[SET_UPDATE_STATE] = rendererSlice.actions.setUpdateState;
actions[SET_HOVER_IN] = hoverSlice.actions.setHoverIn;
actions[SET_HOVER_OUT] = hoverSlice.actions.setHoverOut;
actions[SET_HOVER_SIZE] = hoverSlice.actions.setHoverSize;
actions[SET_CAN_LOGIN] = loginSlice.actions.setCanLogin;
actions[SET_LOGIN_EMAIL] = loginSlice.actions.setLoginEmail;
actions[SET_LOGIN_FORM] = loginSlice.actions.setLoginForm;
actions[SET_LOGIN_PASSWORD] = loginSlice.actions.setLoginPassword;
actions[SET_LOGIN_REMEMBER] = loginSlice.actions.setLoginRemember;
actions[SET_LOGIN_STATE] = loginSlice.actions.setLoginState;
actions[SET_HOME_DATA] = homeSlice.actions.setHomeData;
actions[SET_BOOSTER_WIN_FACTOR] = collectionSlice.actions.setBoosterWinFactor;
actions[SET_COUNT_MODE] = collectionSlice.actions.setCountMode;
actions[SET_FUTURE_BOOSTERS] = collectionSlice.actions.setFutureBoosters;
actions[SET_MYTHIC_DRAFT_FACTOR] = collectionSlice.actions.setMythicDraftFactor;
actions[SET_RARE_DRAFT_FACTOR] = collectionSlice.actions.setRareDraftFactor;
actions[SET_ACTIVE_EVENTS] = exploreSlice.actions.setActiveEvents;
actions[SET_EXPLORE_DATA] = exploreSlice.actions.setExploreData;
actions[SET_EXPLORE_FILTERS] = exploreSlice.actions.setExploreFilters;
actions[SET_EXPLORE_FILTERS_SKIP] = exploreSlice.actions.setExploreFiltersSkip;

export default actions;
