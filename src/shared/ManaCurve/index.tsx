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

interface Cost {
  cmc: string,
  total: number,
  w: number,
  u: number,
  b: number,
  r: number,
  g: number,
  c: number,
  colorless: number,
  monocolored: number,
  multicolored: number,
}

function append(curve: Cost, cost: string[], quantity: number) {
  const color = new Set<string>();
  cost.forEach((c: string): void => {
    if (c.includes("w")) {
      color.add("w");
      curve.w += quantity;
    }
    if (c.includes("u")) {
      color.add("u");
      curve.u += quantity;
    }
    if (c.includes("b")) {
      color.add("b");
      curve.b += quantity;
    }
    if (c.includes("r")) {
      color.add("r");
      curve.r += quantity;
    }
    if (c.includes("g")) {
      color.add("g");
      curve.g += quantity;
    }
    if (c.match(/^\d+$/)) {
      curve.c += Number(c) * quantity;
    }
  });
  if (color.size === 0) {
    curve.colorless += quantity;
  } else if (color.size === 1) {
    curve.monocolored += quantity;
  } else {
    curve.multicolored += quantity;
  }

  curve.total += quantity;
}

function getDeckCurve(deck: Deck, MAX_CMC: number, intelligent: boolean): Cost[] {
  const curve: Cost[] = [];
  for (let i = 0; i < MAX_CMC + 1; i++) {
    curve[i] = {
      cmc: i + "",
      total: 0,
      w: 0,
      u: 0,
      b: 0,
      r: 0,
      g: 0,
      c: 0,
      colorless: 0,
      monocolored: 0,
      multicolored: 0
    };
  }

  if (!deck.getMainboard()) return curve;

  deck
    .getMainboard()
    .get()
    .forEach((card) => {
      const cardObj = db.card(card.id);
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
            const cmc = Math.min(MAX_CMC, dfcObj.cmc);
            append(curve[cmc], dfcObj.cost, card.quantity);
            return;
          }
        }
      }

      const cmc = Math.min(MAX_CMC, cardObj.cmc);
      append(curve[cmc], cardObj.cost, card.quantity);
    });

  // curve.map(d => debugLog(d));
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
  const curveMax = Math.max(...manaCounts.map((v) => v.total));
  // debugLog("deckManaCurve", manaCounts, curveMax);

  return (
    <div className={className || css.mana_curve_container}>
      <div className={css.mana_curve}>
        {manaCounts.map((cost, i) => {
            const total = cost.total;
            const manaTotal = cost.w + cost.u + cost.b + cost.r + cost.g;

            return (
              <div
                className={css.mana_curve_column}
                key={"mana_curve_column_" + i}
                style={{ height: (total * 100) / curveMax + "%" }}
              >
                <div className={css.mana_curve_number}>
                  {total > 0 ? total : ""}
                </div>

                <div
                  className={"mana_curve_column_color"}
                  key={"mana_curve_column_color_0"}
                  style={{
                    height: Math.round((cost.w / manaTotal) * 100) + "%",
                    backgroundColor: MANA_COLORS[0],
                  }}
                />
                <div
                  className={"mana_curve_column_color"}
                  key={"mana_curve_column_color_1"}
                  style={{
                    height: Math.round((cost.u / manaTotal) * 100) + "%",
                    backgroundColor: MANA_COLORS[1],
                  }}
                />
                <div
                  className={"mana_curve_column_color"}
                  key={"mana_curve_column_color_2"}
                  style={{
                    height: Math.round((cost.b / manaTotal) * 100) + "%",
                    backgroundColor: MANA_COLORS[2],
                  }}
                />
                <div
                  className={"mana_curve_column_color"}
                  key={"mana_curve_column_color_3"}
                  style={{
                    height: Math.round((cost.r / manaTotal) * 100) + "%",
                    backgroundColor: MANA_COLORS[3],
                  }}
                />
                <div
                  className={"mana_curve_column_color"}
                  key={"mana_curve_column_color_4"}
                  style={{
                    height: Math.round((cost.g / manaTotal) * 100) + "%",
                    backgroundColor: MANA_COLORS[4],
                  }}
                />
              </div>
            );
          })}
      </div>
      <div className={css.mana_curve_numbers}>
        {manaCounts.map((_cost, i) => {
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
