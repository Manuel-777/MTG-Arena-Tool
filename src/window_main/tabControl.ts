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
  SETTINGS_ABOUT
} from "../shared/constants";

import pd from "../shared/player-data";
import Aggregator from "./aggregator";
import anime from "animejs";

import { ipcSend, getLocalState, setLocalState } from "./renderer-util";

import { openDecksTab } from "./DecksTab";
import { openMatchesTab } from "./MatchesTab";
import { openEventsTab } from "./EventsTab";
import { openEconomyTab } from "./EconomyTab";
import { openExploreTab } from "./explore";
import { openCollectionTab } from "./collection/CollectionTab";
import { showOfflineSplash } from "./renderer-util";
import { openSettingsTab } from "./settings";
import { openHomeTab } from "./HomeTab";

export function openTab(tab: number, filters = {}): void {
  switch (tab) {
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
        showOfflineSplash();
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
        showOfflineSplash();
      } else {
        if (getLocalState().discordTag === null) {
          openHomeTab([], "", 0);
        } else {
          ipcSend("request_home", "");
        }
      }
      break;
    default:
      break;
  }
}

export function clickNav(id: number): void {
  document.body.style.cursor = "auto";
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: EASING_DEFAULT,
    duration: 350
  });
  let filters = {
    date: pd.settings.last_date_filter,
    eventId: "All Events",
    rankedMode: false
  };
  let sidebarActive = id;

  if (id === MAIN_CONSTRUCTED) {
    sidebarActive = MAIN_MATCHES;
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: DATE_SEASON,
      eventId: Aggregator.RANKED_CONST,
      rankedMode: true
    };
  }
  if (id === MAIN_LIMITED) {
    sidebarActive = MAIN_MATCHES;
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: DATE_SEASON,
      eventId: Aggregator.RANKED_DRAFT,
      rankedMode: true
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

export function forceOpenAbout(): void {
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: EASING_DEFAULT,
    duration: 350
  });

  ipcSend("save_user_settings", {
    last_open_tab: MAIN_SETTINGS
  });

  openSettingsTab(SETTINGS_ABOUT);
}

export function forceOpenSettings(section = -1): void {
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: EASING_DEFAULT,
    duration: 350
  });

  ipcSend("save_user_settings", {
    last_open_tab: MAIN_SETTINGS
  });

  openSettingsTab(section);
}
