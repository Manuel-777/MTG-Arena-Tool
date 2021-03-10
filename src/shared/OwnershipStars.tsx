import * as React from "react";

import { useSelector } from "react-redux";
import { AppState } from "../shared/redux/stores/rendererStore";

import css from "../renderer/index.css";
import { cardHasType, DbCardData } from "mtgatool-shared";

function OwnershipInfinity(props: OwnershipProps): JSX.Element {
  const { owned, acquired, wanted } = props;
  let title = (owned > 0 ? "∞" : "0") + " copies in collection";
  if (acquired) {
    title += ` (∞ recent)`;
  }
  let color = css.inventoryCardInfinityGray;
  if (wanted > 0) color = css.inventoryCardInfinityBlue;
  if (owned > 0) color = css.inventoryCardInfinityGreen;
  if (acquired > 0) color = css.inventoryCardInfinityOrange;
  return <div className={color} title={title} />;
}

interface OwnershipProps {
  owned: number;
  acquired: number;
  wanted: number;
}

export const OwnershipSymbol = (props: {
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}): JSX.Element => {
  return (
    <div
      className={props.className || ""}
      style={props.style}
      title={props.title}
    />
  );
};

interface OwnershipStarProps extends OwnershipProps {
  owned: number;
  acquired: number;
  wanted: number;
  copyIndex: number;
  title: string;
}

function OwnershipStar(props: OwnershipStarProps): JSX.Element {
  const { owned, acquired, wanted, copyIndex, title } = props;
  let color = css.inventoryCardQuantityGray; // default unowned
  if (copyIndex < owned) {
    color = css.inventoryCardQuantityGreen; // owned copy
  }
  if (copyIndex >= owned - acquired && copyIndex < owned) {
    color = css.inventoryCardQuantityOrange; // owned and newly acquired copy
  }
  if (copyIndex >= owned && copyIndex < owned + wanted) {
    color = css.inventoryCardQuantityBlue; // not owned and wanted copy
  }
  return <OwnershipSymbol className={color} title={title} />;
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
      {possibleCopiesIndex.map((copyIndex) => (
        <OwnershipStar
          acquired={acquired}
          copyIndex={copyIndex}
          key={copyIndex}
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
  const playerData = useSelector((state: AppState) => state.playerdata);
  if (!card || !card.type) {
    return <></>;
  }
  const owned = playerData.cards.cards[card.id] ?? 0;
  const acquired = playerData.cardsNew[card.id] ?? 0;
  const wanted = props.wanted ?? 0;
  // TODO add custom logic to handle rats and petitioners
  const isbasic =
    cardHasType(card, "Basic Land") || cardHasType(card, "Basic Snow Land");
  const Renderer = isbasic ? OwnershipInfinity : MultiCardOwnership;
  return <Renderer owned={owned} acquired={acquired} wanted={wanted} />;
}
