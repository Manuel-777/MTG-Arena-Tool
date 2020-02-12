import React from "react";
import { get_rank_index_16, formatRank } from "../../shared/util";

interface RankSmallProps {
  rank: any;
  style?: React.CSSProperties;
}

export default function RankSmall(props: RankSmallProps): JSX.Element {
  const { rank, style } = props;

  const getRankStyle = (): React.CSSProperties => {
    return {
      ...(style ? style : {}),
      marginRight: "0px",
      backgroundPosition: get_rank_index_16(rank.rank) * -16 + "px 0px"
    };
  };

  return (
    <div
      style={getRankStyle()}
      title={formatRank(rank)}
      className="ranks_16"
    ></div>
  );
}
