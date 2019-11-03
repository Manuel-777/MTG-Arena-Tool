import * as React from "react";

import { CARD_TYPES, CARD_TYPE_CODES } from "./constants";
import db from "./database";

function getDeckTypesAmount(deck) {
  const types = { art: 0, cre: 0, enc: 0, ins: 0, lan: 0, pla: 0, sor: 0 };
  if (!deck.mainDeck) return types;

  deck.mainDeck.forEach(function(card) {
    // This is hackish.. the way we insert our custom elements in the
    // array of cards is wrong in the first place :()
    if (card.id.id && card.id.id == 100) {
      types.lan += card.quantity;
      return;
    }
    const c = db.card(card.id);
    if (c) {
      if (c.type.includes("Land", 0)) types.lan += card.quantity;
      else if (c.type.includes("Creature", 0)) types.cre += card.quantity;
      else if (c.type.includes("Artifact", 0)) types.art += card.quantity;
      else if (c.type.includes("Enchantment", 0)) types.enc += card.quantity;
      else if (c.type.includes("Instant", 0)) types.ins += card.quantity;
      else if (c.type.includes("Sorcery", 0)) types.sor += card.quantity;
      else if (c.type.includes("Planeswalker", 0)) types.pla += card.quantity;
    }
  });

  return types;
}

export default function DeckTypesStats(_props) {
  const { deck } = _props;
  const cardTypes = getDeckTypesAmount(deck);
  return (
    <div className="types_container">
      {CARD_TYPE_CODES.map((cardTypeKey, index) => {
        return (
          <div className="type_icon_cont" key={"type_icon_cont_" + index}>
            <div
              className={"type_icon type_" + cardTypeKey}
              title={CARD_TYPES[index]}
            />
            <span>{cardTypes[cardTypeKey]}</span>
          </div>
        );
      })}
    </div>
  );
}
