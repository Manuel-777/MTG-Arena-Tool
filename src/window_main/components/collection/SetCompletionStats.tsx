import React from "react";
import {
  chanceBoosterHasMythic,
  chanceBoosterHasRare,
  estimateBoosterMythics,
  estimateBoosterRares,
  SetStats
} from "../../collection/CollectionStats";

export function SetCompletionStats({
  setStats,
  boosterMath,
  rareDraftFactor,
  mythicDraftFactor,
  boosterWinFactor
}: {
  setStats: SetStats;
  boosterMath: boolean;
  rareDraftFactor: number;
  mythicDraftFactor: number;
  boosterWinFactor: number;
}): JSX.Element {
  const unownedUniqueRares =
    setStats["rare"].unique - setStats["rare"].complete;
  const unownedUniqueMythics =
    setStats["mythic"].unique - setStats["mythic"].complete;
  if (!boosterMath) {
    // current filters specify invalid domain for booster-completion math
    return (
      <div className={"stats_set_completion"}>
        <div
          className={"stats_set_icon notification"}
          style={{ height: "30px", display: "initial", alignSelf: "initial" }}
        >
          <span style={{ fontSize: "13px" }}>
            <i>use &quot;Boosters&quot; preset to show additional stats</i>
          </span>
        </div>
      </div>
    );
  }
  if (!(unownedUniqueRares || unownedUniqueMythics)) {
    return <></>; // all set rares and mythics completed
  }
  // estimate unowned rares and mythics in next draft pool (P1P1, P2P1, P3P1)
  const nextDraftRares = (
    (chanceBoosterHasRare * unownedUniqueRares * 3) /
    setStats["rare"].unique
  ).toFixed(2);
  const nextDraftMythics = (
    (chanceBoosterHasMythic * unownedUniqueMythics * 3) /
    setStats["mythic"].unique
  ).toFixed(2);
  const wantedText = (
    <abbr title="missing copy of a card in a current deck">wanted</abbr>
  );
  // chance that the next draft pool (P1P1, P2P1, P3P1) contains a wanted card
  const chanceDraftRareWanted = (
    (chanceBoosterHasRare * setStats["rare"].uniqueWanted) /
    unownedUniqueRares
  ).toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2
  });
  const chanceDraftMythicWanted = (
    (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted) /
    unownedUniqueMythics
  ).toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2
  });
  // chance that the next booster opened contains a wanted card
  const chanceBoosterRareWanted = (
    (chanceBoosterHasRare * setStats["rare"].uniqueWanted * 3) /
    setStats["rare"].unique
  ).toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2
  });
  const chanceBoosterMythicWanted = (
    (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted * 3) /
    setStats["mythic"].unique
  ).toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2
  });
  // estimate remaining drafts to collect entire set
  // https://www.mtggoldfish.com/articles/collecting-mtg-arena-part-1-of-2
  // D = (T - P*7/8*11/12 - R)/(N+W*7/8*11/12)
  const remainingRares =
    setStats["rare"].total - setStats["rare"].owned - setStats.boosterRares;
  const rareEstimate = Math.ceil(
    remainingRares / (rareDraftFactor + estimateBoosterRares(boosterWinFactor))
  );
  const remainingMythics =
    setStats["mythic"].total -
    setStats["mythic"].owned -
    setStats.boosterMythics;
  const mythicEstimate = Math.ceil(
    remainingMythics /
      (mythicDraftFactor + estimateBoosterMythics(boosterWinFactor))
  );
  return (
    <>
      <div className={"stats_set_completion"}>
        <div
          className={"stats_set_icon bo_explore_cost"}
          style={{ height: "30px" }}
        >
          <span style={{ fontSize: "13px" }}>
            <i>
              {setStats.boosters} current boosters: ~
              {setStats.boosterRares.toFixed(2)} new rares, ~
              {setStats.boosterMythics.toFixed(2)} new mythics
            </i>
          </span>
        </div>
      </div>
      <div className={"stats_set_completion"}>
        <div
          className={"stats_set_icon economy_ticket"}
          style={{ height: "30px" }}
        >
          <span style={{ fontSize: "13px" }}>
            <i>
              next draft pool: ~{nextDraftRares} new rares, ~{nextDraftMythics}{" "}
              new mythics
            </i>
          </span>
        </div>
      </div>
      <div className={"stats_set_completion"}>
        <div
          className={"stats_set_icon bo_explore_cost"}
          style={{ height: "30px" }}
        >
          <span style={{ fontSize: "13px" }}>
            <i>
              next booster: ~{chanceDraftRareWanted} {wantedText} rares, ~
              {chanceDraftMythicWanted} {wantedText} mythics
            </i>
          </span>
        </div>
      </div>
      <div className={"stats_set_completion"}>
        <div
          className={"stats_set_icon economy_ticket"}
          style={{ height: "30px" }}
        >
          <span style={{ fontSize: "13px" }}>
            <i>
              next draft pool: ~{chanceBoosterRareWanted} {wantedText} rares, ~
              {chanceBoosterMythicWanted} {wantedText} mythics
            </i>
          </span>
        </div>
      </div>
      <div className={"stats_set_completion"}>
        <div className={"stats_set_icon icon_2"} style={{ height: "30px" }}>
          <span style={{ fontSize: "13px" }}>
            <i>
              drafts to complete set*: ~{rareEstimate} for rares, ~
              {mythicEstimate} for mythics
            </i>
          </span>
        </div>
      </div>
    </>
  );
}
