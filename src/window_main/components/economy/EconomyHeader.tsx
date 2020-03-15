import { formatNumber, formatPercent } from "../../rendererUtil";
import pd from "../../../shared/PlayerData";

import { vaultPercentFormat } from "./economyUtils";
import EconomyValueRecord from "./EconomyValueRecord";
import React from "react";

export function EconomyHeader(): JSX.Element {
  const total = pd.economy.boosters.reduce(
    (accumulator: number, booster: { count: number }) =>
      accumulator + booster.count,
    0
  );
  // TODO: remove this any cast once renderer-util is a typescript file.
  const vaultTotal = formatPercent(
    pd.economy.vault / 100,
    vaultPercentFormat as any
  );
  const masteryLevel = pd.economy.currentLevel + 1;

  return (
    <>
      <EconomyValueRecord
        title={"Boosters"}
        iconClassName={"economy_wc_med wc_booster economyIconMargin"}
        deltaContent={formatNumber(total)}
      />
      <EconomyValueRecord
        title={"Vault"}
        iconClassName={"economy_vault economyIconMargin"}
        deltaContent={vaultTotal}
      />
      <EconomyValueRecord
        title={"Common Wildcards"}
        iconClassName={"economy_wc_med wc_common"}
        deltaContent={formatNumber(pd.economy.wcCommon)}
      />
      <EconomyValueRecord
        title={"Uncommon Wildcards"}
        iconClassName={"economy_wc_med wc_uncommon"}
        deltaContent={formatNumber(pd.economy.wcUncommon)}
      />
      <EconomyValueRecord
        title={"Rare Wildcards"}
        iconClassName={"economy_wc_med wc_rare"}
        deltaContent={formatNumber(pd.economy.wcRare)}
      />
      <EconomyValueRecord
        title={"Mythic Wildcards"}
        iconClassName={"economy_wc_med wc_mythic"}
        deltaContent={formatNumber(pd.economy.wcMythic)}
      />
      <EconomyValueRecord
        title={"Gold"}
        iconClassName={"economy_gold marginLeft"}
        deltaContent={formatNumber(pd.economy.gold)}
      />
      <EconomyValueRecord
        title={"Gems"}
        iconClassName={"economy_gems economyIconMargin"}
        deltaContent={formatNumber(pd.economy.gems)}
      />
      <EconomyValueRecord
        title={`Mastery Level (${pd.economy.trackName})`}
        iconClassName={"economy_mastery_med"}
        deltaContent={formatNumber(masteryLevel)}
      />
      <EconomyValueRecord
        title={"Experience"}
        iconClassName={"economy_exp economyIconMargin"}
        deltaContent={formatNumber(pd.economy.currentExp || 0)}
      />
    </>
  );
}
