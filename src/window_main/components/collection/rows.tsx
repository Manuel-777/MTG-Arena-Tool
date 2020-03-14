import React from "react";
import OwnershipStars from "../../../shared/OwnershipStars";
import pd from "../../../shared/PlayerData";
import { getCardImage, openScryfallCard } from "../../../shared/util";
import { TableViewRow } from "../tables/TableViewRow";
import { TableViewRowProps } from "../tables/types";
import { CardsData } from "./types";

import useHoverCard from "../../hooks/useHoverCard";
import { addCardMenu } from "../../collection/CollectionTab";

export function CardTableViewRow({
  row,
  ...otherProps
}: TableViewRowProps<CardsData>): JSX.Element {
  const card = row.original;
  const onClick = React.useCallback(() => {
    openScryfallCard(card);
  }, [card]);
  const containerEl = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const containerDiv = containerEl.current;
    if (containerDiv) {
      addCardMenu(containerDiv, card);
    }
  }, [card, containerEl]);

  const [hoverIn, hoverOut] = useHoverCard(card.id);

  return (
    <span ref={containerEl}>
      <TableViewRow
        row={row}
        title={`open ${card.name} in Scryfall (browser)`}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        onClick={onClick}
        {...otherProps}
      />
    </span>
  );
}

export function CardTileRow({
  row
}: TableViewRowProps<CardsData>): JSX.Element {
  const card = row.original;
  const onClick = React.useCallback(() => {
    openScryfallCard(card);
  }, [card]);
  const containerEl = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const containerDiv = containerEl.current;
    if (containerDiv) {
      addCardMenu(containerDiv, card);
    }
  }, [card]);

  const [hoverIn, hoverOut] = useHoverCard(card.id);

  return (
    <div
      ref={containerEl}
      title={`open ${card.name} in Scryfall (browser)`}
      onClick={onClick}
      style={{ display: "inline-block" }}
    >
      <OwnershipStars card={card} wanted={card.wanted} />
      <div
        className={"inventory_card"}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={{ width: pd.cardsSize + "px" }}
      >
        <img
          className={"inventory_card_img"}
          style={{ width: pd.cardsSize + "px" }}
          src={getCardImage(card)}
        />
      </div>
    </div>
  );
}
