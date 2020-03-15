import React from "react";
import db from "../../../shared/database";
import { CollectionStats } from "./collectionStats";
import CompletionHeatMap from "./CompletionHeatMap";

export default function ChartView({
  stats
}: {
  stats: CollectionStats;
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
      {collectibleSets.map(set => (
        <CompletionHeatMap
          key={set}
          cardData={stats[set].cards}
          setName={set}
        />
      ))}
    </div>
  );
}
