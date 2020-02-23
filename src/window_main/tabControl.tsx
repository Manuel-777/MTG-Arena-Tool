/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
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
  MAIN_LIMITED
} from "../shared/constants";

import pd from "../shared/player-data";
import Aggregator from "./aggregator";
import anime from "animejs";

import { ipcSend } from "./renderer-util";

import { openDecksTab } from "./DecksTab";
import { openMatchesTab } from "./MatchesTab";
import { openEventsTab } from "./EventsTab";
import { openEconomyTab } from "./EconomyTab";
//import { openExploreTab } from "./explore";
import { openCollectionTab } from "./collection/CollectionTab";
import { openSettingsTab } from "./settings";
import { openHomeTab } from "./HomeTab";
import { AppState } from "./app/ContextProvider";

function getFilters(id: number): any {
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

  return { filters: filters, sidebarActive: sidebarActive };
}

export function getOpenNav(appState: AppState): JSX.Element {
  const tab = appState.topNav;
  const { filters } = getFilters(tab);

  switch (tab) {
    case MAIN_DECKS:
      return openDecksTab(filters);
    case MAIN_MATCHES:
      return openMatchesTab(filters);
    case MAIN_EVENTS:
      return openEventsTab(filters);
    case MAIN_EXPLORE:
      return <></>; //openExploreTab();
    case MAIN_ECONOMY:
      return openEconomyTab();
    case MAIN_COLLECTION:
      return openCollectionTab();
    case MAIN_SETTINGS:
      return openSettingsTab();
    case MAIN_HOME: {
      return openHomeTab(appState.homeData);
    }
    default:
      break;
  }
  return <></>;
}

export function clickNav(id: number): void {
  document.body.style.cursor = "auto";
  anime({
    targets: ".moving_ux",
    left: 0,
    easing: EASING_DEFAULT,
    duration: 350
  });

  const { sidebarActive, filters } = getFilters(id);

  ipcSend("save_user_settings", {
    last_open_tab: sidebarActive,
    last_date_filter: filters.date,
    skipRefresh: true
  });
}

export function forceOpenAbout(): void {
  ipcSend("save_user_settings", {
    last_open_tab: MAIN_SETTINGS
  });
}

export function forceOpenSettings(section = -1): void {
  ipcSend("save_user_settings", {
    last_open_tab: MAIN_SETTINGS,
    last_settings_section: section
  });
}
