/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Aggregator from "./aggregator";
import openDeckSub from "./components/deck-view/DeckVIew";
import openDraftSub from "./components/draft-view/DraftVIew";
import openMatchSub from "./components/match-view/MatchView";

import CollectionTab from "./tabs/CollectionTab";
import DecksTab from "./tabs/DecksTab";
import EconomyTab from "./tabs/EconomyTab";
import EventsTab from "./tabs/EventsTab";
import ExploreTab from "./tabs/ExploreTab";
import CardsTab from "./tabs/CardsTab";
import HomeTab from "./tabs/HomeTab";
import MatchesTab from "./tabs/MatchesTab";
import TimelineTab from "./tabs/TimelineTab";
import OfflineSplash from "./components/main/OfflineSplash";
import { ipcSend } from "./ipcSend";
import SettingsTab from "./tabs/SettingsTab";
import store from "../shared/redux/stores/rendererStore";
import { reduxAction } from "../shared/redux/sharedRedux";
import { constants } from "mtgatool-shared";
const {
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
  MAIN_TIMELINE,
  SUB_DECK,
  SUB_DRAFT,
  SUB_MATCH,
  IPC_RENDERER,
  IPC_ALL,
} = constants;

const MAIN_CARDS = 15;

import appCss from "./app/app.css";

export function getOpenNav(tab: number, offline: boolean): JSX.Element {
  if (offline == true && (tab == MAIN_HOME || tab == MAIN_EXPLORE)) {
    return <OfflineSplash />;
  }
  const newSettings: Record<string, any> = {
    last_open_tab: tab,
  };
  if ([MAIN_CONSTRUCTED, MAIN_LIMITED].includes(tab)) {
    newSettings.last_date_filter = DATE_SEASON;
  }
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: newSettings },
    IPC_ALL ^ IPC_RENDERER
  );

  switch (tab) {
    case MAIN_DECKS:
      return <DecksTab />;
    case MAIN_CONSTRUCTED:
      return (
        <MatchesTab
          aggFiltersArg={{
            date: DATE_SEASON,
            eventId: Aggregator.RANKED_CONST,
          }}
        />
      );
    case MAIN_LIMITED:
      return (
        <MatchesTab
          aggFiltersArg={{
            date: DATE_SEASON,
            eventId: Aggregator.RANKED_DRAFT,
          }}
        />
      );
    case MAIN_MATCHES:
      return <MatchesTab />;
    case MAIN_EVENTS:
      return (
        <EventsTab aggFiltersArg={{ eventId: Aggregator.ALL_EVENT_TRACKS }} />
      );
    case MAIN_TIMELINE:
      return <TimelineTab />;
    case MAIN_EXPLORE:
      return <ExploreTab />;
    case MAIN_CARDS:
      return <CardsTab />;
    case MAIN_ECONOMY:
      return <EconomyTab />;
    case MAIN_COLLECTION:
      return <CollectionTab />;
    case MAIN_SETTINGS:
      return <SettingsTab />;
    case MAIN_HOME:
      return <HomeTab />;
    default:
      return <div className={appCss.uxItem} />;
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
  ipcSend("force_open_about", undefined, IPC_RENDERER);
}

export function forceOpenSettings(section = -1): void {
  ipcSend("force_open_settings", section, IPC_RENDERER);
}
