import {
  EASING_DEFAULT,
  DATE_SEASON,
  MAIN_HOME,
  MAIN_DECKS,
  MAIN_MATCHES,
  MAIN_EVENTS,
  MAIN_EXPLORE,
  MAIN_ECONOMY,
  MAIN_COLLECTION,
  MAIN_SETTINGS,
  MAIN_CONSTRUCTED,
  MAIN_LIMITED,
  MAIN_OFFLINE,
  SETTINGS_ABOUT
} from "../shared/constants";

import { updateTopBar } from "./topNav";
import pd from "../shared/player-data";
import Aggregator, { AggregatorFilters } from "./aggregator";
import anime from "animejs";

import {
  changeBackground,
  ipcSend,
  getLocalState,
  setLocalState,
  hideLoadingBars,
  resetMainContainer,
  showLoadingBars
} from "./renderer-util";

import { openDecksTab } from "./DecksTab";
import { openMatchesTab } from "./MatchesTab";
import { openEventsTab } from "./EventsTab";
import { openEconomyTab } from "./EconomyTab";
import { openExploreTab } from "./explore";
import { openCollectionTab } from "./collection/CollectionTab";
import { openSettingsTab } from "./settings";
import { openHomeTab } from "./HomeTab";
import { openOfflineSplash } from "./OfflineSplash";

export function openTab(tab: number, filters = {}): void {
  showLoadingBars();
  resetMainContainer();
  switch (tab) {
    case MAIN_OFFLINE:
      openOfflineSplash();
      break;
    case MAIN_DECKS:
      openDecksTab(filters);
      break;
    case MAIN_MATCHES:
      openMatchesTab(filters);
      break;
    case MAIN_EVENTS:
      openEventsTab(filters);
      break;
    case MAIN_EXPLORE:
      if (pd.offline) {
        openOfflineSplash();
      } else {
        openExploreTab();
      }
      break;
    case MAIN_ECONOMY:
      openEconomyTab();
      break;
    case MAIN_COLLECTION:
      openCollectionTab();
      break;
    case MAIN_SETTINGS:
      openSettingsTab(-1);
      break;
    case MAIN_HOME:
      if (pd.offline) {
        openOfflineSplash();
      } else {
        if (getLocalState().discordTag === null) {
          openHomeTab([], "", 0);
        } else {
          ipcSend("request_home", "");
        }
      }
      break;
    default:
      hideLoadingBars();
      //$$(".init_loading")[0].style.display = "block";
      break;
  }
}

export function clickNav(id: number): void {
  changeBackground("default");
  document.body.style.cursor = "auto";
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: EASING_DEFAULT,
    duration: 350
  });
  let filters: AggregatorFilters = {
    date: pd.settings.last_date_filter,
    eventId: "All Events"
  };
  let sidebarActive = id;

  if (id === MAIN_CONSTRUCTED) {
    sidebarActive = MAIN_MATCHES;
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: DATE_SEASON,
      eventId: Aggregator.RANKED_CONST
    };
  }
  if (id === MAIN_LIMITED) {
    sidebarActive = MAIN_MATCHES;
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: DATE_SEASON,
      eventId: Aggregator.RANKED_DRAFT
    };
  }

  setLocalState({ lastDataIndex: 0, lastScrollTop: 0 });
  openTab(sidebarActive, filters);
  ipcSend("save_user_settings", {
    last_open_tab: sidebarActive,
    last_date_filter: filters.date,
    skipRefresh: true
  });
}

export function forceOpenSettings(section = -1): void {
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: EASING_DEFAULT,
    duration: 350
  });
  ipcSend("save_user_settings", {
    last_open_tab: MAIN_SETTINGS,
    skipRefresh: true
  });
  openSettingsTab(section);
  updateTopBar();
}

export function forceOpenAbout(): void {
  forceOpenSettings(SETTINGS_ABOUT);
}
