import React from "react";
import { DATE_SEASON, RANKS } from "../../../shared/constants";
import pd from "../../../shared/PlayerData";
import Aggregator, { AggregatorFilters } from "../../aggregator";
import { formatPercent } from "../../rendererUtil";

const { RANKED_CONST, RANKED_DRAFT } = Aggregator;

function getNextRank(currentRank: string): undefined | string {
  const rankIndex = (RANKS as any).indexOf(currentRank);
  if (rankIndex < RANKS.length - 1) {
    return RANKS[rankIndex + 1];
  }
  return undefined;
}

function getStepsUntilNextRank(mode: boolean, winrate: number): string {
  const rr = mode ? pd.rank.limited : pd.rank.constructed;

  const cr = rr.rank;
  const cs = rr.step;
  const ct = rr.tier;

  // TODO extract rank tier/level props into constants
  let st = 1;
  let stw = 1;
  let stl = 0;
  if (cr == "Bronze") {
    st = 4;
    stw = 2;
    stl = 0;
  }
  if (cr == "Silver") {
    st = 5;
    stw = 2;
    stl = 1;
  }
  if (cr == "Gold") {
    st = 6;
    stw = 1;
    stl = 1;
  }
  if (cr == "Platinum") {
    st = 7;
    stw = 1;
    stl = 1;
  }
  if (cr == "Diamond") {
    st = 7;
    stw = 1;
    stl = 1;
  }

  const expectedValue = winrate * stw - (1 - winrate) * stl;
  if (expectedValue <= 0) return "&#x221e";
  const stepsNeeded = st * ct - cs;
  return "~" + Math.ceil(stepsNeeded / expectedValue);
}

export default function RankedStats({
  aggregator,
  isLimited,
  setAggFiltersCallback
}: {
  aggregator: Aggregator;
  isLimited: boolean;
  setAggFiltersCallback: (filters: AggregatorFilters) => void;
}): JSX.Element {
  if (!aggregator.stats?.total) return <></>;
  const { winrate } = aggregator.stats;
  const seasonName = !isLimited ? "constructed" : "limited";
  const switchSeasonName = isLimited ? "constructed" : "limited";
  const switchSeasonFilters: AggregatorFilters = {
    ...Aggregator.getDefaultFilters(),
    date: DATE_SEASON,
    eventId: isLimited ? RANKED_CONST : RANKED_DRAFT
  };
  const currentRank = isLimited
    ? pd.rank.limited.rank
    : pd.rank.constructed.rank;
  const expected = getStepsUntilNextRank(isLimited, winrate);
  return (
    <>
      <div
        className={"button_simple button_thin season_toggle"}
        style={{ margin: "8px auto" }}
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
