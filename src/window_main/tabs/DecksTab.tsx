import isValid from "date-fns/isValid";
import React from "react";
import { useDispatch } from "react-redux";
import Deck from "../../shared/deck";
import pd from "../../shared/PlayerData";
import { decksSlice } from "../../shared/redux/reducers";
import {
  getBoosterCountEstimate,
  getReadableFormat,
  get_deck_missing as getDeckMissing
} from "../../shared/util";
import { InternalDeck } from "../../types/Deck";
import Aggregator, {
  AggregatorFilters,
  AggregatorStats,
  dateMaxValid
} from "../aggregator";
import DecksTable from "../components/decks/DecksTable";
import { DecksData } from "../components/decks/types";
import { isHidingArchived } from "../components/tables/filters";
import { useDefaultAggFilters } from "../components/tables/hooks";

export default function DecksTab({
  aggFiltersArg
}: {
  aggFiltersArg?: AggregatorFilters;
}): JSX.Element {
  const dispatcher = useDispatch();
  const { decksTableMode, decksTableState } = pd.settings;
  const showArchived = !isHidingArchived(decksTableState);
  const defaultAggFilters = useDefaultAggFilters(showArchived, aggFiltersArg);
  const decks = pd.deckList;
  React.useEffect(() => {
    const {
      setAggFilters,
      setDecksData,
      setEvents,
      setTableMode,
      setTableState
    } = decksSlice.actions;
    dispatcher(setAggFilters(defaultAggFilters));
    const aggregator = new Aggregator(defaultAggFilters);
    const data = decks.map(
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
    dispatcher(setDecksData(data));
    const totalAgg = new Aggregator();
    dispatcher(setEvents(totalAgg.events));
    dispatcher(setTableMode(decksTableMode));
    dispatcher(setTableState(decksTableState));
  }, [decks, decksTableMode, decksTableState, defaultAggFilters, dispatcher]);
  return (
    <div className="ux_item">
      <DecksTable />
    </div>
  );
}
