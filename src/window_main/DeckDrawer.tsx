import * as React from "react";
import * as ReactDOM from "react-dom";

import db from "../shared/database";
import { createDiv } from "../shared/dom-fns";
import CardTile, { CardTileProps } from "../shared/CardTile";
import Deck from "../shared/deck";
import { DbCardData } from "../shared/types/Metadata";

export const cardSeparator = function(str: string) {
  return createDiv(["card_tile_separator"], str);
};

export const cardTile = function(
  style: string,
  grpId: string | number,
  indent: string,
  quantity: string | number | { quantity: string; odds: number },
  showWildcards = false,
  deck?: Deck,
  isSideboard = false,
  isHighlighted = false
): HTMLDivElement | undefined {
  if (quantity === 0) return undefined;

  const card = db.card(grpId);
  let dfcCard: DbCardData | undefined;

  if (card === undefined) {
    return card;
  }

  if (card.dfcId !== undefined && db.card(card.dfcId) !== undefined) {
    dfcCard = db.card(card.dfcId) as DbCardData;
  }

  const wrap = createDiv([]);
  wrap.style.width = "-webkit-fill-available";
  const props: CardTileProps = {
    card,
    deck,
    dfcCard,
    indent,
    isHighlighted,
    isSideboard,
    quantity,
    showWildcards,
    style: parseInt(style)
  };
  ReactDOM.render(<CardTile {...props} />, wrap);

  return wrap;
};
