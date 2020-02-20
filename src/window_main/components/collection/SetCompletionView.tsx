import React from "react";
import db from "../../../shared/database";
import { CollectionStats } from "../../collection/collectionStats";
import { SetCompletionBar } from "./CompletionProgressBar";
import { SetCompletionStats } from "./SetCompletionStats";

export function SetsView({
  stats,
  setClickCallback,
  countMode,
  boosterMath,
  rareDraftFactor,
  mythicDraftFactor,
  boosterWinFactor
}: {
  stats: CollectionStats;
  setClickCallback: (set: string) => void;
  countMode: string;
  boosterMath: boolean;
  rareDraftFactor: number;
  mythicDraftFactor: number;
  boosterWinFactor: number;
}): JSX.Element {
  const collectibleSets = db.sortedSetCodes.filter(set => {
    // ensure metadata populated
    const setStats = stats[set];
    const cardData = setStats.cards;
    const hasData = cardData.length > 0;
    // ensure set has collationId, meaning boosters for it exist
    const isCollectible = !!db.sets[set]?.collation;
    return hasData && isCollectible;
  });
  return (
    <div className={"main_stats"}>
      {collectibleSets.map(set => (
        <div
          key={set}
          className={"set_stats"}
          onClick={(): void => setClickCallback(set)}
        >
          <SetCompletionBar
            countMode={countMode}
            setStats={stats[set]}
            setIconCode={set}
            setName={set}
          />
          <SetCompletionStats
            setStats={stats[set]}
            boosterMath={boosterMath}
            rareDraftFactor={rareDraftFactor}
            mythicDraftFactor={mythicDraftFactor}
            boosterWinFactor={boosterWinFactor}
          />
        </div>
      ))}
    </div>
  );
}
