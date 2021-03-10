import _ from "lodash";
import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import formatRank from "../../../shared/utils/formatRank";
import { AppState } from "../../../shared/redux/stores/rendererStore";
import useWindowSize from "../../hooks/useWindowSize";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import PatreonInfo from "../popups/PatreonInfo";
import { ipcSend } from "../../ipcSend";

import topNavCss from "./topNav.css";

import settingsIcon from "../../../assets/images/cog.png";
import syncOk from "../../../assets/images/sync_ok.png";
import syncError from "../../../assets/images/sync_error.png";
import syncForce from "../../../assets/images/sync_force.png";
import syncPull from "../../../assets/images/sync_pull.png";
import syncPush from "../../../assets/images/sync_push.png";
import syncPatreon from "../../../assets/images/sync_patreon.png";
import IconButton from "../misc/IconButton";
import { forceOpenSettings } from "../../tabControl";
import { AnyAction, Dispatch } from "@reduxjs/toolkit";

import { constants, getRankIndex } from "mtgatool-shared";
const {
  MAIN_HOME,
  MAIN_DECKS,
  MAIN_MATCHES,
  MAIN_TIMELINE,
  MAIN_EVENTS,
  MAIN_EXPLORE,
  MAIN_ECONOMY,
  MAIN_COLLECTION,
  MAIN_CONSTRUCTED,
  MAIN_LIMITED,
  IPC_NONE,
  SYNC_CHECK,
  SYNC_ERR,
  SYNC_FETCH,
  SYNC_PUSH,
  SYNC_IDLE,
  SYNC_OK,
} = constants;

const MAIN_CARDS = 15;

const topNavClasses: string[] = [];
topNavClasses[MAIN_HOME] = topNavCss.iconHome;
topNavClasses[MAIN_DECKS] = topNavCss.iconMyDecks;
topNavClasses[MAIN_MATCHES] = topNavCss.iconHistory;
topNavClasses[MAIN_TIMELINE] = topNavCss.iconTimeline;
topNavClasses[MAIN_EVENTS] = topNavCss.iconEvents;
topNavClasses[MAIN_EXPLORE] = topNavCss.iconExplore;
topNavClasses[MAIN_CARDS] = topNavCss.iconExplore;
topNavClasses[MAIN_ECONOMY] = topNavCss.iconEconomy;
topNavClasses[MAIN_COLLECTION] = topNavCss.iconCollection;

interface TopNavItemProps {
  dispatcher: Dispatch<AnyAction>;
  currentTab: number;
  compact: boolean;
  id: number;
  title: string;
}

function TopNavItem(props: TopNavItemProps): JSX.Element {
  const { currentTab, compact, dispatcher, id, title } = props;

  const clickTab = React.useCallback(
    (tabId: number) => (): void => {
      reduxAction(dispatcher, { type: "SET_TOPNAV", arg: tabId }, IPC_NONE);
      reduxAction(dispatcher, { type: "SET_BACK_GRPID", arg: 0 }, IPC_NONE);
      reduxAction(dispatcher, { type: "SET_NAV_INDEX", arg: 0 }, IPC_NONE);
    },
    [dispatcher]
  );

  return compact ? (
    <div
      className={
        (currentTab === id ? topNavCss.itemSelected : "") +
        " " +
        topNavCss.itemNoLabel +
        " " +
        topNavCss.item
      }
      onClick={clickTab(id)}
    >
      <div
        className={topNavCss.icon + " " + topNavClasses[id]}
        title={_.camelCase(title)}
      ></div>
    </div>
  ) : (
    <div
      className={
        (currentTab === id ? topNavCss.itemSelected : "") +
        " " +
        topNavCss.item +
        (title == "" ? " " + topNavCss.itemNoLabel : "")
      }
      onClick={clickTab(id)}
    >
      {title !== "" ? (
        <span className={topNavCss.itemText}>{title}</span>
      ) : (
        <div
          className={topNavCss.icon + " " + topNavClasses[id]}
          title={_.camelCase(title)}
        ></div>
      )}
    </div>
  );
}

