import format from "date-fns/format";
import _ from "lodash";
import React from "react";
import { CARD_RARITIES } from "../../../shared/constants";
import pd from "../../../shared/player-data";
import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass
} from "../../renderer-util";
import {
  BoosterSymbol,
  FlexLeftContainer,
  MetricText,
  RaritySymbol
} from "../display";
import { DecksTableCellProps } from "./types";

export function WinRateCell({ cell }: DecksTableCellProps): JSX.Element {
  const { total, interval, winrate, winrateLow, winrateHigh } = cell.row.values;
  if (!total) {
    return <MetricText title={"no data yet"}>-</MetricText>;
  }
  let intervalDisplay, tooltip;
  if (total >= 20) {
    // sample size is large enough to use Wald Interval
    intervalDisplay = formatPercent(interval);
    tooltip = formatWinrateInterval(
      formatPercent(winrateLow),
      formatPercent(winrateHigh)
    );
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

export function MissingCardsCell({ cell }: DecksTableCellProps): JSX.Element {
  if (!cell.value) {
    return (
      <FlexLeftContainer style={{ visibility: "hidden" }}>
        <MetricText>
          <BoosterSymbol /> 0
        </MetricText>
      </FlexLeftContainer>
    );
  }
  const data = cell.row.values;
  const ownedWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };
  return (
    <FlexLeftContainer>
      {CARD_RARITIES.map(cardRarity => {
        if (cardRarity === "land" || !data[cardRarity]) {
          return;
        }
        return (
          <MetricText
            key={cardRarity}
            title={_.capitalize(cardRarity) + " wildcards needed."}
            style={{ marginRight: "4px" }}
          >
            <RaritySymbol rarity={cardRarity} />{" "}
            {(ownedWildcards[cardRarity] > 0
              ? ownedWildcards[cardRarity] + "/"
              : "") + data[cardRarity]}
          </MetricText>
        );
      })}
      <MetricText title={"Boosters needed (estimated)"}>
        <BoosterSymbol /> {Math.round(cell.value)}
      </MetricText>
    </FlexLeftContainer>
  );
}
