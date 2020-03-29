import format from "date-fns/format";
import _ from "lodash";
import React from "react";
import { HeaderProps } from "react-table";
import pd from "../../../shared/PlayerData";
import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass
} from "../../rendererUtil";
import { BoosterSymbol } from "../misc/BoosterSymbol";
import { MetricText } from "../misc/MetricText";
import { RaritySymbol } from "../misc/RaritySymbol";
import { DecksData, DecksTableCellProps } from "./types";

export function WinRateCell({ cell }: DecksTableCellProps): JSX.Element {
  const {
    total,
    interval,
    winrate,
    winrateLow,
    winrateHigh
  } = cell.row.original;
  if (!total) {
    return <MetricText title={"no data yet"}>-</MetricText>;
  }
  let intervalDisplay, tooltip;
  if (total >= 20) {
    // sample size is large enough to use Wald Interval
    intervalDisplay = formatPercent(interval);
    tooltip = formatWinrateInterval(winrateLow, winrateHigh);
  } else {
    // sample size is too small (garbage results)
    intervalDisplay = "???";
    tooltip = "play at least 20 matches to estimate actual winrate";
  }
  return (
    <MetricText title={tooltip}>
      <span className={getWinrateClass(winrate) + "_bright"}>
        {formatPercent(winrate)}
      </span>{" "}
      <i style={{ opacity: "0.6" }}>&plusmn; {intervalDisplay}</i>
    </MetricText>
  );
}

export function LastEditWinRateCell({
  cell
}: DecksTableCellProps): JSX.Element {
  const data = cell.row.values;
  let value, tooltip;
  if (data.lastEditTotal) {
    value = (
      <>
        {data.lastEditWins}:{data.lastEditLosses} (
        <span className={getWinrateClass(cell.value) + "_bright"}>
          {formatPercent(cell.value)}
        </span>
        )
      </>
    );
    tooltip = `${formatPercent(cell.value)} winrate since ${format(
      new Date(data.timeUpdated),
      "Pp"
    )}`;
  } else {
    value = <span>-</span>;
    tooltip = "no data yet";
  }
  return <MetricText title={tooltip}>{value}</MetricText>;
}

export function BoosterNeededCell({ cell }: DecksTableCellProps): JSX.Element {
  return (
    <MetricText title={"Boosters needed (estimated)"}>
      <BoosterSymbol /> {Math.round(cell.value)}
    </MetricText>
  );
}

export function BoosterNeededHeader(): JSX.Element {
  return <BoosterSymbol title={"Boosters needed (estimated)"} />;
}

export function WildcardCell({ cell }: DecksTableCellProps): JSX.Element {
  const rarity = cell.column.id;
  const value = cell.value;
  const owned =
    ((pd.economy as unknown) as Record<string, number>)[
      "wc" + _.capitalize(rarity)
    ] ?? 0;
  return (
    <MetricText title={_.capitalize(rarity) + " wildcards (owned/needed)"}>
      <RaritySymbol rarity={rarity} /> {owned + "/" + value}
    </MetricText>
  );
}

export function WildcardHeader({
  column
}: HeaderProps<DecksData>): JSX.Element {
  return (
    <RaritySymbol
      rarity={column.id}
      title={_.capitalize(column.id) + " wildcards needed"}
    />
  );
}
