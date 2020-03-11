/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import {
  DATE_SEASON,
  MAIN_COLLECTION,
  MAIN_CONSTRUCTED,
  MAIN_DECKS,
  MAIN_ECONOMY,
  MAIN_EVENTS,
  MAIN_EXPLORE,
  MAIN_HOME,
  MAIN_LIMITED,
  MAIN_MATCHES,
  MAIN_SETTINGS,
  SUB_DECK,
  SUB_DRAFT,
  SUB_MATCH,
  IPC_MAIN
} from "../shared/constants";
import Aggregator from "./aggregator";
import CollectionTab from "./collection/CollectionTab";
import openDeckSub from "./components/deck-view/DeckVIew";
import openDraftSub from "./components/draft-view/DraftVIew";
import openMatchSub from "./components/match-view/MatchView";
import DecksTab from "./DecksTab";
import EconomyTab from "./EconomyTab";
import EventsTab from "./EventsTab";
import ExploreTab from "./ExploreTab";
import HomeTab from "./HomeTab";
import MatchesTab from "./MatchesTab";
import OfflineSplash from "./OfflineSplash";
import { ipcSend } from "./renderer-util";
import SettingsTab from "./settings";

export function getOpenNav(tab: number, offline: boolean): JSX.Element {
  if (offline == true && (tab == MAIN_HOME || tab == MAIN_EXPLORE)) {
    return <OfflineSplash />;
  }
  const newSettings: Record<string, any> = {
    last_open_tab: tab,
    skipRefresh: true
  };
  if ([MAIN_CONSTRUCTED, MAIN_LIMITED].includes(tab)) {
    newSettings.last_date_filter = DATE_SEASON;
  }
  ipcSend("save_user_settings", newSettings);
  switch (tab) {
    case MAIN_DECKS:
      return <DecksTab />;
    case MAIN_CONSTRUCTED:
      return (
        <MatchesTab
          aggFiltersArg={{
            date: DATE_SEASON,
            eventId: Aggregator.RANKED_CONST
          }}
        />
      );
    case MAIN_LIMITED:
      return (
        <MatchesTab
          aggFiltersArg={{
            date: DATE_SEASON,
            eventId: Aggregator.RANKED_DRAFT
          }}
        />
      );
    case MAIN_MATCHES:
      return <MatchesTab />;
    case MAIN_EVENTS:
      return (
        <EventsTab aggFiltersArg={{ eventId: Aggregator.ALL_EVENT_TRACKS }} />
      );
    case MAIN_EXPLORE:
      return <ExploreTab />;
    case MAIN_ECONOMY:
      return <EconomyTab />;
    case MAIN_COLLECTION:
      return <CollectionTab />;
    case MAIN_SETTINGS:
      return <SettingsTab />;
    case MAIN_HOME:
      return <HomeTab />;
    default:
      return <div className="ux_item" />;
  }
}

export function getOpenSub(
  subNav: number,
  id: string,
  data?: any
): JSX.Element {
  switch (subNav) {
    case SUB_DECK:
      return openDeckSub(id, data);
    case SUB_MATCH:
      return openMatchSub(id);
    case SUB_DRAFT:
      return openDraftSub(id);
    default:
      return <></>;
  }
}

export function forceOpenAbout(): void {
  ipcSend("force_open_about", undefined, IPC_MAIN);
}

export function forceOpenSettings(section = -1): void {
  ipcSend("force_open_settings", section, IPC_MAIN);
}
