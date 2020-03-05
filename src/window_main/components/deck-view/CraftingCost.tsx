import React from "react";
import Deck from "../../../shared/deck";
import { CARD_RARITIES } from "../../../shared/constants";
import {
  get_deck_missing,
  getBoosterCountEstimate
} from "../../../shared/util";
import pd from "../../../shared/PlayerData";

interface CraftingCostProps {
  deck: Deck;
}

type IndexableObject = { [key: string]: number };

export default function CraftingCost(props: CraftingCostProps): JSX.Element {
  const { deck } = props;

  const ownedWildcards: IndexableObject = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };
  // Another deck.getSave() conversion here..
  const missingWildcards: any = get_deck_missing(deck);
  const boosterCost = getBoosterCountEstimate(missingWildcards);

  return (
    <div className="wildcards_cost">
      <span>Wildcards you have/need</span>
      {CARD_RARITIES.filter(rarity => rarity !== "land").map(cardRarity => {
        const cardRarityLowercase = cardRarity.toLowerCase();
        const wcText =
          (ownedWildcards[cardRarityLowercase] > 0
            ? ownedWildcards[cardRarityLowercase] + " / "
            : "") + missingWildcards[cardRarityLowercase];
        return (
          <div
            key={cardRarity}
            title={cardRarity}
            className={"wc_cost wc_" + cardRarity}
          >
            {wcText}
          </div>
        );
      })}
      <div title="Approximate boosters" className="wc_cost wc_booster">
        {Math.round(boosterCost)}
      </div>
    </div>
  );
}
