import React from "react";
import db from "../../../shared/database";
import {
  ALL_CARDS,
  CountStats,
  FULL_SETS,
  SetStats,
  SINGLETONS
} from "./collectionStats";

export default function CompletionProgressBar({
  countMode,
  countStats,
  image,
  title,
  isSidebar
}: {
  countMode: string;
  countStats: CountStats;
  image: string;
  title: string;
  isSidebar?: boolean;
}): JSX.Element {
  if (!countStats) return <></>;
  let numerator, denominator;
  switch (countMode) {
    case SINGLETONS:
      numerator = countStats.uniqueOwned;
      denominator = countStats.unique;
      break;
    case FULL_SETS:
      numerator = countStats.complete;
      denominator = countStats.unique;
      break;
    default:
    case ALL_CARDS:
      numerator = countStats.owned;
      denominator = countStats.total;
      break;
  }
  const completionRatio = numerator / denominator;
  return (
    <div
      className={"stats_set_completion" + (isSidebar ? " stats_sidebar" : "")}
    >
      <div className={"stats_set_icon"} style={{ backgroundImage: image }}>
        <span>{title}</span>
      </div>
      <div>
        <div className={"stats_set_details"}>
          <span>
            {completionRatio.toLocaleString([], {
              style: "percent",
              maximumSignificantDigits: 2
            })}
          </span>
          <span>
            {numerator} / {denominator}
          </span>
          <span>
            {countStats.wanted}{" "}
            <abbr title="missing copies of cards in current decks">
              wanted cards
            </abbr>
          </span>
        </div>
      </div>
      <div
        className={"stats_set_bar"}
        style={{ width: Math.round(completionRatio * 100) + "%" }}
      />
    </div>
  );
}

export function SetCompletionBar({
  countMode,
  setStats,
  setIconCode,
  setName,
  isSidebar
}: {
  countMode: string;
  setStats: SetStats;
  setIconCode: string;
  setName: string;
  isSidebar?: boolean;
}): JSX.Element {
  const iconSvg = db.sets[setIconCode]?.svg ?? db.defaultSet?.svg;
  const setIcon = iconSvg
    ? `url(data:image/svg+xml;base64,${iconSvg})`
    : "url(../images/notfound.png)";
  return (
    <CompletionProgressBar
      countMode={countMode}
      countStats={setStats.all}
      image={setIcon}
      title={setName}
      isSidebar={isSidebar}
    />
  );
}
