import React from "react";
import pd from "../../shared/player-data";
import { get_deck_missing, getBoosterCountEstimate } from "../../shared/util";
import { CARD_RARITIES } from "../../shared/constants";
import _ from "lodash";
import { MissingWildcards } from "./decks/types";
import { InternalDeck } from "../../types/Deck";

interface WildcardsCostProps {
  deck: InternalDeck;
}

export default function WildcardsCost(props: WildcardsCostProps): JSX.Element {
  const { deck } = props;

  const ownedWildcards: MissingWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };

  const getRarityKey = (
    rarity: string
  ): "rare" | "common" | "uncommon" | "mythic" | undefined => {
    if (["rare", "common", "uncommon", "mythic"].includes(rarity))
      return rarity as any;
    return undefined;
  };

  const missingWildcards = get_deck_missing(deck);
  let drawCost = false;
  CARD_RARITIES.filter(rarity => rarity !== "land").map(
    (cardRarity: string) => {
      if (cardRarity in missingWildcards) {
        drawCost = true;
      }
    }
  );

  return (
    <div style={{ display: "flex", flexDirection: "row", marginRight: "16px" }}>
      {CARD_RARITIES.filter(rarity => rarity !== "land").map(
        (cardRarity: string) => {
          const key = getRarityKey(cardRarity);
          if (key) {
            const owned = ownedWildcards[key];
            const missing = missingWildcards[key];
            return (
              <div
                className={"wc_explore_cost wc_" + cardRarity}
                title={_.capitalize(cardRarity) + " wildcards needed."}
              >
                {(owned > 0 ? owned + "/" : "") + missing}
              </div>
            );
          }
        }
      )}
      {drawCost ? (
        <div title="Boosters needed (estimated)" className="bo_explore_cost">
          {Math.round(getBoosterCountEstimate(missingWildcards))}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
