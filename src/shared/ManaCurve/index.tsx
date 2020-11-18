import * as React from "react";
import { constants, Deck } from "mtgatool-shared";
import db from "../database-wrapper";

import css from "./ManaCurve.css";
import sharedCss from "../shared.css";

const { MANA_COLORS } = constants;

// Should proably be in constants
const mana: Record<string, string> = {};
mana["0"] = sharedCss.mana_0;
mana["1"] = sharedCss.mana_1;
mana["2"] = sharedCss.mana_2;
mana["3"] = sharedCss.mana_3;
mana["4"] = sharedCss.mana_4;
mana["5"] = sharedCss.mana_5;
mana["6"] = sharedCss.mana_6;
mana["7"] = sharedCss.mana_7;
mana["8"] = sharedCss.mana_8;
mana["9"] = sharedCss.mana_9;
mana["10"] = sharedCss.mana_10;
mana["11"] = sharedCss.mana_11;
mana["12"] = sharedCss.mana_12;
mana["13"] = sharedCss.mana_13;
mana["14"] = sharedCss.mana_14;
mana["15"] = sharedCss.mana_15;
mana["16"] = sharedCss.mana_16;
mana["17"] = sharedCss.mana_17;
mana["18"] = sharedCss.mana_18;
mana["19"] = sharedCss.mana_19;
mana["20"] = sharedCss.mana_20;

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function getDeckCurve(deck: Deck, MAX_CMC: number, intelligent: boolean): Cost[] {
  const curve: number[][] = [];
  for (let i = 0; i < MAX_CMC + 1; i++) {
    curve[i] = [0, 0, 0, 0, 0, 0];
  }

  if (!deck.getMainboard()) return curve;

  deck
    .getMainboard()
    .get()
    .forEach((card) => {
      let cardObj = db.card(card.id);
      if (!cardObj) return;

      if (cardObj.type.includes("Land")) {
        return;
      }

      // Double-faced card
      if(intelligent && cardObj.dfcId !== false) {
        const count = cardObj.type.split("Instant").length - 1
          + cardObj.type.split("Sorcery").length - 1;

        // Split card
        if(count === 2) {
          const dfcObj = db.card(cardObj.dfcId as number);
          if(dfcObj) {
            cardObj = dfcObj;
          }
        }
      }

      const cmc = Math.min(MAX_CMC, cardObj.cmc);
      cardObj.cost.forEach((c: string): void => {
        if (c.includes("w")) curve[cmc][1] += card.quantity;
        if (c.includes("u")) curve[cmc][2] += card.quantity;
        if (c.includes("b")) curve[cmc][3] += card.quantity;
        if (c.includes("r")) curve[cmc][4] += card.quantity;
        if (c.includes("g")) curve[cmc][5] += card.quantity;
      });
      curve[cmc][0] += card.quantity;
    });
  //debugLog(curve);
  return curve;
}

export default function DeckManaCurve(props: {
  className?: string;
  deck: Deck;
  intelligent?: boolean;
}): JSX.Element {
  const { className, deck, intelligent } = props;

  const MAX_CMC = 7; // cap at 7+ cmc bucket
  const manaCounts = getDeckCurve(deck, MAX_CMC, intelligent ?? false);
  const curveMax = Math.max(...manaCounts.map((v) => v[0]));
  // debugLog("deckManaCurve", manaCounts, curveMax);

  return (
    <div className={className || css.mana_curve_container}>
      <div className={css.mana_curve}>
        {!!manaCounts &&
          manaCounts.map((cost, i) => {
            const total = cost[0];
            const manaTotal = sum(cost) - total;

            return (
              <div
                className={css.mana_curve_column}
                key={"mana_curve_column_" + i}
                style={{ height: (total * 100) / curveMax + "%" }}
              >
                <div className={css.mana_curve_number}>
                  {total > 0 ? total : ""}
                </div>
                {MANA_COLORS.map((mc, ind) => {
                  if (ind < 5 && cost[ind + 1] > 0) {
                    return (
                      <div
                        className={"mana_curve_column_color"}
                        key={"mana_curve_column_color_" + ind}
                        style={{
                          height:
                            Math.round((cost[ind + 1] / manaTotal) * 100) + "%",
                          backgroundColor: mc,
                        }}
                      />
                    );
                  }
                })}
              </div>
            );
          })}
      </div>
      <div className={css.mana_curve_numbers}>
        {!!manaCounts &&
          manaCounts.map((_cost, i) => {
            return (
              <div
                className={css.mana_curve_column_number}
                key={"mana_curve_column_number_" + i}
              >
                <div
                  className={sharedCss.manaS16 + " " + mana[i + ""]}
                  style={{ margin: "auto" }}
                >
                  {i === MAX_CMC && (
                    <span style={{ paddingLeft: "20px" }}>+</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
