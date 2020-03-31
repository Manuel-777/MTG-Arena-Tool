import { InventoryDelta } from "../types/inventory";
import { reduxAction } from "../shared-redux/sharedRedux";
import globals from "./globals";
import { IPC_RENDERER, IPC_OVERLAY } from "../shared/constants";

export default function inventoryAddDelta(
  delta: Partial<InventoryDelta>
): void {
  const economy = { ...globals.store.getState().playerdata.economy };
  economy.gems += delta.gemsDelta ?? 0;
  economy.gold += delta.goldDelta ?? 0;

  economy.vault += delta.vaultProgressDelta ?? 0;
  economy.wcCommon += delta.wcCommonDelta ?? 0;
  economy.wcUncommon += delta.wcUncommonDelta ?? 0;
  economy.wcRare += delta.wcRareDelta ?? 0;
  economy.wcMythic += delta.wcMythicDelta ?? 0;

  if (delta.cardsAdded) {
    reduxAction(
      globals.store.dispatch,
      "ADD_CARDS_LIST",
      delta.cardsAdded,
      IPC_RENDERER | IPC_OVERLAY
    );
  }
  reduxAction(
    globals.store.dispatch,
    "SET_PLAYER_ECONOMY",
    economy,
    IPC_RENDERER
  );
}
