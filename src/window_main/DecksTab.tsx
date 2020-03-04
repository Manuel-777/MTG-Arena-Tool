import anime from "animejs";
import isValid from "date-fns/isValid";
import React from "react";
import { TableState } from "react-table";
import { EASING_DEFAULT, SUB_DECK } from "../shared/constants";
import { createDiv } from "../shared/dom-fns";
import pd from "../shared/PlayerData";
import { InternalDeck } from "../types/Deck";
import {
  getBoosterCountEstimate,
  getReadableFormat,
  get_deck_missing as getDeckMissing
} from "../shared/util";
import Aggregator, {
  AggregatorFilters,
  AggregatorStats,
  dateMaxValid
} from "./aggregator";
import DecksTable from "./components/decks/DecksTable";
import { DecksData } from "./components/decks/types";
import { isHidingArchived } from "./components/tables/filters";
import {
  useAggregatorAndSidePanel,
  useLastScrollTop
} from "./components/tables/hooks";
import { ipcSend, makeResizable } from "./renderer-util";
import StatsPanel from "./stats-panel";
import { dispatchAction, SET_SUB_NAV } from "./app/reducers";
import { useDispatch } from "react-redux";
import Deck from "../shared/deck";

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

function toggleDeckArchived(id: string | number): void {
  ipcSend("toggle_deck_archived", id + "");
}

function saveTableState(decksTableState: TableState<DecksData>): void {
  ipcSend("save_user_settings", { decksTableState, skipRefresh: true });
}

function saveTableMode(decksTableMode: string): void {
  ipcSend("save_user_settings", { decksTableMode, skipRefresh: true });
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

function getDecksData(aggregator: Aggregator): DecksData[] {
  return pd.deckList.map(
    (deck: InternalDeck): DecksData => {
      const id = deck.id ?? "";
      const name = (deck.name ?? "").replace("?=?Loc/Decks/Precon/", "");
      const archivedSortVal = deck.archived ? 1 : deck.custom ? 0.5 : 0;
      const colorSortVal = deck.colors?.join("") ?? "";
      // compute winrate metrics
      const deckStats: AggregatorStats =
        aggregator.deckStats[id] ?? Aggregator.getDefaultStats();
      const recentStats: AggregatorStats =
        aggregator.deckRecentStats[id] ?? Aggregator.getDefaultStats();
      const winrate100 = Math.round(deckStats.winrate * 100);
      // compute missing card metrics
      const missingWildcards = getDeckMissing(new Deck(deck));
      const boosterCost = getBoosterCountEstimate(missingWildcards);
      // compute last touch metrics
      const lastUpdated = new Date(deck.lastUpdated ?? NaN);
      const lastPlayed = aggregator.deckLastPlayed[id];
      const lastTouched = dateMaxValid(lastUpdated, lastPlayed);
      return {
        ...deck,
        name,
        format: getReadableFormat(deck.format),
        ...deckStats,
        winrate100,
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

function getTotalAggEvents(): string[] {
  const totalAgg = new Aggregator();
  return totalAgg.events;
}

export function DecksTab({
  aggFiltersArg
}: {
  aggFiltersArg: AggregatorFilters;
}): JSX.Element {
  const dispatcher = useDispatch();
  const { decksTableMode, decksTableState } = pd.settings;
  const showArchived = !isHidingArchived(decksTableState);
  const getDataAggFilters = (data: DecksData[]): AggregatorFilters => {
    const deckId = data.map(deck => deck.id).filter(id => id) as string[];
    return { deckId };
  };
  const {
    aggFilters,
    data,
    filterDataCallback,
    rightPanelRef,
    setAggFilters,
    sidePanelWidth
  } = useAggregatorAndSidePanel({
    aggFiltersArg,
    getData: getDecksData,
    getDataAggFilters,
    showArchived,
    updateSidebarCallback: updateStatsPanel
  });
  const openDeckCallback = React.useCallback(
    (id: string | number): void => {
      anime({
        targets: ".moving_ux",
        left: "-100%",
        easing: EASING_DEFAULT,
        duration: 350
      });
      dispatchAction(dispatcher, SET_SUB_NAV, {
        type: SUB_DECK,
        id: id,
        data: null
      });
    },
    [dispatcher]
  );
  const events = React.useMemo(getTotalAggEvents, []);
  const [containerRef, onScroll] = useLastScrollTop();

  return (
    <>
      <div className={"wrapper_column"} ref={containerRef} onScroll={onScroll}>
        <DecksTable
          data={data}
          aggFilters={aggFilters}
          events={events}
          cachedState={decksTableState}
          cachedTableMode={decksTableMode}
          setAggFiltersCallback={setAggFilters}
          tableModeCallback={saveTableMode}
          tableStateCallback={saveTableState}
          filterDataCallback={filterDataCallback}
          openDeckCallback={openDeckCallback}
          archiveCallback={toggleDeckArchived}
          addTagCallback={addTag}
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

export function openDecksTab(aggFilters: AggregatorFilters = {}): JSX.Element {
  return <DecksTab aggFiltersArg={aggFilters} />;
}
