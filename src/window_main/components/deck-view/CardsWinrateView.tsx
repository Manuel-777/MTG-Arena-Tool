import React from "react";
import Deck from "../../../shared/deck";
import Button from "../misc/Button";
import Aggregator from "../../aggregator";
import CardTile from "../../../shared/CardTile";
import db from "../../../shared/database";
import { CardWinrateData } from "../../aggregator";
import { getWinrateClass } from "../../rendererUtil";
import { DbCardData } from "../../../types/Metadata";
import { compare_cards } from "../../../shared/util";

function cardWinrateLine(
  winrates: Record<number, CardWinrateData>,
  cardObj: DbCardData,
  quantity: number,
  index: number
): JSX.Element {
  const wr = winrates[cardObj.id];
  const winrate =
    wr.wins + wr.losses == 0
      ? -1
      : Math.round((100 / (wr.wins + wr.losses)) * wr.wins);
  const sideInWinrate =
    wr.sideInWins + wr.sideInLosses == 0
      ? -1
      : Math.round((100 / (wr.sideInWins + wr.sideInLosses)) * wr.sideInWins);
  const initHandWinrate =
    wr.initHandWins + wr.initHandsLosses == 0
      ? -1
      : Math.round(
          (100 / (wr.initHandWins + wr.initHandsLosses)) * wr.initHandWins
        );
  const sideOutWinrate =
    wr.sideOutWins + wr.sideOutLosses == 0
      ? -1
      : Math.round(
          (100 / (wr.sideOutWins + wr.sideOutLosses)) * wr.sideOutWins
        );
  const sum = wr.turnsUsed.reduce((a, b) => a + b, 0);
  const avgTurn = sum / wr.turnsUsed.length || 0;
  return (
    <div className="card-wr-line" key={cardObj.id + "-" + index}>
      <div className="card-wr-line-card">
        <CardTile
          indent="c"
          isHighlighted={false}
          isSideboard={false}
          showWildcards={false}
          card={cardObj}
          key={"main-" + index + "-" + cardObj.id}
          quantity={quantity}
        />
      </div>
      <div
        className={
          getWinrateClass(winrate / 100) +
          "_bright card-wr-item card-wr-line-wr"
        }
      >
        {winrate >= 0 ? winrate + "%" : "-"}
      </div>
      <div
        className={
          getWinrateClass(initHandWinrate / 100) +
          "_bright card-wr-item card-wr-line-hand-wr"
        }
      >
        {initHandWinrate >= 0 ? initHandWinrate + "%" : "-"}
      </div>
      <div className="card-wr-item card-wr-line-sided-in">{wr.sidedIn}</div>
      <div className="card-wr-item card-wr-line-sided-out">{wr.sidedOut}</div>
      <div
        className={
          getWinrateClass(sideInWinrate / 100) +
          "_bright card-wr-item card-wr-line-sided-in-wr"
        }
      >
        {sideInWinrate >= 0 ? sideInWinrate + "%" : "-"}
      </div>
      <div
        className={
          getWinrateClass(sideOutWinrate / 100) +
          "_bright card-wr-item card-wr-line-sided-out-wr"
        }
      >
        {sideOutWinrate >= 0 ? sideOutWinrate + "%" : "-"}
      </div>
      <div className="card-wr-item card-wr-line-avg-turn">
        {avgTurn.toFixed(2)}
      </div>
    </div>
  );
}

interface CardsWinratesViewProps {
  deck: Deck;
  aggregator: Aggregator;
  setRegularView: { (): void };
}

export default function CardsWinratesView(
  props: CardsWinratesViewProps
): JSX.Element {
  const { aggregator, deck, setRegularView } = props;

  const winrates = aggregator.getCardsWinrates();
  // console.log(winrates);
  deck.sortMainboard(compare_cards);
  deck.sortSideboard(compare_cards);
  return (
    <>
      <Button text="Normal View" onClick={setRegularView} />
      <div style={{ display: "flex" }}>
        <div className="card-wr-stats">
          <div className="card-wr-line">
            <div className="card-wr-item card-wr-line-card">Mainboard</div>
            <div className="card-wr-item card-wr-line-wr">Winrate</div>
            <div className="card-wr-item card-wr-line-hand-wr">Hand WR</div>
            <div className="card-wr-item card-wr-line-sided-in">Sided in</div>
            <div className="card-wr-item card-wr-line-sided-out">Sided out</div>
            <div className="card-wr-item card-wr-line-sided-in-wr">
              Sided in WR
            </div>
            <div className="card-wr-item card-wr-line-sided-out-wr">
              Sided out WR
            </div>
            <div className="card-wr-item card-wr-line-avg-turn">Avg. turn</div>
          </div>
          {deck
            .getMainboard()
            .get()
            .map((card, index) => {
              const cardObj = db.card(card.id);
              if (cardObj && winrates[card.id]) {
                return cardWinrateLine(winrates, cardObj, card.quantity, index);
              }
            })}
          <div className="card-wr-line">
            <div className="card-wr-item card-wr-line-separator">Sideboard</div>
            <div className="card-wr-item card-wr-line-wr"></div>
            <div className="card-wr-item card-wr-line-hand-wr"></div>
            <div className="card-wr-item card-wr-line-sided-in"></div>
            <div className="card-wr-item card-wr-line-sided-out"></div>
            <div className="card-wr-item card-wr-line-sided-in-wr"></div>
            <div className="card-wr-item card-wr-line-sided-out-wr"></div>
            <div className="card-wr-item card-wr-line-avg-turn"></div>
          </div>
          {deck
            .getSideboard()
            .get()
            .map((card, index) => {
              const cardObj = db.card(card.id);
              if (cardObj && winrates[card.id]) {
                return cardWinrateLine(winrates, cardObj, card.quantity, index);
              }
            })}
        </div>
      </div>
    </>
  );
}
