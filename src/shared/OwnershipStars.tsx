import * as React from "react";

import playerData from "./PlayerData";
import { cardHasType } from "./cardTypes";
import { DbCardData } from "../types/Metadata";
import styled from "styled-components";

function OwnershipInfinity(props: OwnershipProps): JSX.Element {
  const { owned, acquired, wanted } = props;
  let title = (owned > 0 ? "∞" : "0") + " copies in collection";
  if (acquired) {
    title += ` (∞ recent)`;
  }
  let color = "gray";
  if (wanted > 0) color = "blue";
  if (owned > 0) color = "green";
  if (acquired > 0) color = "orange";
  return <div className={`inventory_card_infinity_${color}`} title={title} />;
}

interface OwnershipProps {
  owned: number;
  acquired: number;
  wanted: number;
}

export const OwnershipSymbol = styled("div").attrs(props => ({
  className: `inventory_card_quantity_${props.color} ${props.className ?? ""}`
}))``;

interface OwnershipStarProps extends OwnershipProps {
  copyIndex: number;
  title: string;
}

function OwnershipStar(props: OwnershipStarProps): JSX.Element {
  const { owned, acquired, wanted, copyIndex, title } = props;
  let color = "gray"; // default unowned
  if (copyIndex < owned) {
    color = "green"; // owned copy
  }
  if (copyIndex >= owned - acquired && copyIndex < owned) {
    color = "orange"; // owned and newly acquired copy
  }
  if (copyIndex >= owned && copyIndex < owned + wanted) {
    color = "blue"; // not owned and wanted copy
  }
  return <OwnershipSymbol color={color} title={title} />;
}

function MultiCardOwnership(props: OwnershipProps): JSX.Element {
  const { owned, acquired, wanted } = props;
  let title = `${owned}/4 copies in collection`;
  if (acquired !== 0) {
    title += ` (${acquired} recent)`;
  }
  if (wanted !== 0) {
    title += ", " + wanted + " more wanted";
  }
  const possibleCopiesIndex = [0, 1, 2, 3];
  return (
    <>
      {possibleCopiesIndex.map(copyIndex => (
        <OwnershipStar
          acquired={acquired}
          copyIndex={copyIndex}
          key={"inventory_card_quantity_" + copyIndex}
          owned={owned}
          wanted={wanted}
          title={title}
        />
      ))}
    </>
  );
}

export default function OwnershipStars(props: {
  card: DbCardData;
  wanted?: number;
}): JSX.Element {
  const { card } = props;
  if (!card || !card.type) {
    return <></>;
  }
  const owned = playerData.cards.cards[card.id] ?? 0;
  const acquired = playerData.cardsNew[card.id] ?? 0;
  const wanted = props.wanted ?? 0;
  // TODO add custom logic to handle rats and petitioners
  const isbasic = cardHasType(card, "Basic Land");
  const Renderer = isbasic ? OwnershipInfinity : MultiCardOwnership;
  return <Renderer owned={owned} acquired={acquired} wanted={wanted} />;
}
