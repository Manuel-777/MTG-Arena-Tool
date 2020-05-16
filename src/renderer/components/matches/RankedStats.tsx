import React from "react";
import {DATE_SEASON, RANKS} from "../../../shared/constants";
import Aggregator, {AggregatorFilters} from "../../aggregator";
import {formatPercent} from "../../rendererUtil";
import store from "../../../shared/redux/stores/rendererStore";

import indexCss from "../../index.css";
const {RANKED_CONST, RANKED_DRAFT} = Aggregator;

function getNextRank(currentRank: string): undefined | string {
  const rankIndex = (RANKS as any).indexOf(currentRank);
  if (rankIndex < RANKS.length - 1) {
    return RANKS[rankIndex + 1];
  }
  return undefined;
}

function getStepsUntilNextRank(mode: boolean, winrate: number): string {
  const playerRank = store.getState().playerdata.rank;
  const {rank, step, tier} = mode ? playerRank.limited : playerRank.constructed;

  // TODO extract rank tier/level props into constants
  let st = 1;
  let stw = 1;
  let stl = 0;
  if (rank == "Bronze") {
    st = 4;
    stw = 2;
    stl = 0;
  }
  if (rank == "Silver") {
    st = 5;
    stw = 2;
    stl = 1;
  }
  if (rank == "Gold") {
    st = 6;
    stw = 1;
    stl = 1;
  }
  if (rank == "Platinum") {
    st = 7;
    stw = 1;
    stl = 1;
  }
  if (rank == "Diamond") {
    st = 7;
    stw = 1;
    stl = 1;
  }

  const expectedValue = winrate * stw - (1 - winrate) * stl;
  if (expectedValue <= 0) return "∞";
  const stepsNeeded = st * tier - step;
  return "~" + Math.ceil(stepsNeeded / expectedValue);
}

export default function RankedStats({
  aggregator,
  isLimited,
  setAggFiltersCallback,
}: {
  aggregator: Aggregator;
  isLimited: boolean;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
}): JSX.Element {
  if (!aggregator.stats?.total) return <></>;
  const {winrate} = aggregator.stats;
  const playerData = store.getState().playerdata;
  const seasonName = !isLimited ? "constructed" : "limited";
  const switchSeasonName = isLimited ? "constructed" : "limited";
  const switchSeasonFilters: AggregatorFilters = {
    ...Aggregator.getDefaultFilters(),
    date: DATE_SEASON,
    eventId: isLimited ? RANKED_CONST : RANKED_DRAFT,
  };
  const currentRank = isLimited
    ? playerData.rank.limited.rank
    : playerData.rank.constructed.rank;
  const expected = getStepsUntilNextRank(isLimited, winrate);
  return (
    <>
      <div
        className={
          indexCss.buttonSimple + " " + indexCss.button_thin + " season_toggle"
        }
        style={{margin: "8px auto"}}
        onClick={(): void => setAggFiltersCallback(switchSeasonFilters)}
      >
        Show {switchSeasonName}
      </div>
      <div className={"ranks_history_title"}>Current {seasonName} season:</div>
      <div
        className={"ranks_history_title"}
        title={`Using ${formatPercent(winrate)} winrate`}
      >
        Games until {getNextRank(currentRank)}: {expected}
      </div>
    </>
  );
}