interface TopRankProps {
  dispatcher: any;
  currentTab: number;
  id: number;
  rank: any | null;
  rankClass: string;
}

function TopRankIcon(props: TopRankProps): JSX.Element {
  const { currentTab, dispatcher, id, rank, rankClass } = props;

  const selected = currentTab === id;
  const clickTab = React.useCallback(
    (tabId) => (): void => {
      reduxAction(dispatcher, { type: "SET_TOPNAV", arg: tabId }, IPC_NONE);
      reduxAction(dispatcher, { type: "SET_BACK_GRPID", arg: 0 }, IPC_NONE);
      reduxAction(dispatcher, { type: "SET_NAV_INDEX", arg: 0 }, IPC_NONE);
    },
    [dispatcher]
  );

  if (rank == null) {
    // No rank badge, default to beginner and remove interactions
    const rankStyle = {
      backgroundPosition: "0px 0px",
    };
    return (
      <div className={topNavCss.item}>
        <div style={rankStyle} className={rankClass}></div>
      </div>
    );
  }

  const propTitle = formatRank(rank);
  const rankStyle = {
    backgroundPosition: getRankIndex(rank.rank, rank.tier) * -48 + "px 0px",
  };

  return (
    <div
      className={
        (selected ? topNavCss.itemSelected : "") + " " + topNavCss.item
      }
      onClick={clickTab(id)}
    >
      <div style={rankStyle} title={propTitle} className={rankClass}></div>
    </div>
  );
}

function PatreonBadge(): JSX.Element {
  const patreonTier = useSelector(
    (state: AppState) => state.renderer.patreon.patreonTier
  );

  let title = "Patreon Basic Tier";
  if (patreonTier === 1) title = "Patreon Standard Tier";
  if (patreonTier === 2) title = "Patreon Modern Tier";
  if (patreonTier === 3) title = "Patreon Legacy Tier";
  if (patreonTier === 4) title = "Patreon Vintage Tier";

  const style = {
    backgroundPosition: -40 * patreonTier + "px 0px",
  };

  return <div title={title} style={style} className={topNavCss.patreon}></div>;
}

function SyncBadge({ patreon }: { patreon: boolean }): JSX.Element {
  const [patreonInfo, setPatreonInfo] = useState(false);
  const offline = useSelector((state: AppState) => state.renderer.offline);
  const syncState = useSelector((state: AppState) => state.renderer.syncState);
  const toPush = useSelector((state: AppState) => state.renderer.syncToPush);

  const sum =
    toPush.courses.length +
    toPush.drafts.length +
    toPush.economy.length +
    toPush.matches.length +
    toPush.seasonal.length;

  let title = "All done";
  let image = syncOk;
  if (syncState === SYNC_ERR) {
    title = "Something went wrong. Click to try again.";
    image = syncError;
  }
  if (syncState === SYNC_IDLE) {
    title = "Click to check";
    image = syncForce;
  }
  if (syncState === SYNC_CHECK) {
    title = "Checking";
    image = syncForce;
  }
  if (syncState === SYNC_FETCH) {
    title = "Fetching data";
    image = syncPull;
  }
  if (syncState === SYNC_PUSH) {
    title = "Pushing data";
    image = syncPush;
  }
  if (!patreon) {
    title = "";
    image = syncPatreon;
  }
  if (offline) {
    title = "You are offline";
    image = syncError;
  } else {
    if (
      sum > 0 &&
      (syncState == SYNC_IDLE ||
        syncState == SYNC_OK ||
        syncState == SYNC_CHECK)
    ) {
      title = `You have ${sum} documents not synchronized. Click to begin uploading.`;
    }
  }

  const doClick = useCallback(() => {
    if (!patreon) {
      setPatreonInfo(true);
    } else {
      if (
        syncState === SYNC_IDLE ||
        syncState == SYNC_ERR ||
        syncState == SYNC_OK ||
        syncState == SYNC_CHECK
      ) {
        ipcSend("sync_check");
        // Begin sync secuence
      }
    }
  }, [patreon, syncState]);

  const closePatreonDialog = useCallback(() => {
    setTimeout(() => {
      setPatreonInfo(false);
    }, 350);
  }, []);

  return (
    <>
      <div
        title={title}
        onClick={doClick}
        style={{ backgroundImage: `url(${image})` }}
        className={topNavCss.sync}
      ></div>
      {patreonInfo ? <PatreonInfo closeCallback={closePatreonDialog} /> : <></>}
    </>
  );
}

