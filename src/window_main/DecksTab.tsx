import anime from "animejs";
import React from "react";

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
  resetMainContainer,
  setLocalState,
  getLocalState
} from "./renderer-util";
import mountReactComponent from "./mountReactComponent";
import DecksTable, {
  DeckStats,
  DecksData
} from "./components/decks/DecksTable";

let filters = Aggregator.getDefaultFilters();
filters.onlyCurrentDecks = true;
filters.showArchived = true;
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

function setFilters(selected: any = {}): void {
  if (selected.eventId || selected.date) {
    // clear all dependent filters
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: filters.date,
      eventId: filters.eventId,
      onlyCurrentDecks: true,
      showArchived: filters.showArchived,
      ...selected
    };
  } else {
    // default case
    filters = { ...filters, date: pd.settings.last_date_filter, ...selected };
  }
}

//
export function openDecksTab(_filters = {}): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mainDiv.classList.add("flex_item");
  setFilters(_filters);

  const wrapR = createDiv(["wrapper_column", "sidebar_column_l"]);
  wrapR.style.width = pd.settings.right_panel_width + "px";
  wrapR.style.flex = `0 0 ${pd.settings.right_panel_width}px`;
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

  const d = createDiv(["list_fill"]);
  wrapL.appendChild(d);

  mainDiv.appendChild(wrapL);
  mainDiv.appendChild(wrapR);

  const decks: SerializedDeck[] = [...pd.deckList];

  const isDeckVisible = (deck: SerializedDeck): boolean =>
    aggregator.filterDeck(deck) &&
    (filters.eventId === Aggregator.DEFAULT_EVENT ||
      (deck.id && aggregator.deckLastPlayed[deck.id]));
  const visibleDecks = decks.filter(isDeckVisible);

  const data = visibleDecks.map(
    (deck: SerializedDeck): DecksData => {
      const id = deck.id || "";
      const colorSortVal = deck.colors ? deck.colors.join("") : "";
      // compute winrate metrics
      const deckStats: DeckStats =
        aggregator.deckStats[id] || getDefaultStats();
      const avgDuration = Math.round(deckStats.duration / deckStats.total);
      const recentStats: DeckStats =
        aggregator.deckRecentStats[id] || getDefaultStats();
      // compute missing card metrics
      const missingWildcards = getDeckMissing(deck);
      const boosterCost = getBoosterCountEstimate(missingWildcards);
      // compute last touch metrics
      const lastUpdated = new Date(deck.lastUpdated || NaN);
      const lastPlayed = new Date(aggregator.deckLastPlayed[id]);
      const lastTouched = dateMaxValid(lastUpdated, lastPlayed);
      return {
        ...deck,
        ...deckStats,
        avgDuration,
        ...missingWildcards,
        boosterCost,
        colorSortVal,
        lastPlayed,
        lastTouched,
        lastEditWins: recentStats.wins,
        lastEditLosses: recentStats.losses,
        lastEditTotal: recentStats.total,
        lastEditWinrate: recentStats.winrate
      };
    }
  );

  const deckTableWrapper = createDiv([]);
  const { decksTable } = getLocalState();
  mountReactComponent(
    <DecksTable
      data={data}
      filters={filters}
      cachedState={decksTable}
      filterMatchesCallback={openDecksTab}
      tableStateCallback={(state: any): void =>
        setLocalState({ decksTable: state })
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
    deckTableWrapper
  );
  wrapL.appendChild(deckTableWrapper);
}

function openDeckCallback(id: string, filters: any): void {
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
