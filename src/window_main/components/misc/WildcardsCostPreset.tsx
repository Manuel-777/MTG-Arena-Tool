import React from "react";
import { getBoosterCountEstimate } from "../../../shared/util";
import { CARD_RARITIES } from "../../../shared/constants";
import _ from "lodash";
import { MissingWildcards } from "../decks/types";

const getRarityKey = (
  rarity: string
): "rare" | "common" | "uncommon" | "mythic" | undefined => {
  if (["rare", "common", "uncommon", "mythic"].includes(rarity))
    return rarity as any;
  return undefined;
};

interface WildcardsCostPresetProps {
  wildcards: {
    c?: number;
    u?: number;
    r?: number;
    m?: number;
  };
}

export default function WildcardsCostPreset(
  props: WildcardsCostPresetProps
): JSX.Element {
  const { c, u, r, m } = props.wildcards;

  const missingWildcards: MissingWildcards = {
    common: c || 0,
    uncommon: u || 0,
    rare: r || 0,
    mythic: m || 0
  };

  const totalMissing =
    missingWildcards.common +
    missingWildcards.uncommon +
    missingWildcards.rare +
    missingWildcards.mythic;

  const drawCost = totalMissing > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center"
      }}
    >
      {CARD_RARITIES.filter(rarity => rarity !== "land").map(
        (cardRarity: string) => {
          const key = getRarityKey(cardRarity);
          if (key) {
            const missing = missingWildcards[key];
            if (missing) {
              return (
                <div
                  key={cardRarity + "-" + missing}
                  className={"wc_explore_cost wc_" + cardRarity}
                  title={_.capitalize(cardRarity) + " wildcards needed."}
                >
                  {missing}
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
