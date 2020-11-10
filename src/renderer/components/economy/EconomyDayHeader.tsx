import React from "react";
import addDays from "date-fns/addDays";
import startOfDay from "date-fns/startOfDay";

import ReactTooltip from 'react-tooltip';
import LocalTime from "../../../shared/time-components/LocalTime";
import {formatNumber} from "../../rendererUtil";
import {vaultPercentFormat} from "./economyUtils";
import EconomyValueRecord from "./EconomyValueRecord";
import {CardPoolAddedEconomyValueRecord} from "./EconomyRow";

import indexCss from "../../index.css";
import css from "./economy.css";
import {formatPercent} from "mtgatool-shared";
import {Row} from "react-table";
import {TransactionData} from "./types";

function localDayDateFormat(date: Date): JSX.Element {
  return (
    <LocalTime
      datetime={date.toISOString()}
      year={"numeric"}
      month={"long"}
      day={"numeric"}
    />
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
  subRows: Array<Row<TransactionData>>;
}

export function EconomyDayHeader(props: EconomyDayHeaderProps): JSX.Element {
  const {
    daysAgo,
    cardsAddedCount,
    vaultProgressDelta,
    gemsDelta,
    goldDelta,
    xpGainedNumber,
    subRows
  } = props;
  const timestamp = addDays(new Date(), -daysAgo);

  const gridTitleStyle = {
    gridArea: "1 / 1 / auto / 2",
    lineHeight: "64px",
  };

  return (
    <>
      <div style={gridTitleStyle} className={indexCss.flexItem + " gridTitle"}>
        {getDayString(daysAgo, timestamp)}
      </div>
      <div data-tip data-for={"tooltipCards" + daysAgo} style={{gridArea: "1 / 2 / auto / 3"}}
           className={css.economy_metric}>
        <EconomyValueRecord
          iconClassName={css.economyCard}
          className={"gridCards"}
          deltaContent={formatNumber(cardsAddedCount)}
          deltaUp={true}
          title={"Cards"}
        />
      </div>
      <ReactTooltip
        id={"tooltipCards" + daysAgo}
        className={indexCss.noPadding}
        arrowColor={"transparent"}
        borderColor={"transparent"}
        place={"bottom"}>
        <div>
          {subRows.filter((row) => {
            return row.values.delta?.cardsAdded;
          }).map((row, index) => {
            return (
              <CardPoolAddedEconomyValueRecord
                key={index}
                addedCardIds={row.values.delta.cardsAdded}
                aetherizedCardIds={[]}
              />
            );
          })}
        </div>
      </ReactTooltip>
      <div style={{gridArea: "1 / 3 / auto / 4"}} className={css.economy_metric}>
        <EconomyValueRecord
          iconClassName={css.economyVault}
          className={"gridVault"}
          deltaContent={formatPercent(vaultProgressDelta, vaultPercentFormat as any)}
          deltaUp={vaultProgressDelta >= 0}
          deltaDown={vaultProgressDelta < 0}
          title={"Vault"}
        />
      </div>
      <div style={{gridArea: "1 / 4 / auto / 5"}} className={css.economy_metric}>
        <EconomyValueRecord
          iconClassName={css.economyGold + " " + css.marginLeft}
          className={"gridGold"}
          deltaContent={formatNumber(goldDelta)}
          deltaUp={goldDelta >= 0}
          deltaDown={goldDelta < 0}
          title={"Gold"}
        />
      </div>
      <div style={{gridArea: "1 / 5 / auto / 6"}} className={css.economy_metric}>
        <EconomyValueRecord
          iconClassName={css.economyGems}
          className={"gridGems"}
          deltaContent={formatNumber(gemsDelta)}
          deltaUp={gemsDelta >= 0}
          deltaDown={gemsDelta < 0}
          title={"Gems"}
        />
      </div>
      <div style={{gridArea: "1 / 6 / auto / 7"}} className={css.economy_metric}>
        <EconomyValueRecord
          iconClassName={css.economyExp}
          className={"gridExp"}
          deltaContent={String(formatNumber(xpGainedNumber ?? 0))}
          deltaUp={true}
          title={"Experience"}
        />
      </div>
    </>
  );
}
