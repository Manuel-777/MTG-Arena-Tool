import React from "react";
import { CardObject } from "../../../types/Deck";
import { IPC_NONE } from "../../../shared/constants";
import DeckTypesStats from "../../../shared/DeckTypesStats";
import Deck from "../../../shared/deck";
import Button from "../misc/Button";
import { useDispatch, useSelector } from "react-redux";
import db from "../../../shared/database";
import { getCardImage } from "../../../shared/util";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { AppState } from "../../../shared-redux/stores/rendererStore";

interface VisualDeckViewProps {
  deck: Deck;
  setRegularView: { (): void };
}

type SplitIds = [number, number, number, number];

function cmcSort(a: CardObject, b: CardObject): number {
  const ca = db.card(a.id);
  const cb = db.card(b.id);

  if (ca && cb) {
    return cb.cmc - ca.cmc;
  } else {
    return 0;
  }
}

export default function VisualDeckView(
  props: VisualDeckViewProps
): JSX.Element {
  const { deck, setRegularView } = props;
  const sz =
    100 + useSelector((state: AppState) => state.settings.cards_size) * 15;
  const cardQuality = useSelector(
    (state: AppState) => state.settings.cards_quality
  );
  const dispatcher = useDispatch();

  const hoverCard = (id: number, hover: boolean): void => {
    reduxAction(
      dispatcher,
      hover ? "SET_HOVER_IN" : "SET_HOVER_OUT",
      { grpId: id },
      IPC_NONE
    );
  };

  // attempt at sorting visually..
  const newMainDeck: number[] = [];
  deck
    .getMainboard()
    .get()
    .sort(cmcSort)
    .map((c: CardObject) => {
      for (let i = 0; i < c.quantity; i++) {
        newMainDeck.push(c.id);
      }
    });

  const splitDeck: SplitIds[] = [];
  for (let i = 0; i < newMainDeck.length; i += 4) {
    splitDeck.push([
      newMainDeck[i] || 0,
      newMainDeck[i + 1] || 0,
      newMainDeck[i + 2] || 0,
      newMainDeck[i + 3] || 0
    ]);
  }

  const newSideboard: number[] = [];
  deck
    .getSideboard()
    .get()
    .map((c: CardObject) => {
      for (let i = 0; i < c.quantity; i++) {
        newSideboard.push(c.id);
      }
    });

  return (
    <>
      <DeckTypesStats deck={deck} />
      <Button text="Normal View" onClick={setRegularView} />
      <div
        className="decklist"
        style={{ display: "flex", width: "auto", margin: "0 auto" }}
      >
        <div
          className="visual_mainboard"
          style={{ display: "flex", flexWrap: "wrap", alignContent: "start" }}
        >
          {splitDeck.map((idsList: SplitIds, index: number) => {
            const cards = idsList.map((grpId: number, cindex: number) => {
              const cardObj = db.card(grpId);
              if (cardObj) {
                return (
                  <div
                    style={{ width: sz + "px", height: sz * 0.166 + "px" }}
                    key={"visual-main-" + cindex}
                    className="deck_visual_card"
                  >
                    <img
                      onMouseEnter={(): void => {
                        hoverCard(grpId, true);
                      }}
                      onMouseLeave={(): void => {
                        hoverCard(grpId, false);
                      }}
                      style={{ width: sz + "px" }}
                      src={getCardImage(cardObj, cardQuality)}
                      className="deck_visual_card_img"
                    ></img>
                  </div>
                );
              }
            });
            return (
              <div
                key={"visual-" + index}
                style={{ marginBottom: sz * 0.5 + "px" }}
                className="deck_visual_tile"
              >
                {cards}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginLeft: "32px",
            alignContent: "start",
            maxWidth: (sz + 6) * 1.5 + "px"
          }}
          className="visual_sideboard"
        >
          <div
            style={{ width: (sz + 6) * 5 + "px" }}
            className="deck_visual_tile_side"
          >
            {newSideboard.map((grpId: number, _n: number) => {
              const cardObj = db.card(grpId);
              if (cardObj) {
                return (
                  <div
                    key={"visual-side-" + _n}
                    style={{
                      width: sz + "px",
                      height: sz * 0.166 + "px",
                      marginLeft: _n % 2 == 0 ? "60px" : ""
                    }}
                    className="deck_visual_card_side"
                  >
                    <img
                      onMouseEnter={(): void => {
                        hoverCard(grpId, true);
                      }}
                      onMouseLeave={(): void => {
                        hoverCard(grpId, false);
                      }}
                      style={{ width: sz + "px" }}
                      src={getCardImage(cardObj, cardQuality)}
                      className="deck_visual_card_img"
                    ></img>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    </>
  );
}
