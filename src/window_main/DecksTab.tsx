import anime from "animejs";
import React from "react";
import isValid from "date-fns/isValid";

import { EASING_DEFAULT } from "../shared/constants";
import pd from "../shared/player-data";
import { createDiv } from "../shared/dom-fns";
import {
  get_deck_missing as getDeckMissing,
  getBoosterCountEstimate,
  getReadableFormat
} from "../shared/util";
import { SerializedDeck } from "../shared/types/Deck";

import Aggregator, { dateMaxValid } from "./aggregator";
import StatsPanel from "./stats-panel";
import { openDeck } from "./deck-details";
import {
  hideLoadingBars,
  ipcSend,
  makeResizable,
  resetMainContainer
} from "./renderer-util";
import mountReactComponent from "./mountReactComponent";

import DecksTable from "./components/decks/DecksTable";
import {
  DeckStats,
  DecksData,
  AggregatorFilters,
  DecksTableState
} from "./components/decks/types";

let filters: AggregatorFilters = Aggregator.getDefaultFilters();
filters.onlyCurrentDecks = true;
const tagPrompt = "Add";

function getDefaultStats(): DeckStats {
  return {
    wins: 0,
    losses: 0,
    total: 0,
    duration: 0,
    winrate: 0,
    interval: 0,
    winrateLow: 0,
    winrateHigh: 0
  };
}

function setFilters(selected: AggregatorFilters = {}): void {
  const { decksTableState } = pd.settings;
  const showArchived = decksTableState?.filters?.archivedCol !== "hideArchived";

  if (selected.date) {
    // clear all dependent filters
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: filters.date,
      onlyCurrentDecks: true,
      ...selected,
      showArchived
    };
  } else {
    // default case
    filters = {
      ...filters,
      date: pd.settings.last_date_filter,
      ...selected,
      showArchived
    };
  }
}

export function openDecksTab(newFilters: AggregatorFilters = {}): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mainDiv.classList.add("flex_item");
  setFilters(newFilters);

  const wrapR = createDiv(["wrapper_column", "sidebar_column_l"]);
  wrapR.style.width = pd.settings.right_panel_width + "px";
  wrapR.style.flex = `0 0 ${wrapR.style.width}`;
  const aggregator: any = new Aggregator(filters);
  const statsPanel = new StatsPanel(
    "decks_top",
    aggregator,
    pd.settings.right_panel_width,
    true
  );
  const decksTopWinrate = statsPanel.render();
  decksTopWinrate.style.display = "flex";
  decksTopWinrate.style.flexDirection = "column";
  decksTopWinrate.style.marginTop = "16px";
  decksTopWinrate.style.padding = "12px";

  const drag = createDiv(["dragger"]);
  wrapR.appendChild(drag);
  makeResizable(drag, statsPanel.handleResize);
  wrapR.appendChild(decksTopWinrate);
  const wrapL = createDiv(["wrapper_column"]);
  wrapL.style.overflowX = "auto";
  mainDiv.appendChild(wrapL);
  mainDiv.appendChild(wrapR);

  const data = pd.deckList.map(
    (deck: SerializedDeck): DecksData => {
      const id = deck.id ?? "";
      const archivedSortVal = deck.archived ? 1 : deck.custom ? 0.5 : 0;
      const colorSortVal = deck.colors ? deck.colors.join("") : "";
      // compute winrate metrics
      const deckStats: DeckStats =
        aggregator.deckStats[id] ?? getDefaultStats();
      const avgDuration = Math.round(deckStats.duration / deckStats.total);
      const recentStats: DeckStats =
        aggregator.deckRecentStats[id] ?? getDefaultStats();
      const winrate100 = Math.round(deckStats.winrate * 100);
      // compute missing card metrics
      const missingWildcards = getDeckMissing(deck);
      const boosterCost = getBoosterCountEstimate(missingWildcards);
      // compute last touch metrics
      const lastUpdated = new Date(deck.lastUpdated ?? NaN);
      const lastPlayed = aggregator.deckLastPlayed[id];
      const lastTouched = dateMaxValid(lastUpdated, lastPlayed);
      return {
        ...deck,
        ...deckStats,
        winrate100,
        avgDuration,
        ...missingWildcards,
        boosterCost,
        archivedSortVal,
        colorSortVal,
        timeUpdated: isValid(lastUpdated) ? lastUpdated.getTime() : NaN,
        timePlayed: isValid(lastPlayed) ? lastPlayed.getTime() : NaN,
        timeTouched: isValid(lastTouched) ? lastTouched.getTime() : NaN,
        lastEditWins: recentStats.wins,
        lastEditLosses: recentStats.losses,
        lastEditTotal: recentStats.total,
        lastEditWinrate: recentStats.winrate
      };
    }
  );

  const { decksTableState } = pd.settings;
  mountReactComponent(
    <DecksTable
      data={data}
      filters={filters}
      cachedState={decksTableState}
      filterMatchesCallback={openDecksTab}
      tableStateCallback={(state: DecksTableState): void =>
        ipcSend("save_user_settings", {
          decksTableState: state,
          skip_refresh: true
        })
      }
      openDeckCallback={(id: string): void => openDeckCallback(id, filters)}
      archiveDeckCallback={(id: string): void =>
        ipcSend("toggle_deck_archived", id)
      }
      tagDeckCallback={addTag}
      editTagCallback={(tag: string, color: string): void =>
        ipcSend("edit_tag", { tag, color })
      }
      deleteTagCallback={deleteTag}
    />,
    wrapL
  );
}

function openDeckCallback(id: string, filters: AggregatorFilters): void {
  const deck = pd.deck(id);
  if (!deck) return;
  openDeck(deck, { ...filters, deckId: id });
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

function addTag(deckid: string, tag: string): void {
  const deck = pd.deck(deckid);
  if (!deck || !tag) return;
  if (getReadableFormat(deck.format) === tag) return;
  if (tag === tagPrompt) return;
  if (deck.tags && deck.tags.includes(tag)) return;

  ipcSend("add_tag", { deckid, tag });
}

function deleteTag(deckid: string, tag: string): void {
  const deck = pd.deck(deckid);
  if (!deck || !tag) return;
  if (!deck.tags || !deck.tags.includes(tag)) return;

  ipcSend("delete_tag", { deckid, tag });
}
