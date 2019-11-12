import * as React from "react";
import { DRAFT_RANKS } from "./constants";
import { getRankColorClass } from "./util";
import { DbCardData } from "./types/Metadata";

interface DraftRankValueProps {
  index: number;
  rankValue: number;
  maxValue: number;
}

function DraftRankValue(props: DraftRankValueProps) {
  const { index, rankValue, maxValue } = props;
  const rv = 12 - index;
  const rank = DRAFT_RANKS[rv];
  const colorClass = getRankColorClass(rank);
  return (
    <div className="rank_value_container">
      <div className={"rank_value_title " + colorClass}>{rank}</div>
      <div
        className="rank_value_bar"
        style={{ width: (240 / maxValue) * rankValue + "px" }}
      />
    </div>
  );
}

export default function DraftRatings(props: { card: DbCardData }) {
  const { card } = props;
  const { rank } = card;
  const rankValues = card.rank_values || [];
  const rankControversy = card.rank_controversy;
  const maxValue = Math.max(...rankValues);

  return (
    <div className="rank_values_main_container">
      <div className="rank_value_container">
        Rank: {DRAFT_RANKS[Math.round(rank)]}
      </div>
      <div className="rank_value_container">Controversy: {rankControversy}</div>
      {rankValues.map((rankValue, index) => (
        <DraftRankValue
          index={index}
          key={"rank_value_container_" + index}
          maxValue={maxValue}
          rankValue={rankValue}
        />
      ))}
    </div>
  );
}
