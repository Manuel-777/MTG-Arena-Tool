import React from "react";
import db from "../../shared/database";
import { ipcSend } from "../rendererUtil";
import { timestamp, toDDHHMMSS } from "../../shared/util";
import { hoverSlice } from "../../shared/redux/reducers";
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../shared/redux/reducers";

export interface WildcardsChange {
  grpId: number;
  rarity: string;
  quantity: number;
  change: number;
}

export default function HomeTab(): JSX.Element {
  const wildcards = useSelector((state: AppState) => state.homeData.wildcards);
  const fSet = useSelector((state: AppState) => state.homeData.filteredSet);
  const usersActive = useSelector(
    (state: AppState) => state.homeData.usersActive
  );

  const [filteredSet, setFilteredSet] = React.useState(fSet);
  const [requested, setRequested] = React.useState(false);
  const orderedSets: string[] = db.sortedSetCodes.filter(
    set => db.sets[set].collation > 0
  );

  const [dailyRewards, setDailyRewards] = React.useState(
    "Daily rewards end: -"
  );
  const [weeklyRewards, setWeeklyRewards] = React.useState(
    "Weekly rewards end: -"
  );

  const updateRewards = (): void => {
    let dd = db.rewards_daily_ends;
    let timeleft = dd.getTime() / 1000 - timestamp();
    setDailyRewards("Daily rewards end: " + toDDHHMMSS(timeleft));

    dd = db.rewards_weekly_ends;
    timeleft = dd.getTime() / 1000 - timestamp();
    setWeeklyRewards("Weekly rewards end: " + toDDHHMMSS(timeleft));
  };

  React.useEffect(() => {
    updateRewards();
    const homeInterval = setInterval(updateRewards, 250);
    return (): void => {
      clearInterval(homeInterval);
    };
  }, []);

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
    <div className="ux_item">
      <div style={{ margin: "0 auto" }}>
        <div className="list_fill"></div>
        <div className="card_tile_separator">General</div>
        <div
          className="text_centered"
          tooltip-content="In the last 24 hours"
          tooltip-bottom=""
          style={{ textAlign: "center" }}
        >
          Users active:{" " + usersActive}
        </div>
        <div
          className="text_centered white daily_left"
          style={{ textAlign: "center" }}
        >
          {dailyRewards}
        </div>
        <div
          className="text_centered white weekly_left"
          style={{ textAlign: "center" }}
        >
          {weeklyRewards}
        </div>
        {wildcards ? (
          <>
            <div className="list_fill"></div>
            <div
              className="card_tile_separator"
              tooltip-content="In the last 15 days."
              tooltip-bottom=""
            >
              Top Wildcards redeemed
            </div>
            <div className="top_wildcards_sets_cont">
              {orderedSets.map((set: string) => {
                const svgData = db.sets[set].svg;
                const setClass =
                  "set_filter " + (filteredSet !== set ? "set_filter_on" : "");
                const requestSet = filteredSet == set ? "" : set;
                return (
                  <div
                    key={set}
                    style={{
                      backgroundImage: `url(data:image/svg+xml;base64,${svgData})`
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

function TopWildcards({ wildcards }: TopWildcardsProps): JSX.Element {
  const lineDark = "line_dark line_bottom_border";
  const dispatcher = useDispatch();
  const { setHoverIn, setHoverOut } = hoverSlice.actions;

  const hoverCard = (id: number, hover: boolean): void => {
    dispatcher(hover ? setHoverIn(id) : setHoverOut());
  };

  return (
    <div className="top_wildcards_cont">
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
        const ld = index % 2 ? "line_dark" : "line_light";

        return card ? (
          <React.Fragment key={"wcc_" + index}>
            <div
              className={ld}
              style={{
                gridArea: `${index + 2} / 1 / auto / auto`,
                textAlign: "center"
              }}
            >
              {index + 1}
            </div>

            <div
              className={ld}
              style={{ gridArea: `${index + 2} / 2 / auto / auto` }}
            >
              <div
                className="top_wildcards_set_icon"
                style={{
                  backgroundImage: `url(data:image/svg+xml;base64,${
                    db.sets[card.set].svg
                  })`
                }}
                title={card.set}
              ></div>
            </div>

            <div
              className={"top_wildcards_wc_icon wc_" + wc.rarity + " " + ld}
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
                textDecoration: "underline dotted"
              }}
            >
              {card.name}
            </div>

            <div
              className={ld}
              style={{
                gridArea: `${index + 2} / 5 / auto / auto`
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
                    ? "arrow_down"
                    : "arrow_up"
                  : "")
              }
              style={{
                gridArea: `${index + 2} / 6 / auto / auto`
              }}
            ></div>

            <div
              className={ld}
              style={{
                gridArea: `${index + 2} / 7 / auto / auto`
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
