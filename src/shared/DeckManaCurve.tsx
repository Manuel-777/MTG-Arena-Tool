import * as React from "react";

import { MANA_COLORS } from "./constants";
import db from "./database";
import { DeckData } from "../window_background/data";
import { CardData } from "../overlay/overlayUtil";

function add(a: number, b: number): number {
  return a + b;
}

function getDeckCurve(deck: DeckData): any[] {
  const curve: any[] = [];
  if (!deck.mainDeck) return curve;

  deck.mainDeck.forEach((card: CardData) => {
    const cardObj = db.card(card.id);
    if (!cardObj) return;

    const cmc = cardObj.cmc;
    if (!curve[cmc]) curve[cmc] = [0, 0, 0, 0, 0, 0];

    if (!cardObj.type.includes("Land")) {
      cardObj.cost.forEach(
        (c: string): void => {
          if (c.includes("w")) curve[cmc][1] += card.quantity;
          if (c.includes("u")) curve[cmc][2] += card.quantity;
          if (c.includes("b")) curve[cmc][3] += card.quantity;
          if (c.includes("r")) curve[cmc][4] += card.quantity;
          if (c.includes("g")) curve[cmc][5] += card.quantity;
        }
      );

      curve[cmc][0] += card.quantity;
    }
  });
  /*
  // Do not account sideboard?
  deck.sideboard.forEach(function(card) {
    var grpid = card.id;
    var cmc = db.card(grpid).cmc;
    if (curve[cmc] == undefined)  curve[cmc] = 0;
    curve[cmc] += card.quantity

    if (db.card(grpid).rarity !== 'land') {
      curve[cmc] += card.quantity
    }
  });
  */
  //console.log(curve);
  return curve;
}

export default function DeckManaCurve(props: { deck: DeckData }): JSX.Element {
  const { deck } = props;
  const manaCounts = getDeckCurve(deck);
  const curveMax = Math.max(
    ...manaCounts
      .filter(v => {
        if (v == undefined) return false;
        return true;
      })
      .map(v => v[0] || 0)
  );
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
                <div className="mana_curve_number">
                  {total > 0 ? total : ""}
                </div>
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
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
