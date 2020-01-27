import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import isValid from "date-fns/isValid";
import React from "react";
import { TableState } from "react-table";
import pd from "../shared/player-data";
import EconomyTable from "./components/economy/EconomyTable";
import {
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

function saveTableState(economyTableState: TableState<TransactionData>): void {
  ipcSend("save_user_settings", { economyTableState, skipRefresh: true });
}

function saveTableMode(economyTableMode: string): void {
  ipcSend("save_user_settings", { economyTableMode, skipRefresh: true });
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
        artSkinsAdded,
        boosterDelta,
        cardsAdded,
        draftTokensDelta,
        gemsDelta,
        goldDelta,
        sealedTokensDelta,
        vanityItemsAdded,
        vaultProgressDelta,
        wcCommonDelta,
        wcUncommonDelta,
        wcRareDelta,
        wcMythicDelta
      } = txn.delta;
      artSkinsAdded = artSkinsAdded ?? [];
      boosterDelta = boosterDelta ?? [];
      cardsAdded = cardsAdded ?? [];
      draftTokensDelta = draftTokensDelta ?? 0;
      gemsDelta = gemsDelta ?? 0;
      goldDelta = goldDelta ?? 0;
      sealedTokensDelta = sealedTokensDelta ?? 0;
      vanityItemsAdded = vanityItemsAdded ?? [];
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
        draftTokensDelta,
        gemsDelta,
        goldDelta,
        wcDelta: wcCommonDelta + wcUncommonDelta + wcRareDelta + wcMythicDelta,
        wcCommonDelta,
        wcUncommonDelta,
        wcRareDelta,
        wcMythicDelta,
        sealedTokensDelta,
        boosterDeltaCount: sumBoosterCount(boosterDelta ?? []),
        vanityAddedCount: vanityItemsAdded.length ?? 0,
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
      archiveCallback={toggleArchived}
      cachedState={economyTableState}
      cachedTableMode={economyTableMode}
      data={data}
      tableModeCallback={saveTableMode}
      tableStateCallback={saveTableState}
    />
  );
}

export function openEconomyTab(): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mountReactComponent(<EconomyTab />, mainDiv);
}
