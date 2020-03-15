import React from "react";
import addDays from "date-fns/addDays";
import startOfDay from "date-fns/startOfDay";

import LocalTime from "../../../shared/time-components/LocalTime";
import { formatNumber, formatPercent } from "../../rendererUtil";
import { vaultPercentFormat } from "./economyUtils";
import EconomyValueRecord from "./EconomyValueRecord";

function localDayDateFormat(date: Date): JSX.Element {
  return (
    <LocalTime
      datetime={date.toISOString()}
      year={"numeric"}
      month={"long"}
      day={"numeric"}
    ></LocalTime>
  );
}

function getDayString(daysago: number, timestamp: Date): string | JSX.Element {
  if (daysago === 0) {
    return "Today";
  }
  if (daysago === 1) {
    return "Yesterday";
  }
  if (daysago > 0) {
    return localDayDateFormat(startOfDay(timestamp));
  }
  return "";
}

export interface EconomyDayHeaderProps {
  date: string;
  daysAgo: number;
  cardsAddedCount: number;
  vaultProgressDelta: number;
  gemsDelta: number;
  goldDelta: number;
  xpGainedNumber: number;
}

export function EconomyDayHeader(props: EconomyDayHeaderProps): JSX.Element {
  const {
    daysAgo,
    cardsAddedCount,
    vaultProgressDelta,
    gemsDelta,
    goldDelta,
    xpGainedNumber
  } = props;
  const timestamp = addDays(new Date(), -daysAgo);

  const gridTitleStyle = {
    gridArea: "1 / 1 / auto / 2",
    lineHeight: "64px"
  };

  return (
    <>
      <div style={gridTitleStyle} className={"flex_item gridTitle"}>
        {getDayString(daysAgo, timestamp)}
      </div>
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_card"}
        className={"gridCards"}
        deltaUpContent={formatNumber(cardsAddedCount)}
        title={"Cards"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_vault"}
        className={"gridVault"}
        deltaUpContent={
          vaultProgressDelta >= 0
            ? formatPercent(vaultProgressDelta, vaultPercentFormat as any)
            : undefined
        }
        deltaDownContent={
          vaultProgressDelta < 0
            ? formatPercent(vaultProgressDelta, vaultPercentFormat as any)
            : undefined
        }
        title={"Vault"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_gold marginLeft"}
        className={"gridGold"}
        deltaUpContent={goldDelta >= 0 ? formatNumber(goldDelta) : undefined}
        deltaDownContent={goldDelta < 0 ? formatNumber(goldDelta) : undefined}
        title={"Gold"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_gems"}
        className={"gridGems"}
        deltaUpContent={gemsDelta >= 0 ? formatNumber(gemsDelta) : undefined}
        deltaDownContent={gemsDelta < 0 ? formatNumber(gemsDelta) : undefined}
        title={"Gems"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_exp"}
        className={"gridExp"}
        deltaUpContent={String(formatNumber(xpGainedNumber ?? 0))}
        title={"Experience"}
      />
    </>
  );
}
