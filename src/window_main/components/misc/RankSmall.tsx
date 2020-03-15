import React from "react";
import { get_rank_index_16, formatRank } from "../../../shared/util";

interface RankSmallProps {
  rank?: any | string;
  rankTier?: string;
  style?: React.CSSProperties;
}

export default function RankSmall(props: RankSmallProps): JSX.Element {
  const { rank, rankTier, style } = props;

  const getRankStyle = (): React.CSSProperties => {
    return {
      ...(style ? style : {}),
      marginRight: "0px",
      backgroundPosition:
        get_rank_index_16(rankTier ? rankTier : rank.rank) * -16 + "px 0px"
    };
  };

  return (
    <div
      style={getRankStyle()}
      title={rankTier ? rankTier : formatRank(rank)}
      className="ranks_16"
    ></div>
  );
}
