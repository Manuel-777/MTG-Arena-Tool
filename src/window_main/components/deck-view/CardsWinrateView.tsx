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

function getWinrateValue(wins: number, losses: number): number {
  return wins + losses == 0 ? -1 : Math.round((100 / (wins + losses)) * wins);
}

function cardWinrateLine(
  winrates: Record<number, CardWinrateData>,
  cardObj: DbCardData,
  quantity: number,
  index: number
): JSX.Element {
  const wr = winrates[cardObj.id];
  const winrate = getWinrateValue(wr.wins, wr.losses);
  const sideInWinrate = getWinrateValue(wr.sideInWins, wr.sideInLosses);
  const initHandWinrate = getWinrateValue(wr.initHandWins, wr.initHandsLosses);
  const sideOutWinrate = getWinrateValue(wr.sideOutWins, wr.sideOutLosses);

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
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div className="settings_note" style={{ textAlign: "center" }}>
          All winrates shown correspond to the times when the card in question
          was cast during a game, except for the &quot;Sided out WR&quot;
          column.
        </div>
        <div className="card-wr-stats">
          <div className="card-wr-line">
            <div className="card-wr-item card-wr-line-card">Mainboard</div>
            <div className="card-wr-item card-wr-line-wr">Cast WR</div>
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
