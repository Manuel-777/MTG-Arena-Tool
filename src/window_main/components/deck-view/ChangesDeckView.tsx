import React, { useState } from "react";
import { DeckChange } from "../../../types/Deck";
import CardTile from "../../../shared/CardTile";
import DeckList from "../misc/DeckList";
import Deck from "../../../shared/deck";
import Button from "../misc/Button";
import db from "../../../shared/database";
import { useSprings, animated } from "react-spring";
import { getDeckChangesList } from "../../../shared-store";

function sortDeckChanges(ad: DeckChange, bd: DeckChange): number {
  const a = ad.date;
  const b = bd.date;
  if (a == b) return 0;
  return a < b ? 1 : -1;
}

interface ChangesDeckViewProps {
  deck: Deck;
  setRegularView: { (): void };
}

export default function ChangesDeckView(
  props: ChangesDeckViewProps
): JSX.Element {
  const { deck, setRegularView } = props;
  const changes = getDeckChangesList(deck.id).sort(sortDeckChanges);
  const [currentDeck, setDeck] = useState<Deck>(deck);
  const numberOfChanges = changes.map(
    ch => [...ch.changesMain, ...ch.changesSide].length + 2
  );

  const [expandSprings, expandSet] = useSprings(changes.length, () => ({
    height: 0
  }));

  const [arrowSprings, arrowSet] = useSprings(changes.length, () => ({
    transform: "rotate(0deg)"
  }));

  const expand = (index: number): void => {
    const newDeck = new Deck(
      {},
      changes[index].previousMain,
      changes[index].previousSide
    );
    setDeck(newDeck);
    // This is fine, not sure why ts goes mad about it
    expandSet((i: number) => {
      if (i == index) return { height: numberOfChanges[index] * 32 + 1 };
      else return { height: 1 };
    });
    arrowSet((i: number) => {
      if (i == index) return { transform: "rotate(90deg)" };
      else return { transform: "rotate(0deg)" };
    });
  };

  return (
    <>
      <Button text="Normal View" onClick={setRegularView} />
      <div style={{ display: "flex" }}>
        <div className="decklist">
          <DeckList deck={currentDeck} showWildcards={true} />
        </div>
        <div style={{ padding: "47px 0" }} className="stats">
          {changes.length > 0 ? (
            changes.map((ch, index) => {
              const bothChanges = [...ch.changesMain, ...ch.changesSide];
              const added = bothChanges
                .filter(c => c.quantity > 0)
                .reduce((ca, cb) => ca + cb.quantity, 0);
              const removed = bothChanges
                .filter(c => c.quantity < 0)
                .reduce((ca, cb) => ca + Math.abs(cb.quantity), 0);
              return (
                <React.Fragment key={ch.id}>
                  <div
                    className="deck-change"
                    key={ch.id}
                    onClick={(): void => expand(index)}
                  >
                    <animated.div
                      className="expand-arrow"
                      style={arrowSprings[index]}
                    ></animated.div>
                    <div style={{ marginRight: "auto" }}>
                      <relative-time datetime={ch.date}>
                        {ch.date}
                      </relative-time>
                    </div>
                    <div className="change-add" />
                    {added}
                    <div className="change-remove" />
                    {removed}
                    <div style={{ marginRight: "8px" }} />
                  </div>
                  <animated.div
                    style={expandSprings[index]}
                    className="deck-changes-expand"
                  >
                    <div className="card_tile_separator">Mainboard</div>
                    {ch.changesMain.map(card => {
                      const cardObj = db.card(card.id);
                      if (cardObj)
                        return (
                          <CardTile
                            indent="a"
                            key={"main-" + card.id}
                            card={cardObj}
                            isHighlighted={false}
                            isSideboard={false}
                            showWildcards={false}
                            quantity={
                              card.quantity > 0
                                ? "+" + card.quantity
                                : card.quantity
                            }
                          />
                        );
                    })}
                    <div className="card_tile_separator">Sideboard</div>
                    {ch.changesSide.map(card => {
                      const cardObj = db.card(card.id);
                      if (cardObj)
                        return (
                          <CardTile
                            indent="a"
                            key={"main-" + card.id}
                            card={cardObj}
                            isHighlighted={false}
                            isSideboard={false}
                            showWildcards={false}
                            quantity={
                              card.quantity > 0
                                ? "+" + card.quantity
                                : card.quantity
                            }
                          />
                        );
                    })}
                  </animated.div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="change-warning">No changes recorded.</div>
          )}
        </div>
      </div>
    </>
  );
}
