import { formatNumber, formatPercent } from "../../renderer-util";
import pd from "../../../shared/player-data";
import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import {
  getPrettyContext,
  vaultPercentFormat,
  EconomyState
} from "../../economyUtils";
import EconomyValueRecord from "./EconomyValueRecord";
import React from "react";
import DateFilter from "../../DateFilter";
import { createDiv } from "../../../shared/dom-fns";
import ReactDOM from "react-dom";

class EconomyDay {
  goldEarned: number;
  gemsEarned: number;
  goldSpent: number;
  gemsSpent: number;
  cardsEarned: number;
  vaultProgress: number;
  expEarned: number;

  constructor(
    goldEarned = 0,
    gemsEarned = 0,
    goldSpent = 0,
    gemsSpent = 0,
    cardsEarned = 0,
    vaultProgress = 0.0,
    expEarned = 0
  ) {
    this.goldEarned = goldEarned;
    this.gemsEarned = gemsEarned;
    this.goldSpent = goldSpent;
    this.gemsSpent = gemsSpent;
    this.cardsEarned = cardsEarned;
    this.vaultProgress = vaultProgress;
    this.expEarned = expEarned;
  }
}

function getContextCounts(state: EconomyState) {
  const contextCounts: { [key: string]: number } = {};

  for (let n = 0; n < state.sortedChanges.length; n++) {
    const change = state.sortedChanges[n];
    if (change === undefined) continue;
    if (change.archived && !state.showArchived) continue;

    if (
      state.daysago !=
      differenceInCalendarDays(new Date(), new Date(change.date))
    ) {
      state.daysago = differenceInCalendarDays(
        new Date(),
        new Date(change.date)
      );
      state.dayList[state.daysago] = new EconomyDay();
      // console.log("new day", change.date);
    }

    const selectVal = getPrettyContext(change.context, false);
    contextCounts[selectVal] = (contextCounts[selectVal] || 0) + 1;

    if (change.delta.gemsDelta != undefined) {
      if (change.delta.gemsDelta > 0)
        state.dayList[state.daysago].gemsEarned += change.delta.gemsDelta;
      else
        state.dayList[state.daysago].gemsSpent += Math.abs(
          change.delta.gemsDelta
        );
    }
    if (change.delta.goldDelta != undefined) {
      if (change.delta.goldDelta > 0)
        state.dayList[state.daysago].goldEarned += change.delta.goldDelta;
      else
        state.dayList[state.daysago].goldSpent += Math.abs(
          change.delta.goldDelta
        );

      // console.log(economyId, "> ", change.date, " > ", change.delta.goldDelta);
    }

    if (change.delta.cardsAdded) {
      state.dayList[state.daysago].cardsEarned +=
        change.delta.cardsAdded.length;
    }
    if (change.delta.vaultProgressDelta > 0) {
      state.dayList[state.daysago].vaultProgress +=
        change.delta.vaultProgressDelta;
    }

    if (change.xpGained > 0) {
      state.dayList[state.daysago].expEarned += change.xpGained;
    }
  }
  const selectItems = Object.keys(contextCounts);
  selectItems.sort(
    (a, b) => contextCounts[b] - contextCounts[a] || a.localeCompare(b)
  );

  const topSelectItems = ["All", "Day Summaries"];

  return {
    selectOptions: [...topSelectItems, ...selectItems],
    contextCounts: contextCounts
  };
}

interface EconomyHeaderProps {
  state: EconomyState;
  callback: () => void;
}

export function EconomyHeader(props: EconomyHeaderProps) {
  const { state, callback } = props;

  const { contextCounts, selectOptions } = getContextCounts(state);

  const onArchiveClicked = (newValue: boolean) => {
    state.showArchived = newValue;
    callback();
  };

  const onSelectChange = (value: string) => {
    state.filterEconomy = value;
    callback();
  };

  const selectFormatter = (context: string) => {
    return context in contextCounts
      ? `${context} (${contextCounts[context]})`
      : context;
  };

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
      <DateFilter
        className={"economyDateSelect"}
        prefixId={"query_select"}
        showArchivedValue={state.showArchived}
        showArchivedFilter={true}
        onArchiveClick={onArchiveClicked}
        options={selectOptions}
        current={state.filterEconomy}
        callback={onSelectChange}
        optionFormatter={selectFormatter}
      />
      <EconomyValueRecord
        title={"Boosters"}
        iconClassName={"economy_wc_med wc_booster economyIconMargin"}
        deltaContent={total}
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
        deltaContent={pd.economy.currentExp || 0}
      />
    </>
  );
}

export function createEconomyHeader(state: EconomyState, callback: () => void) {
  const div = createDiv(["list_economy_top", "flex_item"]);

  ReactDOM.render(<EconomyHeader state={state} callback={callback} />, div);

  return div;
}
