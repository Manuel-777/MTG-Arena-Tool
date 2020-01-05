import * as React from "react";

import playerData from "./player-data";
import { cardHasType } from "./cardTypes";
import { DbCardData } from "./types/Metadata";

function OwnershipInfinity(props: {
  owned: number;
  acquired: number;
  wanted?: number;
}): JSX.Element {
  const { owned, acquired, wanted } = props;
  let title = "";
  // Show infinity for basics
  if (owned > 0) title = `∞ copies in collection`;
  else title = `0 copies in collection`;
  if (acquired) {
    title += ` (∞ recent)`;
  }
  let color = "gray";
  if (wanted ?? 0 > 0) color = "blue";
  if (owned > 0) color = "green";
  if (acquired > 0) color = "orange";
  return <div className={`inventory_card_infinity_${color}`} title={title} />;
}

interface OwnershipStarProps {
  owned: number;
  acquired: number;
  wanted?: number;
  copyIndex: number;
  title: string;
}

function OwnershipStar(props: OwnershipStarProps): JSX.Element {
  const { owned, acquired, wanted, copyIndex, title } = props;
  let color = "gray"; // default unowned
  if (copyIndex < owned) {
    color = "green"; // owned copy
  }
  if (acquired && copyIndex >= owned - acquired && copyIndex < owned) {
    color = "orange"; // owned and newly acquired copy
  }
  const safeOwned = owned ?? 0;
  if (wanted && copyIndex >= safeOwned && copyIndex < safeOwned + wanted) {
    color = "blue"; // not owned and wanted copy
  }
  return <div className={`inventory_card_quantity_${color}`} title={title} />;
}

function MultiCardOwnership(props: {
  owned: number;
  acquired: number;
  wanted?: number;
}): JSX.Element {
  const { owned, acquired, wanted } = props;
  let title = `${owned || 0}/4 copies in collection`;
  if (acquired) {
    title += ` (${acquired} recent)`;
  }
  if (wanted) {
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
  const { card, wanted } = props;
  if (!card || !card.type) {
    return <></>;
  }
  const isbasic = cardHasType(card, "Basic Land");
  const owned = playerData.cards.cards[card.id];
  const acquired = playerData.cardsNew[card.id];
  // TODO add custom logic to handle rats and petitioners
  if (isbasic) {
    return (
      <OwnershipInfinity owned={owned} acquired={acquired} wanted={wanted} />
    );
  }
  return (
    <MultiCardOwnership owned={owned} acquired={acquired} wanted={wanted} />
  );
}
