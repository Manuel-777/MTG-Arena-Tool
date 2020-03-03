import React from "react";
import OwnershipStars from "../../../shared/OwnershipStars";
import pd from "../../../shared/PlayerData";
import { getCardImage } from "../../../shared/util";
import { TableViewRow } from "../tables/TableViewRow";
import { CollectionTableRowProps } from "./types";

export function CardTableViewRow({
  row,
  cardHoverCallback,
  contextMenuCallback,
  openCardCallback,
  ...otherProps
}: CollectionTableRowProps): JSX.Element {
  const card = row.original;
  const onClick = React.useCallback(() => {
    openCardCallback(card);
  }, [card, openCardCallback]);
  const containerEl = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const containerDiv = containerEl.current;
    if (containerDiv) {
      cardHoverCallback(containerDiv, card);
      contextMenuCallback(containerDiv, card);
    }
  }, [card, containerEl, cardHoverCallback, contextMenuCallback]);
  return (
    <span ref={containerEl}>
      <TableViewRow
        row={row}
        title={`open ${card.name} in Scryfall (browser)`}
        onClick={onClick}
        {...otherProps}
      />
    </span>
  );
}

export function CardTileRow({
  row,
  cardHoverCallback,
  contextMenuCallback,
  openCardCallback
}: CollectionTableRowProps): JSX.Element {
  const card = row.original;
  const onClick = React.useCallback(() => {
    openCardCallback(card);
  }, [card, openCardCallback]);
  const containerEl = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const containerDiv = containerEl.current;
    if (containerDiv) {
      contextMenuCallback(containerDiv, card);
      cardHoverCallback(containerDiv, card);
    }
  }, [card, cardHoverCallback, contextMenuCallback]);
  return (
    <div
      ref={containerEl}
      title={`open ${card.name} in Scryfall (browser)`}
      onClick={onClick}
      style={{ display: "inline-block" }}
    >
      <OwnershipStars card={card} wanted={card.wanted} />
      <div className={"inventory_card"} style={{ width: pd.cardsSize + "px" }}>
        <img
          className={"inventory_card_img"}
          style={{ width: pd.cardsSize + "px" }}
          src={getCardImage(card)}
        />
      </div>
    </div>
  );
}
