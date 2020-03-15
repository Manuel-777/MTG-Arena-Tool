import React from "react";
import {
  chanceBoosterHasMythic,
  chanceBoosterHasRare,
  estimateBoosterMythics,
  estimateBoosterRares,
  SetStats,
  chanceNotWildCard
} from "./collectionStats";
import {
  BoosterSymbol,
  MetricText,
  RaritySymbol,
  TicketSymbol,
  CalendarSymbol
} from "../misc/display";
import { OwnershipSymbol } from "../../../shared/OwnershipStars";

export function SetCompletionStats({
  setStats,
  boosterMath,
  rareDraftFactor,
  mythicDraftFactor,
  boosterWinFactor,
  futureBoosters
}: {
  setStats: SetStats;
  boosterMath: boolean;
  rareDraftFactor: number;
  mythicDraftFactor: number;
  boosterWinFactor: number;
  futureBoosters: number;
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
  const unownedRares = setStats["rare"].total - setStats["rare"].owned;
  const unownedMythics = setStats["mythic"].total - setStats["mythic"].owned;
  // estimate future rares and mythics (e.g. from seasonal rewards track)
  const boosterRares = Math.min(setStats.boosterRares, unownedRares);
  const boosterMythics = Math.min(setStats.boosterMythics, unownedMythics);
  const futureRares = Math.min(
    estimateBoosterRares(futureBoosters),
    unownedRares - boosterRares
  );
  const futureMythics = Math.min(
    estimateBoosterMythics(futureBoosters),
    unownedMythics - boosterMythics
  );
  // estimate unowned rares and mythics in next draft pool (P1P1, P2P1, P3P1)
  const nextDraftRares = (
    (chanceBoosterHasRare * unownedUniqueRares * 3) /
    setStats["rare"].unique
  ).toFixed(2);
  const nextDraftMythics = (
    (chanceBoosterHasMythic * unownedUniqueMythics * 3) /
    setStats["mythic"].unique
  ).toFixed(2);
  // chance that the next draft pool (P1P1, P2P1, P3P1) contains a wanted card
  const nextDraftRareWanted = (unownedUniqueRares > 0
    ? (chanceBoosterHasRare * setStats["rare"].uniqueWanted) /
      unownedUniqueRares
    : 0
  ).toFixed(2);
  const nextDraftMythicWanted = (unownedUniqueMythics > 0
    ? (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted) /
      unownedUniqueMythics
    : 0
  ).toFixed(2);
  // chance that the next booster opened contains an unowned card
  const nextBoosterRare = Math.min(chanceBoosterHasRare, unownedRares).toFixed(
    2
  );
  const nextBoosterMythic = Math.min(
    chanceBoosterHasMythic,
    unownedMythics
  ).toFixed(2);
  // chance that the next booster opened contains a wanted card
  const nextBoosterRareWanted = (
    (chanceBoosterHasRare * setStats["rare"].uniqueWanted * 3) /
    setStats["rare"].unique
  ).toFixed(2);
  const nextBoosterMythicWanted = (
    (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted * 3) /
    setStats["mythic"].unique
  ).toFixed(2);
  // estimate remaining drafts to collect entire set
  // https://www.mtggoldfish.com/articles/collecting-mtg-arena-part-1-of-2
  // D = (T - P*7/8*11/12 - R)/(N+W*7/8*11/12)
  const remainingRares = unownedRares - boosterRares - futureRares;
  const completionDraftRare =
    remainingRares > 0
      ? Math.ceil(
          remainingRares /
            (rareDraftFactor + estimateBoosterRares(boosterWinFactor))
        )
      : 0;
  const completionBoosterRare = Math.ceil(
    remainingRares / (chanceBoosterHasRare * chanceNotWildCard)
  );
  const remainingMythics = unownedMythics - boosterMythics - futureMythics;
  const completionDraftMythic =
    remainingMythics > 0
      ? Math.ceil(
          remainingMythics /
            (mythicDraftFactor + estimateBoosterMythics(boosterWinFactor))
        )
      : 0;
  const completionBoosterMythic = Math.ceil(
    remainingMythics / (chanceBoosterHasMythic * chanceNotWildCard)
  );
  const symbolStyle = {
    height: "20px",
    width: "20px",
    backgroundSize: "contain",
    margin: "auto 2px",
    verticalAlign: "middle"
  };
  const newSymbol = <OwnershipSymbol color={"orange"} style={symbolStyle} />;
  const wantedSymbol = <OwnershipSymbol color={"blue"} style={symbolStyle} />;
  return (
    <div className={"stats_set_completion"}>
      <div className={"stats_set_completion_row"}>
        <MetricText />
        <MetricText>
          <RaritySymbol rarity={"rare"} /> Rares
        </MetricText>
        <MetricText>
          <RaritySymbol rarity={"mythic"} /> Mythics
        </MetricText>
      </div>
      {!!(setStats.boosterRares > 0 || futureBoosters > 0) && (
        <div className={"stats_set_completion_row"}>
          <MetricText title={"boosters in inventory, current (+future)"}>
            Inventory
            <BoosterSymbol />
            {setStats.boosters} (+{futureBoosters}):
          </MetricText>
          <MetricText title={"new copies, current (+future)"}>
            {newSymbol}~{boosterRares.toFixed(2)} (+{futureRares.toFixed(2)})
          </MetricText>
          <MetricText title={"new copies, current (+future)"}>
            {newSymbol}~{boosterMythics.toFixed(2)} (+
            {futureMythics.toFixed(2)})
          </MetricText>
        </div>
      )}
      <div className={"stats_set_completion_row"}>
        <MetricText title={"Arena booster w duplicate protection"}>
          Next booster
          <BoosterSymbol />:
        </MetricText>
        <MetricText>
          <span title={"new copies"}>
            {newSymbol}~{nextBoosterRare}
          </span>
          ,{" "}
          <span title={"wanted copies (missing in a current deck)"}>
            {wantedSymbol}~{nextBoosterRareWanted}
          </span>
        </MetricText>
        <MetricText>
          <span title={"new copies"}>
            {newSymbol}~{nextBoosterMythic}
          </span>
          ,{" "}
          <span title={"wanted copies (missing in a current deck)"}>
            {wantedSymbol}~{nextBoosterMythicWanted}
          </span>
        </MetricText>
      </div>
      <div className={"stats_set_completion_row"}>
        <MetricText title={"draft pool first picks (P1P1+P2P1+P3P1)"}>
          Next draft pool
          <TicketSymbol />:
        </MetricText>
        <MetricText>
          <span title={"new copies"}>
            {newSymbol}~{nextDraftRares}
          </span>
          ,{" "}
          <span title={"wanted copies (missing in a current deck)"}>
            {wantedSymbol}~{nextDraftRareWanted}
          </span>
        </MetricText>
        <MetricText>
          <span title={"new copies"}>
            {newSymbol}~{nextDraftMythics}
          </span>
          ,{" "}
          <span title={"wanted copies (missing in a current deck)"}>
            {wantedSymbol}~{nextDraftMythicWanted}
          </span>
        </MetricText>
      </div>
      <div className={"stats_set_completion_row"}>
        <MetricText title={"see estimation inputs on right"}>
          Completion* <CalendarSymbol />:
        </MetricText>
        <MetricText>
          <span title={"additional Arena boosters to complete"}>
            <BoosterSymbol />~{completionBoosterRare}
          </span>{" "}
          or{" "}
          <span title={"additional drafts to complete"}>
            <TicketSymbol />~{completionDraftRare}
          </span>
        </MetricText>
        <MetricText>
          <span title={"additional Arena boosters to complete"}>
            <BoosterSymbol />~{completionBoosterMythic}
          </span>{" "}
          or{" "}
          <span title={"additional drafts to complete"}>
            <TicketSymbol />~{completionDraftMythic}
          </span>
        </MetricText>
      </div>
    </div>
  );
}
