/*
  Not used / deprecated?
*/
import React from "react";
import { COLORS_ALL } from "../shared/constants";
import { getDeckName, deckExists } from "../shared-store";

export interface DeckOptionDeck {
  colors?: number[];
  name?: string;
  archived?: boolean;
}

export interface DeckOptionProps {
  deckId: string;
  deck: DeckOptionDeck;
}

export default function DeckOption(props: DeckOptionProps): JSX.Element {
  const { deckId, deck } = props;

  const deckName: string = deckExists(deckId)
    ? getDeckName(deckId)
    : deck.name || "";
  let maxChars = 10;
  if (deckExists && deck.colors) {
    maxChars = 16 - 2 * deck.colors.length;
  }

  return (
    <>
      {deckName.length > maxChars ? (
        <abbr title={deckName}>{deckName.slice(0, maxChars)}...</abbr>
      ) : (
        deckName
      )}
      {deckExists ? (
        <>
          {deck.archived && (
            <small>
              <i>(archived)</i>
            </small>
          )}
          <div className={"flex_item"}>
            {deck.colors &&
              deck.colors.map(color => (
                <div
                  className={"mana_s16 mana_" + COLORS_ALL[color - 1]}
                  key={color}
                />
              ))}
          </div>
        </>
      ) : (
        <small>
          <i>(deleted)</i>
        </small>
      )}
    </>
  );
}
