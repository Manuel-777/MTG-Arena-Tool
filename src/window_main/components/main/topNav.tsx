import _ from "lodash";
import React from "react";

import {
  get_rank_index as getRankIndex,
  formatRank
} from "../../../shared/util";

import {
  MAIN_HOME,
  MAIN_DECKS,
  MAIN_MATCHES,
  MAIN_EVENTS,
  MAIN_EXPLORE,
  MAIN_ECONOMY,
  MAIN_COLLECTION,
  MAIN_CONSTRUCTED,
  MAIN_LIMITED,
  IPC_NONE
} from "../../../shared/constants";
import { useDispatch, useSelector } from "react-redux";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import useWindowSize from "../../hooks/useWindowSize";
import uxMove from "../../uxMove";
import { reduxAction } from "../../../shared-redux/sharedRedux";

interface TopNavItemProps {
  dispatcher: any;
  currentTab: number;
  compact: boolean;
  id: number;
  title: string;
}

function TopNavItem(props: TopNavItemProps): JSX.Element {
  const { currentTab, compact, dispatcher, id, title } = props;

  const clickTab = React.useCallback(
    (tabId: number) => (): void => {
      reduxAction(dispatcher, "SET_TOPNAV", tabId, IPC_NONE);
      reduxAction(dispatcher, "SET_BACK_GRPID", 0, IPC_NONE);
      uxMove(0);
    },
    [dispatcher]
  );

  return compact ? (
    <div
      className={
        (currentTab === id ? "item_selected" : "") +
        " top_nav_item_no_label top_nav_item it" +
        id
      }
      onClick={clickTab(id)}
    >
      <div
        className={"top_nav_icon icon_" + id}
        title={_.camelCase(title)}
      ></div>
    </div>
  ) : (
    <div
      className={
        (currentTab === id ? "item_selected" : "") +
        " top_nav_item it" +
        id +
        (title == "" ? " top_nav_item_no_label" : "")
      }
      onClick={clickTab(id)}
    >
      {title !== "" ? (
        <span className={"top_nav_item_text"}>{title}</span>
      ) : (
        <div
          className={"top_nav_icon icon_" + id}
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
    tabId => (): void => {
      reduxAction(dispatcher, "SET_TOPNAV", tabId, IPC_NONE);
      reduxAction(dispatcher, "SET_BACK_GRPID", 0, IPC_NONE);
      uxMove(0);
    },
    [dispatcher]
  );

  if (rank == null) {
    // No rank badge, default to beginner and remove interactions
    const rankStyle = {
      backgroundPosition: "0px 0px"
    };
    return (
      <div className="top_nav_item">
        <div style={rankStyle} className={rankClass}></div>
      </div>
    );
  }

  const propTitle = formatRank(rank);
  const rankStyle = {
    backgroundPosition: getRankIndex(rank.rank, rank.tier) * -48 + "px 0px"
  };

  return (
    <div
      className={(selected ? "item_selected" : "") + " top_nav_item"}
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
    backgroundPosition: -40 * patreonTier + "px 0px"
  };

  return <div title={title} style={style} className="top_patreon"></div>;
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
    currentTab: currentTab
  };

  const homeTab = { ...defaultTab, id: MAIN_HOME, title: "" };
  const myDecksTab = { ...defaultTab, id: MAIN_DECKS, title: "DECKS" };
  const matchesTab = { ...defaultTab, id: MAIN_MATCHES, title: "MATCHES" };
  const eventsTab = { ...defaultTab, id: MAIN_EVENTS, title: "EVENTS" };
  const exploreTab = { ...defaultTab, id: MAIN_EXPLORE, title: "EXPLORE" };
  const economyTab = { ...defaultTab, id: MAIN_ECONOMY, title: "ECONOMY" };
  const collectionTab = {
    ...defaultTab,
    id: MAIN_COLLECTION,
    title: "COLLECTION"
  };

  const contructedNav = {
    dispatcher: dispatcher,
    currentTab: currentTab,
    id: MAIN_CONSTRUCTED,
    rank: playerData.rank ? playerData.rank.constructed : null,
    rankClass: "top_constructed_rank"
  };

  const limitedNav = {
    dispatcher: dispatcher,
    currentTab: currentTab,
    id: MAIN_LIMITED,
    rank: playerData.rank ? playerData.rank.limited : null,
    rankClass: "top_limited_rank"
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
    <div className="top_nav">
      <div ref={topNavIconsRef} className="top_nav_icons">
        <TopNavItem {...homeTab} />
        <TopNavItem {...myDecksTab} />
        <TopNavItem {...matchesTab} />
        <TopNavItem {...eventsTab} />
        <TopNavItem {...exploreTab} />
        <TopNavItem {...economyTab} />
        <TopNavItem {...collectionTab} />
      </div>
      <div className="top_nav_info">
        <div className="top_userdata_container">
          <TopRankIcon {...contructedNav} />
          <TopRankIcon {...limitedNav} />
          {patreon ? <PatreonBadge /> : null}
          <div className="top_username" title={"Arena username"}>
            {userName}
          </div>
          <div className="top_username_id" title={"Arena user ID"}>
            {userNumerical}
          </div>
        </div>
      </div>
    </div>
  );
}
