import { formatNumber, formatPercent } from "../../rendererUtil";
import { vaultPercentFormat } from "./economyUtils";
import EconomyValueRecord from "./EconomyValueRecord";
import React from "react";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { useSelector } from "react-redux";

export function EconomyHeader(): JSX.Element {
  const playerEconomy = useSelector(
    (state: AppState) => state.playerdata.economy
  );
  const total = playerEconomy.boosters.reduce(
    (accumulator: number, booster: { count: number }) =>
      accumulator + booster.count,
    0
  );
  // TODO: remove this any cast once renderer-util is a typescript file.
  const vaultTotal = formatPercent(
    playerEconomy.vault / 100,
    vaultPercentFormat as any
  );
  const masteryLevel = playerEconomy.currentLevel + 1;

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
        deltaContent={formatNumber(playerEconomy.wcCommon)}
      />
      <EconomyValueRecord
        title={"Uncommon Wildcards"}
        iconClassName={"economy_wc_med wc_uncommon"}
        deltaContent={formatNumber(playerEconomy.wcUncommon)}
      />
      <EconomyValueRecord
        title={"Rare Wildcards"}
        iconClassName={"economy_wc_med wc_rare"}
        deltaContent={formatNumber(playerEconomy.wcRare)}
      />
      <EconomyValueRecord
        title={"Mythic Wildcards"}
        iconClassName={"economy_wc_med wc_mythic"}
        deltaContent={formatNumber(playerEconomy.wcMythic)}
      />
      <EconomyValueRecord
        title={"Gold"}
        iconClassName={"economy_gold marginLeft"}
        deltaContent={formatNumber(playerEconomy.gold)}
      />
      <EconomyValueRecord
        title={"Gems"}
        iconClassName={"economy_gems economyIconMargin"}
        deltaContent={formatNumber(playerEconomy.gems)}
      />
      <EconomyValueRecord
        title={`Mastery Level (${playerEconomy.trackName})`}
        iconClassName={"economy_mastery_med"}
        deltaContent={formatNumber(masteryLevel)}
      />
      <EconomyValueRecord
        title={"Experience"}
        iconClassName={"economy_exp economyIconMargin"}
        deltaContent={formatNumber(playerEconomy.currentExp || 0)}
      />
    </>
  );
}
