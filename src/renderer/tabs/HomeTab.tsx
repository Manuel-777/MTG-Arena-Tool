import React, { useCallback } from "react";
import db from "../../shared/database-wrapper";
import { ipcSend } from "../ipcSend";
import { toDDHHMMSS } from "../../shared/utils/dateTo";
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../shared/redux/stores/rendererStore";
import { reduxAction } from "../../shared/redux/sharedRedux";
import appCss from "../app/app.css";
import sharedCss from "../../shared/shared.css";
import cardTileCss from "../../shared/CardTile/CardTile.css";
import indexCss from "../index.css";
import css from "./HomeTab.css";
import timestamp from "../../shared/utils/timestamp";
import { constants } from "mtgatool-shared";

const { IPC_NONE } = constants;

export interface WildcardsChange {
  grpId: number;
  rarity: "common" | "uncommon" | "rare" | "mythic";
  quantity: number;
  change: number;
}

export default function HomeTab(): JSX.Element {
  const wildcards = useSelector((state: AppState) => state.homeData.wildcards);
  const fSet = useSelector((state: AppState) => state.homeData.filteredSet);
  const { rewards_daily_ends, rewards_weekly_ends } = useSelector(
    (state: AppState) => state.renderer
  );
  const usersActive = useSelector(
    (state: AppState) => state.homeData.usersActive
  );

  const [filteredSet, setFilteredSet] = React.useState(fSet);
  const [requested, setRequested] = React.useState(false);
  const orderedSets: string[] = db.sortedSetCodes.filter(
    (set) => db.sets[set].collation > 0
  );

  const [dailyRewards, setDailyRewards] = React.useState(
    "Daily rewards end: -"
  );
  const [weeklyRewards, setWeeklyRewards] = React.useState(
    "Weekly rewards end: -"
  );

  const updateRewards = useCallback((): void => {
    let dd = new Date(rewards_daily_ends);
    let timeleft = dd.getTime() / 1000 - timestamp();
    setDailyRewards("Daily rewards end: " + toDDHHMMSS(timeleft));

    dd = new Date(rewards_weekly_ends);
    timeleft = dd.getTime() / 1000 - timestamp();
    setWeeklyRewards("Weekly rewards end: " + toDDHHMMSS(timeleft));
  }, [rewards_daily_ends, rewards_weekly_ends]);

  React.useEffect(() => {
    updateRewards();
    const homeInterval = setInterval(updateRewards, 250);
    return (): void => {
      clearInterval(homeInterval);
    };
  }, [updateRewards]);

  const requestHome = (set: string): void => {
    ipcSend("request_home", set);
  };

  React.useEffect(() => {
    if (!requested && usersActive == 0) {
      requestHome(filteredSet);
      setRequested(true);
    }
  }, [requested, usersActive, filteredSet]);

  return (
    <div className={appCss.uxItem}>
      <div style={{ width: "100%", margin: "0 auto" }}>
        <div className={css.listFill}></div>
        <div className={cardTileCss.cardTileSeparator}>General</div>
        <div
          className={css.textCentered}
          tooltip-content="In the last 24 hours"
          tooltip-bottom=""
          style={{ textAlign: "center" }}
        >
          Users active:{" " + usersActive}
        </div>
        <div
          className={css.textCentered + " " + sharedCss.white}
          style={{ textAlign: "center" }}
        >
          {dailyRewards}
        </div>
        <div
          className={css.textCentered + " " + sharedCss.white}
          style={{ textAlign: "center" }}
        >
          {weeklyRewards}
        </div>
        {wildcards ? (
          <>
            <div className={css.listFill}></div>
            <div
              className={cardTileCss.cardTileSeparator}
              tooltip-content="In the last 15 days."
              tooltip-bottom=""
            >
              Top Wildcards redeemed
            </div>
            <div className={css.topWildcardsSetsCont}>
              {orderedSets.map((set: string) => {
                const svgData = db.sets[set].svg;
                const setClass = `${indexCss.setFilter} ${
                  filteredSet !== set ? indexCss.setFilterOn : ""
                }`;
                const requestSet = filteredSet == set ? "" : set;
                return (
                  <div
                    key={set}
                    style={{
                      backgroundImage: `url(data:image/svg+xml;base64,${svgData})`,
                    }}
                    title={set}
                    className={setClass}
                    onClick={(): void => {
                      setFilteredSet(requestSet);
                      requestHome(requestSet);
                    }}
                  ></div>
                );
              })}
            </div>
            <TopWildcards wildcards={wildcards} />
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

interface TopWildcardsProps {
  wildcards: WildcardsChange[];
}

const wcIcons = {
  common: indexCss.wcCommon,
  uncommon: indexCss.wcUncommon,
  rare: indexCss.wcRare,
  mythic: indexCss.wcMythic,
};

function TopWildcards({ wildcards }: TopWildcardsProps): JSX.Element {
  const lineDark = indexCss.lineDark + " " + indexCss.lineBottomBorder;
  const dispatcher = useDispatch();

  const hoverCard = (id: number, hover: boolean): void => {
    reduxAction(
      dispatcher,
      { type: hover ? "SET_HOVER_IN" : "SET_HOVER_OUT", arg: { grpId: id } },
      IPC_NONE
    );
  };

  return (
    <div className={css.topWildcardsCont}>
      <div className={lineDark} style={{ gridArea: `1 / 1 / auto / 3` }}>
        Top
      </div>
      <div className={lineDark} style={{ gridArea: `1 / 3 / auto / 4` }}></div>
      <div className={lineDark} style={{ gridArea: `1 / 4 / auto / 5` }}>
        Name
      </div>
      <div className={lineDark} style={{ gridArea: `1 / 5 / auto / 6` }}>
        Amount
      </div>
      <div className={lineDark} style={{ gridArea: `1 / 6 / auto / 8` }}></div>
      {wildcards.map((wc: WildcardsChange, index: number) => {
        const card = db.card(wc.grpId);
        const ld = index % 2 ? indexCss.lineDark : indexCss.lineLight;

        return card ? (
          <React.Fragment key={"wcc_" + index}>
            <div
              className={ld}
              style={{
                gridArea: `${index + 2} / 1 / auto / auto`,
                textAlign: "center",
              }}
            >
              {index + 1}
            </div>

            <div
              className={ld}
              style={{ gridArea: `${index + 2} / 2 / auto / auto` }}
            >
              <div
                className={css.topWildcardsSetIcon}
                style={{
                  backgroundImage: `url(data:image/svg+xml;base64,${
                    db.sets[card.set].svg
                  })`,
                }}
                title={card.set}
              ></div>
            </div>

            <div
              className={css.topWildcardsWcIcon + wcIcons[wc.rarity] + " " + ld}
              style={{ gridArea: `${index + 2} / 3 / auto / auto` }}
            ></div>

            <div
              className={ld}
              onMouseEnter={(): void => {
                hoverCard(card.id, true);
              }}
              onMouseLeave={(): void => {
                hoverCard(card.id, false);
              }}
              style={{
                gridArea: `${index + 2} / 4 / auto / auto`,
                textDecoration: "underline dotted",
              }}
            >
              {card.name}
            </div>

            <div
              className={ld}
              style={{
                gridArea: `${index + 2} / 5 / auto / auto`,
              }}
            >
              {wc.quantity}
            </div>

            <div
              className={
                ld +
                " " +
                (wc.change !== 0
                  ? wc.change < 0
                    ? css.arrowDown
                    : css.arrowUp
                  : "")
              }
              style={{
                gridArea: `${index + 2} / 6 / auto / auto`,
              }}
            ></div>

            <div
              className={ld}
              style={{
                gridArea: `${index + 2} / 7 / auto / auto`,
              }}
            >
              {(wc.change > 0 ? "+" : "") + wc.change}
            </div>
          </React.Fragment>
        ) : null;
      })}
    </div>
  );
}
