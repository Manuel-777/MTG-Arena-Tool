import * as React from "react";
import { DRAFT_RANKS } from "./constants";

function DraftRankValue(_props) {
  const { index, rankValue, maxValue } = _props;
  const rv = 12 - index;
  // TODO properly type this after #684 lands
  const rank = DRAFT_RANKS[rv];
  let colorClass;
  switch (rank) {
    case "A+":
    case "A":
      colorClass = "blue";
      break;
    case "A-":
    case "B+":
    case "B":
      colorClass = "green";
      break;
    case "B-":
    case "C+":
    case "C":
    default:
      colorClass = "white";
      break;
    case "C-":
    case "D+":
    case "D":
      colorClass = "orange";
      break;
    case "D-":
    case "F":
      colorClass = "red";
      break;
  }
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

export default function DraftRatings(_props) {
  const { card } = _props;
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
