/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import pd from "../../../shared/player-data";
import { getCardImage } from "../../../shared/util";
import OwnershipStars from "../../../shared/OwnershipStars";
import { CardRowProps } from "./types";

export function CardTableViewRow({
  row,
  index,
  cardHoverCallback,
  contextMenuCallback,
  openCardCallback,
  gridTemplateColumns
}: CardRowProps): JSX.Element {
  const card = row.values;
  const mouseClick = React.useCallback(() => {
    openCardCallback(card);
  }, [card]);
  const containerEl = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const containerDiv = containerEl.current;
    if (containerDiv) {
      contextMenuCallback(containerDiv, card);
      cardHoverCallback(containerDiv, card);
    }
  }, [card, contextMenuCallback]);
  return (
    <div
      ref={containerEl}
      className={
        "decks_table_body_row " + (index % 2 == 0 ? "line_light" : "line_dark")
      }
      style={{ gridTemplateColumns }}
      onClick={mouseClick}
    >
      {row.cells.map((cell: any) => {
        return (
          <div
            className="inner_div"
            {...cell.getCellProps()}
            key={cell.column.id + "_" + row.index}
            title={`show ${row.values.name} details`}
          >
            {cell.render("Cell")}
          </div>
        );
      })}
    </div>
  );
}

export function CardTileRow({
  row,
  cardHoverCallback,
  contextMenuCallback,
  openCardCallback
}: CardRowProps): JSX.Element {
  const card = row.values;
  const containerEl = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const containerDiv = containerEl.current;
    if (containerDiv) {
      contextMenuCallback(containerDiv, card);
      cardHoverCallback(containerDiv, card);
    }
  }, [card, contextMenuCallback]);
  return (
    <div
      ref={containerEl}
      onClick={(): void => {
        openCardCallback(card);
      }}
      style={{ display: "inline-block" }}
    >
      <OwnershipStars card={card} wanted={card.wanted} />
      <div
        className={"inventory_card"}
        style={{ width: pd.cardsSize + "px" }}
        title={card.name}
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
