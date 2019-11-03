import * as React from "react";

import pd from "./player-data";
import { cardHasType } from "./card-types";

function OwnershipInfinity(_props) {
  const { owned, acquired } = _props;
  let title = "";
  // Show infinity for basics
  if (owned > 0) title = `∞ copies in collection`;
  else title = `0 copies in collection`;
  if (acquired) {
    title += ` (∞ recent)`;
  }
  let color = "gray";
  if (owned > 0) color = "green";
  if (acquired > 0) color = "orange";
  return <div className={`inventory_card_infinity_${color}`} title={title} />;
}

function OwnershipStar(_props) {
  const { owned, acquired, copyIndex, title } = _props;
  let color = "gray"; // default unowned
  if (copyIndex < owned) {
    color = "green"; // owned copy
  }
  if (acquired && copyIndex >= owned - acquired && copyIndex < owned) {
    color = "orange"; // owned and newly acquired copy
  }
  return <div className={`inventory_card_quantity_${color}`} title={title} />;
}

function MultiCardOwnership(_props) {
  const { owned, acquired } = _props;
  let title = `${owned || 0}/4 copies in collection`;
  if (acquired) {
    title += ` (${acquired} recent)`;
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
          title={title}
        />
      ))}
    </>
  );
}

export default function OwnershipStars(_props) {
  const { card } = _props;
  if (!card || !card.type) {
    return <></>;
  }
  const isbasic = cardHasType(card, "Basic Land");
  const owned = pd.cards.cards[card.id];
  const acquired = pd.cardsNew[card.id];
  // TODO add custom logic to handle rats and petitioners
  if (isbasic) {
    return <OwnershipInfinity owned={owned} acquired={acquired} />;
  }
  return <MultiCardOwnership owned={owned} acquired={acquired} />;
}
