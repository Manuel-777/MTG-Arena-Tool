import _ from "lodash";
import React from "react";
import { clickNav } from "../../tabControl";
import pd from "../../../shared/player-data";

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
  MAIN_LIMITED
} from "../../../shared/constants";
import {
  SET_TOP_NAV,
  dispatchAction,
  SET_LOADING,
  SET_BACKGROUND_IMAGE
} from "../../app/reducers";
import { useDispatch, useSelector } from "react-redux";
import { AppState } from "../../app/appState";

interface TopNavItemProps {
  dispatcher: unknown;
  currentTab: number;
  compact: boolean;
  id: number;
  callback: (id: number) => void;
  title: string;
}

function TopNavItem(props: TopNavItemProps): JSX.Element {
  const { currentTab, compact, id, callback, title } = props;

  const clickTab = React.useCallback(
    (tabId: number) => (): void => {
      dispatchAction(props.dispatcher, SET_TOP_NAV, tabId);
      dispatchAction(props.dispatcher, SET_BACKGROUND_IMAGE, "default");
      clickNav(tabId);
      callback(tabId);
    },
    [props.dispatcher, callback]
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
  dispatcher: unknown;
  currentTab: number;
  id: number;
  rank: any | null;
  callback: (id: number) => void;
  rankClass: string;
}

function TopRankIcon(props: TopRankProps): JSX.Element {
  const { currentTab, id, rank, callback, rankClass } = props;

  const selected = currentTab === id;
  const clickTab = React.useCallback(
    tabId => (): void => {
      dispatchAction(props.dispatcher, SET_TOP_NAV, tabId);
      dispatchAction(props.dispatcher, SET_BACKGROUND_IMAGE, "default");
      clickNav(tabId);
      callback(tabId);
    },
    [props.dispatcher, callback]
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
    (state: AppState) => state.patreon.patreonTier
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
  const patreon = useSelector((state: AppState) => state.patreon.patreon);
  const currentTab = useSelector((state: AppState) => state.topNav);
  const topNavIconsRef: any = React.useRef(null);
  const dispatcher = useDispatch();

  const setCurrentTab = React.useCallback(
    (tab: number) => {
      dispatchAction(dispatcher, SET_TOP_NAV, tab);
    },
    [dispatcher]
  );

  const defaultTab = {
    dispatcher: dispatcher,
    compact: compact,
    currentTab: currentTab,
    callback: setCurrentTab
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
    callback: setCurrentTab,
    currentTab: currentTab,
    id: MAIN_CONSTRUCTED,
    rank: pd.rank ? pd.rank.constructed : null,
    rankClass: "top_constructed_rank"
  };

  const limitedNav = {
    dispatcher: dispatcher,
    callback: setCurrentTab,
    currentTab: currentTab,
    id: MAIN_LIMITED,
    rank: pd.rank ? pd.rank.limited : null,
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
  }, [compact]);

  const userName = pd.name.slice(0, -6);
  const userNumerical = pd.name.slice(-6);

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