export function TopNav(): JSX.Element {
  const [compact, setCompact] = React.useState(false);
  const patreon = useSelector(
    (state: AppState) => state.renderer.patreon.patreon
  );
  const currentTab = useSelector((state: AppState) => state.renderer.topNav);
  const playerData = useSelector((state: AppState) => state.playerdata);
  const topNavIconsRef: any = React.useRef(null);
  const dispatcher = useDispatch();
  const windowSize = useWindowSize();

  const defaultTab = {
    dispatcher: dispatcher,
    compact: compact,
    currentTab: currentTab,
  };

  const homeTab = { ...defaultTab, id: MAIN_HOME, title: "" };
  const myDecksTab = { ...defaultTab, id: MAIN_DECKS, title: "MY DECKS" };
  const historyTab = { ...defaultTab, id: MAIN_MATCHES, title: "HISTORY" };
  const timelineTab = { ...defaultTab, id: MAIN_TIMELINE, title: "TIMELINE" };
  const eventsTab = { ...defaultTab, id: MAIN_EVENTS, title: "EVENTS" };
  const exploreTab = { ...defaultTab, id: MAIN_EXPLORE, title: "EXPLORE" };
  const cardsTab = { ...defaultTab, id: MAIN_CARDS, title: "CARDS" };
  const economyTab = { ...defaultTab, id: MAIN_ECONOMY, title: "ECONOMY" };
  const collectionTab = {
    ...defaultTab,
    id: MAIN_COLLECTION,
    title: "COLLECTION",
  };

  const contructedNav = {
    dispatcher: dispatcher,
    currentTab: currentTab,
    id: MAIN_CONSTRUCTED,
    rank: playerData.rank ? playerData.rank.constructed : null,
    rankClass: topNavCss.topConstructedRank,
  };

  const limitedNav = {
    dispatcher: dispatcher,
    currentTab: currentTab,
    id: MAIN_LIMITED,
    rank: playerData.rank ? playerData.rank.limited : null,
    rankClass: topNavCss.topLimitedRank,
  };

  React.useEffect(() => {
    if (topNavIconsRef.current.offsetWidth < 530) {
      if (!compact) {
        setCompact(true);
      }
    } else if (compact) {
      setCompact(false);
    }
  }, [windowSize, compact]);

  const userName = playerData.playerName.slice(0, -6);
  const userNumerical = playerData.playerName.slice(-6);

  return (
    <div className={topNavCss.container}>
      <div ref={topNavIconsRef} className={topNavCss.icons}>
        <TopNavItem {...homeTab} />
        <TopNavItem {...myDecksTab} />
        <TopNavItem {...historyTab} />
        <TopNavItem {...timelineTab} />
        <TopNavItem {...eventsTab} />
        <TopNavItem {...exploreTab} />
        <TopNavItem {...cardsTab} />
        <TopNavItem {...economyTab} />
        <TopNavItem {...collectionTab} />
      </div>
      <div className={topNavCss.info}>
        <div className={topNavCss.userdataContainer}>
          <TopRankIcon {...contructedNav} />
          <TopRankIcon {...limitedNav} />
          {patreon ? <PatreonBadge /> : null}
          <SyncBadge patreon={patreon} />
          <div className={topNavCss.topUsername} title={"Arena username"}>
            {userName}
          </div>
          <div className={topNavCss.topUsernameId} title={"Arena user ID"}>
            {userNumerical}
          </div>
          <IconButton
            style={{ margin: `auto 8px` }}
            onClick={(): void => forceOpenSettings()}
            icon={settingsIcon}
          />
        </div>
      </div>
    </div>
  );
}
