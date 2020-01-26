import React from "react";
import pd from "../../shared/player-data";
import { get_deck_missing, getBoosterCountEstimate } from "../../shared/util";
import { CARD_RARITIES } from "../../shared/constants";
import _ from "lodash";

interface WildcardsCostProps {
  // Should be one of our deck types, not sure which
  deck: any;
}

interface WildcardsList {
  [key: string]: number;
}

export default function WildcardsCost(props: WildcardsCostProps): JSX.Element {
  const { deck } = props;

  const ownedWildcards: WildcardsList = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };

  const missingWildcards: WildcardsList = get_deck_missing(deck);
  let drawCost = false;
  CARD_RARITIES.filter(rarity => rarity !== "land").map(
    (cardRarity: string) => {
      if (missingWildcards[cardRarity]) {
        drawCost = true;
      }
    }
  );

  return (
    <div style={{ display: "flex", flexDirection: "row", marginRight: "16px" }}>
      {CARD_RARITIES.filter(rarity => rarity !== "land").map(
        (cardRarity: string) => {
          if (missingWildcards[cardRarity]) {
            return (
              <div
                className={"wc_explore_cost wc_" + cardRarity}
                title={_.capitalize(cardRarity) + " wildcards needed."}
              >
                {(ownedWildcards[cardRarity] > 0
                  ? ownedWildcards[cardRarity] + "/"
                  : "") + missingWildcards[cardRarity]}
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
