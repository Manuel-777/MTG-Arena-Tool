import React from "react";
import db from "../../../shared/database";
import { CollectionStats } from "./collectionStats";
import { SetCompletionBar } from "./CompletionProgressBar";
import { SetCompletionStats } from "./SetCompletionStats";

// threshold to separate "complete" collectible sets from "one-offs"
// based on card count (e.g. "Ixalan" vs "Gatecrash")
const STATS_CUTOFF = 100;

export function SetsView({
  stats,
  setClickCallback,
  countMode,
  boosterMath,
  rareDraftFactor,
  mythicDraftFactor,
  boosterWinFactor,
  futureBoosters
}: {
  stats: CollectionStats;
  setClickCallback: (set: string) => void;
  countMode: string;
  boosterMath: boolean;
  rareDraftFactor: number;
  mythicDraftFactor: number;
  boosterWinFactor: number;
  futureBoosters: number;
}): JSX.Element {
  const collectibleSets = db.sortedSetCodes.filter(set => {
    // ensure metadata populated
    const setStats = stats[set];
    const hasData = setStats.all.total > 0;
    // ensure set has collationId, meaning boosters for it exist
    const isCollectible = !!db.sets[set]?.collation;
    return hasData && isCollectible;
  });
  return (
    <div className={"main_stats"}>
      {collectibleSets.map((set, index) => (
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
          {stats[set].all.total > STATS_CUTOFF && (
            <SetCompletionStats
              setStats={stats[set]}
              boosterMath={boosterMath}
              rareDraftFactor={rareDraftFactor}
              mythicDraftFactor={mythicDraftFactor}
              boosterWinFactor={boosterWinFactor}
              futureBoosters={index === 0 ? futureBoosters : 0}
            />
          )}
        </div>
      ))}
    </div>
  );
}
