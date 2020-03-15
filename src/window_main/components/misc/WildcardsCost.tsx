import React from "react";
import pd from "../../../shared/PlayerData";
import {
  get_deck_missing as getDeckMissing,
  getBoosterCountEstimate
} from "../../../shared/util";
import { CARD_RARITIES } from "../../../shared/constants";
import _ from "lodash";
import { MissingWildcards } from "../decks/types";
import Deck from "../../../shared/deck";

const getRarityKey = (
  rarity: string
): "rare" | "common" | "uncommon" | "mythic" | undefined => {
  if (["rare", "common", "uncommon", "mythic"].includes(rarity))
    return rarity as any;
  return undefined;
};

export default function WildcardsCost(props: { deck: Deck }): JSX.Element {
  const { deck } = props;
  const missingWildcards = getDeckMissing(deck);
  const totalMissing =
    missingWildcards.common +
    missingWildcards.uncommon +
    missingWildcards.rare +
    missingWildcards.mythic;
  const drawCost = totalMissing > 0;
  const ownedWildcards: MissingWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };

  return (
    <div style={{ display: "flex", flexDirection: "row", marginRight: "16px" }}>
      {CARD_RARITIES.filter(rarity => rarity !== "land").map(
        (cardRarity: string) => {
          const key = getRarityKey(cardRarity);
          if (key) {
            const owned = ownedWildcards[key];
            const missing = missingWildcards[key];
            if (missing) {
              return (
                <div
                  key={cardRarity + "-" + owned + "-" + missing}
                  className={"wc_explore_cost wc_" + cardRarity}
                  title={_.capitalize(cardRarity) + " wildcards needed."}
                >
                  {(owned > 0 ? owned + "/" : "") + missing}
                </div>
              );
            }
          }
        }
      )}
      {drawCost && (
        <div title="Boosters needed (estimated)" className="bo_explore_cost">
          {Math.round(getBoosterCountEstimate(missingWildcards))}
        </div>
      )}
    </div>
  );
}
