import React from "react";
import { CARD_RARITIES } from "../../../shared/constants";
import _ from "lodash";
import { MissingWildcards } from "../decks/types";
import Deck from "../../../shared/deck";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import {
  getBoosterCountEstimate,
  get_deck_missing as getDeckMissing
} from "../../rendererUtil";

const getRarityKey = (
  rarity: string
): "rare" | "common" | "uncommon" | "mythic" | undefined => {
  if (["rare", "common", "uncommon", "mythic"].includes(rarity))
    return rarity as any;
  return undefined;
};
export default function WildcardsCost(props: { deck: Deck }): JSX.Element {
  const { deck } = props;
  const playerEconomy = useSelector(
    (state: AppState) => state.playerdata.economy
  );
  const missingWildcards = getDeckMissing(deck);
  const totalMissing =
    missingWildcards.common +
    missingWildcards.uncommon +
    missingWildcards.rare +
    missingWildcards.mythic;
  const drawCost = totalMissing > 0;
  const ownedWildcards: MissingWildcards = {
    common: playerEconomy.wcCommon,
    uncommon: playerEconomy.wcUncommon,
    rare: playerEconomy.wcRare,
    mythic: playerEconomy.wcMythic
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
