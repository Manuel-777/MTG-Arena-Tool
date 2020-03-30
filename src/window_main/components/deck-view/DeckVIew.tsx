import React, { useState } from "react";
import { InternalDeck, CardObject } from "../../../types/Deck";
import ManaCost from "../misc/ManaCost";
import { MANA_COLORS, IPC_NONE } from "../../../shared/constants";
import DeckList from "../misc/DeckList";
import DeckTypesStats from "../../../shared/DeckTypesStats";
import DeckManaCurve from "../../../shared/DeckManaCurve";
import Deck from "../../../shared/deck";
import Button from "../misc/Button";
import { ipcSend } from "../../rendererUtil";
import { useDispatch, useSelector } from "react-redux";
import db from "../../../shared/database";
import ShareButton from "../misc/ShareButton";
import CraftingCost from "./CraftingCost";
import { getCardImage } from "../../../shared/util";
import uxMove from "../../uxMove";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { getDeck } from "../../../shared-store";
const ReactSvgPieChart = require("react-svg-piechart");

const VIEW_VISUAL = 0;
const VIEW_REGULAR = 1;

interface DeckViewProps {
  deck: InternalDeck;
}

interface ColorsAmmount {
  total: number;
  w: number;
  u: number;
  b: number;
  r: number;
  g: number;
  c: number;
}

function getDeckColorsAmmount(deck: Deck): ColorsAmmount {
  const colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

  deck
    .getMainboard()
    .get()
    .forEach(function(card: CardObject) {
      if (card.quantity > 0) {
        db.card(card.id)?.cost.forEach((c: string) => {
          if (c.indexOf("w") !== -1) {
            colors.w += card.quantity;
            colors.total += card.quantity;
          }
          if (c.indexOf("u") !== -1) {
            colors.u += card.quantity;
            colors.total += card.quantity;
          }
          if (c.indexOf("b") !== -1) {
            colors.b += card.quantity;
            colors.total += card.quantity;
          }
          if (c.indexOf("r") !== -1) {
            colors.r += card.quantity;
            colors.total += card.quantity;
          }
          if (c.indexOf("g") !== -1) {
            colors.g += card.quantity;
            colors.total += card.quantity;
          }
          if (c.indexOf("c") !== -1) {
            colors.c += card.quantity;
            colors.total += card.quantity;
          }
        });
      }
    });

  return colors;
}

function getDeckLandsAmmount(deck: Deck): ColorsAmmount {
  const colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

  deck
    .getMainboard()
    .get()
    .forEach(function(c: CardObject) {
      const quantity = c.quantity;
      const card = db.card(c.id);
      if (quantity > 0 && card) {
        if (
          card.type.indexOf("Land") != -1 ||
          card.type.indexOf("land") != -1
        ) {
          if (card.frame.length < 5) {
            card.frame.forEach(function(c) {
              if (c == 1) {
                colors.w += quantity;
                colors.total += quantity;
              }
              if (c == 2) {
                colors.u += quantity;
                colors.total += quantity;
              }
              if (c == 3) {
                colors.b += quantity;
                colors.total += quantity;
              }
              if (c == 4) {
                colors.r += quantity;
                colors.total += quantity;
              }
              if (c == 5) {
                colors.g += quantity;
                colors.total += quantity;
              }
              if (c == 6) {
                colors.c += quantity;
                colors.total += quantity;
              }
            });
          }
        }
      }
    });

  return colors;
}

export function DeckView(props: DeckViewProps): JSX.Element {
  const deck = new Deck(props.deck);
  const [deckView, setDeckView] = useState(VIEW_REGULAR);
  const dispatcher = useDispatch();

  const goBack = (): void => {
    reduxAction(dispatcher, "SET_BACK_GRPID", 0, IPC_NONE);
    uxMove(0);
  };

  const visualView = (): void => {
    setDeckView(VIEW_VISUAL);
  };

  const regularView = (): void => {
    setDeckView(VIEW_REGULAR);
  };

  const arenaExport = (): void => {
    const list = deck.getExportArena();
    ipcSend("set_clipboard", list);
    reduxAction(
      dispatcher,
      "SET_POPUP",
      {
        text: "Copied to clipboard",
        time: 2000
      },
      IPC_NONE
    );
  };

  const txtExport = (): void => {
    const list = deck.getExportArena();
    ipcSend("export_txt", { str: list, name: deck.getName() });
  };

  const colorCounts = getDeckColorsAmmount(deck);
  const colorsPie = [
    { title: "White", value: colorCounts.w, color: MANA_COLORS[0] },
    { title: "Blue", value: colorCounts.u, color: MANA_COLORS[1] },
    { title: "Black", value: colorCounts.b, color: MANA_COLORS[2] },
    { title: "Red", value: colorCounts.r, color: MANA_COLORS[3] },
    { title: "Green", value: colorCounts.g, color: MANA_COLORS[4] }
  ];
  const landCounts = getDeckLandsAmmount(deck);
  const landsPie = [
    { title: "White", value: landCounts.w, color: MANA_COLORS[0] },
    { title: "Blue", value: landCounts.u, color: MANA_COLORS[1] },
    { title: "Black", value: landCounts.b, color: MANA_COLORS[2] },
    { title: "Red", value: landCounts.r, color: MANA_COLORS[3] },
    { title: "Green", value: landCounts.g, color: MANA_COLORS[4] }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div className="decklist_top">
        <div className="button back" onClick={goBack}></div>
        <div className="deck_name">{deck.getName()}</div>
        <ShareButton type="deck" data={deck.getSave()} />
        <div className="deck_top_colors">
          <ManaCost colors={deck.getColors().get()} />
        </div>
      </div>
      <div
        className="flex_item"
        style={deckView == VIEW_VISUAL ? { flexDirection: "column" } : {}}
      >
        {deckView == VIEW_VISUAL ? (
          <VisualDeckView deck={deck} setRegularView={regularView} />
        ) : (
          <>
            <div className="decklist">
              <DeckList deck={deck} showWildcards={true} />
            </div>
            <div className="stats">
              <Button
                className="button_simple exportDeck"
                text="Visual View"
                onClick={visualView}
              />
              <Button
                className="button_simple exportDeck"
                text="Export to Arena"
                onClick={arenaExport}
              />
              <Button
                className="button_simple exportDeck"
                text="Export to .txt"
                onClick={txtExport}
              />
              <DeckTypesStats deck={deck} />
              <DeckManaCurve deck={deck} />
              {/*
            WildcardsCost should use Deck class to
            render. Im not changing it now because
            it will break other parts of the UI
          */}
              <div className="pie_container_outer">
                <div className="pie_container">
                  <span>Mana Symbols</span>
                  <ReactSvgPieChart strokeWidth={0} data={colorsPie} />
                </div>
                <div className="pie_container">
                  <span>Mana Sources</span>
                  <ReactSvgPieChart strokeWidth={0} data={landsPie} />
                </div>
              </div>
              <CraftingCost deck={deck} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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

function VisualDeckView(props: VisualDeckViewProps): JSX.Element {
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

export default function openDeckSub(
  deckId: string,
  deck: InternalDeck | null = null
): JSX.Element {
  const decklist = deck ?? getDeck(deckId);
  if (!decklist) return <div>{deckId}</div>;
  return <DeckView deck={decklist} />;
}
