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

function openDeckDetails(id: string, filters: AggregatorFilters): void {
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
  if (tag === "Add") return;
  if (deck.tags && deck.tags.includes(tag)) return;
  ipcSend("add_tag", { deckid, tag });
}

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function deleteTag(deckid: string, tag: string): void {
  const deck = pd.deck(deckid);
  if (!deck || !tag) return;
  if (!deck.tags || !deck.tags.includes(tag)) return;
  ipcSend("delete_tag", { deckid, tag });
}

function toggleDeckArchived(id: string): void {
  ipcSend("toggle_deck_archived", id);
}

function saveUserState(state: DecksTableState): void {
  ipcSend("save_user_settings", {
    decksTableState: state,
    decksTableMode: state.decksTableMode,
    skip_refresh: true
  });
}

function updateStatsPanel(
  container: HTMLElement,
  aggregator: Aggregator
): void {
  container.innerHTML = "";
  const statsPanel = new StatsPanel(
    "decks_top",
    aggregator,
    pd.settings.right_panel_width,
    true
  );
  const statsPanelDiv = statsPanel.render();
  statsPanelDiv.style.display = "flex";
  statsPanelDiv.style.flexDirection = "column";
  statsPanelDiv.style.marginTop = "16px";
  statsPanelDiv.style.padding = "12px";
  const drag = createDiv(["dragger"]);
  container.appendChild(drag);
  makeResizable(drag, statsPanel.handleResize);
  container.appendChild(statsPanelDiv);
}

function getDecksData(aggregator: any): DecksData[] {
  return pd.deckList.map(
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
}

export function DecksTab({
  aggFiltersArg
}: {
  aggFiltersArg: AggregatorFilters;
}): JSX.Element {
  const {
    decksTableMode,
    decksTableState,
    last_date_filter: dateFilter,
    right_panel_width: panelWidth
  } = pd.settings;
  const showArchived = decksTableState?.filters?.archivedCol !== "hideArchived";
  const defaultAggFilters = {
    ...Aggregator.getDefaultFilters(),
    date: dateFilter,
    ...aggFiltersArg,
    showArchived
  };
  const [aggFilters, setAggFilters] = React.useState(
    defaultAggFilters as AggregatorFilters
  );
  const data = React.useMemo(() => {
    const aggregator = new Aggregator(aggFilters);
    return getDecksData(aggregator);
  }, [aggFilters]);

  const sidePanelWidth = panelWidth + "px";
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const filterDecksCallback = React.useCallback(
    (deckId?: string | string[]): void => {
      if (rightPanelRef?.current) {
        updateStatsPanel(
          rightPanelRef.current,
          new Aggregator({ ...aggFilters, deckId })
        );
      }
    },
    [rightPanelRef, aggFilters]
  );
  const openDeckCallback = React.useCallback(
    (id: string): void => openDeckDetails(id, aggFilters),
    [aggFilters]
  );
  return (
    <>
      <div
        className={"wrapper_column"}
        style={{
          overflowX: "auto"
        }}
      >
        <DecksTable
          data={data}
          filters={aggFilters}
          cachedState={decksTableState}
          cachedTableMode={decksTableMode}
          filterMatchesCallback={setAggFilters}
          tableStateCallback={saveUserState}
          filterDecksCallback={filterDecksCallback}
          openDeckCallback={openDeckCallback}
          archiveDeckCallback={toggleDeckArchived}
          tagDeckCallback={addTag}
          editTagCallback={editTag}
          deleteTagCallback={deleteTag}
        />
      </div>
      <div
        ref={rightPanelRef}
        className={"wrapper_column sidebar_column_l"}
        style={{
          width: sidePanelWidth,
          flex: `0 0 ${sidePanelWidth}`
        }}
      ></div>
    </>
  );
}

export function openDecksTab(aggFilters: AggregatorFilters = {}): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mainDiv.classList.add("flex_item");
  mountReactComponent(<DecksTab aggFiltersArg={aggFilters} />, mainDiv);
}
