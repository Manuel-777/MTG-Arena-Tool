import React from "react";
import Deck from "../../../shared/deck";
import Button from "../misc/Button";
import Aggregator from "../../aggregator";
import CardTile from "../../../shared/CardTile";
import db from "../../../shared/database";
import { newCardWinrate } from "../../aggregator";

interface CardsWinratesViewProps {
  deck: Deck;
  aggregator: Aggregator;
  setRegularView: { (): void };
}

export default function CardsWinratesView(
  props: CardsWinratesViewProps
): JSX.Element {
  const { aggregator, deck, setRegularView } = props;

  const winrates = aggregator.test();
  return (
    <>
      <Button text="Normal View" onClick={setRegularView} />
      <div style={{ display: "flex" }}>
        <div className="card-wr-stats">
          <div className="card-wr-line">
            <div className="card-wr-item card-wr-line-card">Cards</div>
            <div className="card-wr-item card-wr-line-wr">Winrate</div>
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
                const wr = winrates[card.id];
                const winrate =
                  wr.wins + wr.losses == 0
                    ? "-"
                    : Math.round((100 / (wr.wins + wr.losses)) * wr.wins);
                const sideInWinrate =
                  wr.sideInWins + wr.sideInLosses == 0
                    ? "-"
                    : Math.round(
                        (100 / (wr.sideInWins + wr.sideInLosses)) *
                          wr.sideInWins
                      );
                const sideOutWinrate =
                  wr.sideOutWins + wr.sideOutLosses == 0
                    ? "-"
                    : Math.round(
                        (100 / (wr.sideOutWins + wr.sideOutLosses)) *
                          wr.sideOutWins
                      );
                const sum = wr.turnsUsed.reduce((a, b) => a + b, 0);
                const avgTurn = sum / wr.turnsUsed.length || 0;
                return (
                  <div className="card-wr-line" key={card.grpId + "-" + index}>
                    <div className="card-wr-line-card">
                      <CardTile
                        indent="c"
                        isHighlighted={false}
                        isSideboard={false}
                        showWildcards={false}
                        deck={deck}
                        card={cardObj}
                        key={"main-" + index + "-" + card.id}
                        quantity={card.quantity}
                      />
                    </div>
                    <div className="card-wr-item card-wr-line-wr">
                      {winrate}%
                    </div>
                    <div className="card-wr-item card-wr-line-sided-in">
                      {wr.sidedIn}
                    </div>
                    <div className="card-wr-item card-wr-line-sided-out">
                      {wr.sidedOut}
                    </div>
                    <div className="card-wr-item card-wr-line-sided-in-wr">
                      {sideInWinrate}
                    </div>
                    <div className="card-wr-item card-wr-line-sided-out-wr">
                      {sideOutWinrate}
                    </div>
                    <div className="card-wr-item card-wr-line-avg-turn">
                      {avgTurn.toFixed(2)}
                    </div>
                  </div>
                );
              }
            })}
        </div>
      </div>
    </>
  );
}
