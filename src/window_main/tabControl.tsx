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
  MAIN_LIMITED,
  SUB_DECK,
  SUB_MATCH,
  SUB_DRAFT
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
import OfflineSplash from "./OfflineSplash";
import openDeckSub from "./components/deck-view/DeckVIew";

function getFilters(id: number): any {
  let filters = {
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

  return { filters: filters, sidebarActive: sidebarActive };
}

export function getOpenNav(tab: number, offline: boolean): JSX.Element {
  const { filters } = getFilters(tab);

  if (offline == true && (tab == MAIN_HOME || tab == MAIN_EXPLORE)) {
    return <OfflineSplash />;
  }

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
    case MAIN_HOME:
      return openHomeTab();
    default:
      break;
  }
  return <></>;
}

export function getOpenSub(subNav: number, id: string): JSX.Element {
  switch (subNav) {
    case SUB_DECK:
      return openDeckSub(id);
    /*
    case SUB_MATCH:
      return openMatchSub(id);
    case SUB_DRAFT:
      return openDraftSub(id);
    */
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
  if (section == -1) {
    ipcSend("save_user_settings", {
      last_open_tab: MAIN_SETTINGS
    });
  } else {
    ipcSend("save_user_settings", {
      last_open_tab: MAIN_SETTINGS,
      last_settings_section: section
    });
  }
}
