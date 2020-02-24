import React from "react";
import anime from "animejs";
import { InternalDeck } from "../../../types/Deck";
import db from "../../../shared/database";
import pd from "../../../shared/player-data";
import ManaCost from "../ManaCost";
import { EASING_DEFAULT } from "../../../shared/constants";
import DeckList from "../DeckList";

interface DeckViewProps {
  deck: InternalDeck;
}

export function DeckView(props: DeckViewProps): JSX.Element {
  const { deck } = props;

  const goBack = (): void => {
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div className="decklist_top">
        <div className="button back" onClick={goBack}></div>
        <div className="deck_name">{deck.name}</div>
        <div className="deck_top_colors">
          <ManaCost colors={deck.colors || []} />
        </div>
      </div>
      <div>
        <DeckList deck={deck} />
      </div>
    </div>
  );
}

export default function openDeckSub(deckId: string): JSX.Element {
  const deck = pd.deck(deckId);
  if (!deck) return <div>{deckId}</div>;
  return <DeckView deck={deck} />;
}
