import * as React from "react";
import * as ReactDOM from "react-dom";

import db from "./database";
import { createDiv } from "./dom-fns";
import CardTile from "./CardTile";

export const cardSeparator = function(str) {
  return createDiv(["card_tile_separator"], str);
};

export const cardTile = function(
  style,
  grpId,
  indent,
  quantity,
  showWildcards = false,
  deck = null,
  isSideboard = false,
  isHighlighted = false
) {
  if (quantity === 0) return false;

  let card;
  if (grpId && typeof grpId == "object" && grpId.name) {
    // TODO remove group lands hack
    card = grpId;
    grpId = grpId.id;
  } else {
    card = db.card(grpId);
  }
  let dfcCard;
  if (card && card.dfcId) {
    dfcCard = db.card(card.dfcId);
  }

  const wrap = createDiv([]);
  const props = {
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
