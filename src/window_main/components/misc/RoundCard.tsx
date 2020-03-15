import React from "react";
import { DbCardData } from "../../../types/Metadata";
import { getCardImage } from "../../../shared/util";

interface RoundCardProps {
  card: DbCardData;
}

export default function RoundCard(props: RoundCardProps): JSX.Element {
  const { card } = props;

  const className = `round_card ${card.rarity} rarity-overlay`;

  const style: React.CSSProperties = {
    backgroundImage: `url("${getCardImage(card, "art_crop")}")`
  };

  return <div style={style} title={card.name} className={className}></div>;
}
