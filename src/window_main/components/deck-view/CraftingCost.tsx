import React from "react";
import Deck from "../../../shared/deck";
import { CARD_RARITIES } from "../../../shared/constants";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { getBoosterCountEstimate, get_deck_missing } from "../../rendererUtil";

interface CraftingCostProps {
  deck: Deck;
}

type IndexableObject = { [key: string]: number };

export default function CraftingCost(props: CraftingCostProps): JSX.Element {
  const { deck } = props;
  const { wcCommon, wcUncommon, wcRare, wcMythic } = useSelector(
    (state: AppState) => state.playerdata.economy
  );
  const ownedWildcards: IndexableObject = {
    common: wcCommon,
    uncommon: wcUncommon,
    rare: wcRare,
    mythic: wcMythic
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
