import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import isValid from "date-fns/isValid";
import React from "react";
import pd from "../shared/player-data";
import EconomyTable from "./components/economy/EconomyTable";
import {
  EconomyTableState,
  SerializedTransaction,
  TransactionData
} from "./components/economy/types";
import { getPrettyContext } from "./economyUtils";
import mountReactComponent from "./mountReactComponent";
import {
  hideLoadingBars,
  ipcSend,
  resetMainContainer,
  toggleArchived
} from "./renderer-util";

function saveUserState(state: EconomyTableState): void {
  ipcSend("save_user_settings", {
    economyTableState: state,
    economyTableMode: state.economyTableMode,
    skip_refresh: true
  });
}
const sumBoosterCount = (boosters: { count: number }[]): number =>
  boosters.reduce(
    (accumulator: number, booster: { count: number }) =>
      accumulator + booster.count,
    0
  );

function getTxnData(): TransactionData[] {
  const today = new Date();
  return pd.transactionList.map(
    (txn: SerializedTransaction): TransactionData => {
      const ts = new Date(txn.date ?? NaN);
      const archivedSortVal = txn.archived ? 1 : 0;
      const currentTrackLevel = txn.trackDiff?.currentLevel ?? 0;
      const oldTrackLevel = txn.trackDiff?.oldLevel ?? 0;
      const currentOrbCount = txn.orbCountDiff?.currentOrbCount ?? 0;
      const oldOrbCount = txn.orbCountDiff?.oldOrbCount ?? 0;
      let {
        cardsAdded,
        artSkinsAdded,
        gemsDelta,
        goldDelta,
        boosterDelta,
        vaultProgressDelta,
        wcCommonDelta,
        wcUncommonDelta,
        wcRareDelta,
        wcMythicDelta
      } = txn.delta;
      cardsAdded = cardsAdded ?? [];
      artSkinsAdded = artSkinsAdded ?? [];
      gemsDelta = gemsDelta ?? 0;
      goldDelta = goldDelta ?? 0;
      boosterDelta = boosterDelta ?? [];
      vaultProgressDelta = vaultProgressDelta ?? 0;
      wcCommonDelta = wcCommonDelta ?? 0;
      wcUncommonDelta = wcUncommonDelta ?? 0;
      wcRareDelta = wcRareDelta ?? 0;
      wcMythicDelta = wcMythicDelta ?? 0;
      return {
        ...txn,
        prettyContext: getPrettyContext(txn.originalContext, false),
        fullContext: getPrettyContext(txn.originalContext, true),
        archivedSortVal,
        custom: true, // all txns may be archived
        trackLevelDelta: currentTrackLevel - oldTrackLevel,
        orbDelta: currentOrbCount - oldOrbCount,
        cardsAddedCount: cardsAdded.length ?? 0,
        artSkinsAddedCount: artSkinsAdded.length ?? 0,
        gemsDelta,
        goldDelta,
        wcDelta: wcCommonDelta + wcUncommonDelta + wcRareDelta + wcMythicDelta,
        wcCommonDelta,
        wcUncommonDelta,
        wcRareDelta,
        wcMythicDelta,
        boosterDeltaCount: sumBoosterCount(boosterDelta ?? []),
        vaultProgressDelta: vaultProgressDelta / 100,
        aetherizedCardsCount: txn.aetherizedCards?.length ?? 0,
        timestamp: isValid(ts) ? ts.getTime() : NaN,
        daysAgo: differenceInCalendarDays(today, ts),
        xpGainedNumber: parseInt(txn.xpGained ?? "0")
      };
    }
  );
}

export function EconomyTab(): JSX.Element {
  const { economyTableMode, economyTableState } = pd.settings;
  const data = React.useMemo(() => getTxnData(), []);
  return (
    <EconomyTable
      data={data}
      cachedState={economyTableState}
      cachedTableMode={economyTableMode}
      tableStateCallback={saveUserState}
      archiveCallback={toggleArchived}
    />
  );
}

export function openEconomyTab(): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mountReactComponent(<EconomyTab />, mainDiv);
}
