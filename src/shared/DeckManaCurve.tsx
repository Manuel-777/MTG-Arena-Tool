import * as React from "react";
import Deck from "../shared/deck";
import { MANA_COLORS } from "./constants";
import db from "./database";
import { CardObject } from "./types/Deck";

function add(a: number, b: number): number {
  return a + b;
}

function getDefaultCount(): number[] {
  return [0, 0, 0, 0, 0, 0];
}

function getDeckCurve(deck: Deck): number[][] {
  const curve: number[][] = [];
  for (let i = 0; i < 8; i++) {
    curve[i] = getDefaultCount();
  }

  if (!deck.getMainboard()) return curve;

  deck
    .getMainboard()
    .get()
    .forEach((card: CardObject) => {
      const cardObj = db.card(card.id);
      if (!cardObj) return;

      const cmc = Math.min(7, cardObj.cmc); // cap at 7+ cmc bucket
      if (!cardObj.type.includes("Land")) {
        cardObj.cost.forEach((c: string): void => {
          if (c.includes("w")) curve[cmc][1] += card.quantity;
          if (c.includes("u")) curve[cmc][2] += card.quantity;
          if (c.includes("b")) curve[cmc][3] += card.quantity;
          if (c.includes("r")) curve[cmc][4] += card.quantity;
          if (c.includes("g")) curve[cmc][5] += card.quantity;
        });
        curve[cmc][0] += card.quantity;
      }
    });
  //console.log(curve);
  return curve;
}

export default function DeckManaCurve(props: { deck: Deck }): JSX.Element {
  const { deck } = props;
  const manaCounts = getDeckCurve(deck);
  let curveMax = 0;
  let cmcMax = 0;
  manaCounts.forEach((cmcPile, index) => {
    if (cmcPile === undefined) {
      return;
    }
    if (cmcPile[0] > 0) {
      curveMax = Math.max(curveMax, cmcPile[0]);
      cmcMax = Math.max(cmcMax, index);
    }
  });
  // console.log("deckManaCurve", manaCounts, curveMax);

  return (
    <div className="mana_curve_container">
      <div className="mana_curve">
        {!!manaCounts &&
          manaCounts.map((cost, i) => {
            const total = cost[0];
            const manaTotal = cost.reduce(add, 0) - total;

            return (
              <div
                className="mana_curve_column"
                key={"mana_curve_column_" + i}
                style={{ height: (total * 100) / curveMax + "%" }}
              >
                <div className="mana_curve_number">{total}</div>
                {MANA_COLORS.map((mc, ind) => {
                  if (ind < 5 && cost[ind + 1] > 0) {
                    return (
                      <div
                        className="mana_curve_column_color"
                        key={"mana_curve_column_color_" + ind}
                        style={{
                          height:
                            Math.round((cost[ind + 1] / manaTotal) * 100) + "%",
                          backgroundColor: mc
                        }}
                      />
                    );
                  }
                })}
              </div>
            );
          })}
      </div>
      <div className="mana_curve_numbers">
        {!!manaCounts &&
          manaCounts.map((cost, i) => {
            return (
              <div
                className="mana_curve_column_number"
                key={"mana_curve_column_number_" + i}
              >
                <div
                  className={"mana_s16 mana_" + i}
                  style={{ margin: "auto" }}
                >
                  <span style={{ paddingLeft: "20px", alignSelf: "center" }}>
                    {i === 7 && "+"}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
