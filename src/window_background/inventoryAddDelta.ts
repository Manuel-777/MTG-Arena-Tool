import playerData from "../shared/PlayerData";
import { setData } from "./backgroundUtil";
import { InventoryDelta } from "../types/inventory";

export default function inventoryAddDelta(
  delta: Partial<InventoryDelta>
): void {
  const economy = playerData.economy;
  economy.gems += delta.gemsDelta ?? 0;
  economy.gold += delta.goldDelta ?? 0;

  // Update new cards obtained.
  const cardsNew = playerData.cardsNew;
  const cards = playerData.cards;
  delta.cardsAdded?.forEach((grpId: number) => {
    // Add to inventory
    if (cards.cards[grpId] === undefined) {
      cards.cards[grpId] = 1;
    } else {
      cards.cards[grpId] += 1;
    }
    // Add to newly aquired
    if (cardsNew[grpId] === undefined) {
      cardsNew[grpId] = 1;
    } else {
      cardsNew[grpId] += 1;
    }
  });

  economy.vault += delta.vaultProgressDelta ?? 0;
  economy.wcCommon += delta.wcCommonDelta ?? 0;
  economy.wcUncommon += delta.wcUncommonDelta ?? 0;
  economy.wcRare += delta.wcRareDelta ?? 0;
  economy.wcMythic += delta.wcMythicDelta ?? 0;
  // console.log("cardsNew", cardsNew);
  setData({ economy, cardsNew, cards });
}
