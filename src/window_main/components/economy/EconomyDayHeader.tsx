import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import { createDiv } from "../../../shared/dom-fns";
import startOfDay from "date-fns/startOfDay";
import { formatNumber, formatPercent } from "../../renderer-util";
import { vaultPercentFormat, EconomyState } from "../../economyUtils";
import React from "react";
import ReactDOM from "react-dom";
import EconomyValueRecord from "./EconomyValueRecord";
import LocalTime from "../../../shared/time-components/LocalTime";

function localDayDateFormat(date: Date) {
  return (
    <LocalTime
      datetime={date.toISOString()}
      year={"numeric"}
      month={"long"}
      day={"numeric"}
    ></LocalTime>
  );
}

function getDayString(daysago: number, timestamp: Date) {
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

interface EconomyDayHeaderProps {
  date: string;
  econState: EconomyState;
}

export function EconomyDayHeader(props: EconomyDayHeaderProps) {
  const { date, econState } = props;
  const timestamp = new Date(date);
  econState.daysago = differenceInCalendarDays(new Date(), timestamp);
  const { dayList, daysago } = econState;
  const deltaPercent = dayList[econState.daysago].vaultProgress / 100.0;

  const gridTitleStyle = {
    gridArea: "1 / 1 / auto / 2",
    lineHeight: "64px"
  };

  return (
    <>
      <div style={gridTitleStyle} className={"flex_item gridTitle"}>
        {getDayString(daysago, timestamp)}
      </div>
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_card"}
        className={"gridCards"}
        deltaUpContent={formatNumber(dayList[daysago].cardsEarned)}
        title={"Cards"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_vault"}
        className={"gridVault"}
        deltaUpContent={formatPercent(deltaPercent, vaultPercentFormat as any)}
        title={"Vault"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_gold marginLeft"}
        className={"gridGold"}
        deltaUpContent={formatNumber(dayList[daysago].goldEarned)}
        deltaDownContent={formatNumber(dayList[daysago].goldSpent)}
        title={"Gold"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_gems"}
        className={"gridGems"}
        deltaUpContent={formatNumber(dayList[daysago].gemsEarned)}
        deltaDownContent={formatNumber(dayList[daysago].gemsSpent)}
        title={"Gems"}
      />
      <EconomyValueRecord
        containerDiv
        iconClassName={"economy_exp"}
        className={"gridExp"}
        deltaUpContent={formatNumber(dayList[daysago].expEarned)}
        title={"Experience"}
      />
    </>
  );
}

export function createDayHeader(change: { date: string }, state: EconomyState) {
  const headerGrid = createDiv(["economy_title"]);
  ReactDOM.render(
    <EconomyDayHeader econState={state} date={change.date} />,
    headerGrid
  );
  return headerGrid;
}
