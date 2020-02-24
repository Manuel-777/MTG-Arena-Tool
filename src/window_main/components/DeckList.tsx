/* eslint-disable react/prop-types */
import _ from "lodash";
import React from "react";
import db from "../../shared/database";
import { cardType } from "../../shared/cardTypes";
import CardTile from "../../shared/CardTile";
import { InternalDeck } from "../../types/Deck";

function Separator(props: React.PropsWithChildren<any>): JSX.Element {
  const { children } = props;
  return <div className="card_tile_separator">{children}</div>;
}

function getDeckComponents(deck: InternalDeck): JSX.Element[] {
  const components = [];
  if (deck.commandZoneGRPIds && deck.commandZoneGRPIds.length > 0) {
    components.push(<Separator key="sep_commander">Commander</Separator>);

    deck.commandZoneGRPIds.forEach((id, index) => {
      if (index % 2 == 0) {
        const card = db.card(id);
        if (card) {
          components.push(
            <CardTile
              indent="a"
              isHighlighted={false}
              isSideboard={false}
              showWildcards={false}
              card={card}
              key={"commandercardtile" + index + "_" + id}
              quantity={1}
            />
          );
        }
      }
    });
  }

  // draw maindeck grouped by cardType
  const cardsByGroup = _(deck.mainDeck)
    .map(card => ({ data: db.card(card.id), ...card }))
    .filter(card => card.data !== undefined)
    .groupBy(card => {
      const type = cardType(card.data);
      switch (type) {
        case "Creature":
          return "Creatures";
        case "Planeswalker":
          return "Planeswalkers";
        case "Instant":
        case "Sorcery":
          return "Spells";
        case "Enchantment":
          return "Enchantments";
        case "Artifact":
          return "Artifacts";
        case "Land":
        case "Basic Land":
          return "Lands";
        default:
          throw new Error(`Unexpected card type: ${type}`);
      }
    })
    .value();

  _([
    "Creatures",
    "Planeswalkers",
    "Spells",
    "Enchantments",
    "Artifacts",
    "Lands"
  ])
    .filter(group => !_.isEmpty(cardsByGroup[group]))
    .forEach(group => {
      // draw a separator for the group
      const cards = cardsByGroup[group];
      const count = _.sumBy(cards, "quantity");
      components.push(
        <Separator key={"sepm_" + group}>{`${group} (${count})`}</Separator>
      );

      // draw the cards
      _(cards)
        .filter(card => card.quantity > 0)
        .orderBy(["data.cmc", "data.name"])
        .forEach((card, index) => {
          components.push(
            <CardTile
              indent="b"
              isHighlighted={false}
              isSideboard={false}
              showWildcards={false}
              card={card.data}
              key={"mainboardcardtile" + index + "_" + card.id}
              quantity={card.quantity}
            />
          );
        });
    });

  const sideboardSize = _.sumBy(deck.sideboard, "quantity");
  if (sideboardSize) {
    // draw a separator for the sideboard
    components.push(
      <Separator key="sep_side">{`Sideboard (${sideboardSize})`}</Separator>
    );

    // draw the cards
    _(deck.sideboard)
      .map(card => ({ data: db.card(card.id), ...card }))
      .filter(card => card.quantity > 0)
      .orderBy(["data.cmc", "data.name"])
      .forEach((card, index) => {
        components.push(
          <CardTile
            indent="a"
            isHighlighted={false}
            isSideboard={false}
            showWildcards={false}
            card={card.data}
            key={"sideboardcardtile" + index + "_" + card.id}
            quantity={card.quantity}
          />
        );
      });
  }

  return components;
}

interface DeckListProps {
  deck: InternalDeck;
}

export default function DeckList(props: DeckListProps): JSX.Element {
  const { deck } = props;
  if (!deck || db.version == 0) return <></>;
  return <>{getDeckComponents(deck)}</>;
}
