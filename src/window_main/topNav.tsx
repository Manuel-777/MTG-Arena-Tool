import _ from "lodash";
import React, { useEffect } from "react";
import ReactDOM from 'react-dom';
import { queryElements as $$ } from "../shared/dom-fns";
import { openTab, clickNav } from "./tabControl";
import pd from "../shared/player-data";

import {
    get_rank_index,
    formatRank
} from "../shared/util";

import {
  MAIN_HOME,
  MAIN_DECKS,
  MAIN_HISTORY,
  MAIN_EVENTS,
  MAIN_EXPLORE,
  MAIN_ECONOMY,
  MAIN_COLLECTION,
  MAIN_CONSTRUCTED,
  MAIN_LIMITED
} from "../shared/constants";

interface TopNavItemProps {
  currentTab: number,
  compact: boolean,
  id: number,
  callback: (id:number) => void,
  title: string
}

function TopNavItem(props:TopNavItemProps) {
  const {currentTab, compact, id, callback, title} = props;

  const clickTab = React.useCallback((tabId: number) => (event: React.MouseEvent<HTMLDivElement>) => {
    clickNav(tabId);
    callback(tabId);
  }, [props.id, props.callback]);

  return compact ? (
    <div className={(currentTab === id ? "item_selected" : "") + " top_nav_item_no_label top_nav_item it" + id} onClick={clickTab(id)}>
      <div className={"top_nav_icon icon_" + id} title={_.camelCase(title)}></div>
    </div>
  ) : (
    <div className={(currentTab === id ? "item_selected" : "") + " top_nav_item it" + id + (title == "" ? " top_nav_item_no_label" : "")} onClick={clickTab(id)}>
      {title !== "" ? (<span className={"top_nav_item_text"}>{title}</span>) : 
      (<div className={"top_nav_icon icon_" + id} title={_.camelCase(title)}></div>)}
    </div>
  );
}

interface topRankProps {
  currentTab: number,
  id: number,
  rank: any | null,
  callback: (id:number) => void,
  rankClass: string
}

function TopRankIcon(props:topRankProps) {
  const {currentTab, id, rank, callback, rankClass} = props;
  
  const selected = currentTab === id;

  const clickTab = React.useCallback((tabId) => (event: React.MouseEvent<HTMLDivElement>) => {
    clickNav(tabId);
    callback(tabId);
  }, [props.id, props.callback]);

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
    backgroundPosition: get_rank_index(rank.rank, rank.tier) * -48 + "px 0px"
  };

  return (
    <div className={(selected ? "item_selected" : "") + " top_nav_item"} onClick={clickTab(id)}>
      <div style={rankStyle} title={propTitle} className={rankClass}></div>
    </div>
  );
}

interface patreonProps {
  patreon: boolean,
  patreonTier: number
}

function PatreonBadge(props: patreonProps) {
  const { patreonTier } = props;

  let title = "Patreon Basic Tier";
  if (patreonTier === 1) title = "Patreon Standard Tier";
  if (patreonTier === 2) title = "Patreon Modern Tier";
  if (patreonTier === 3) title = "Patreon Legacy Tier";
  if (patreonTier === 4) title = "Patreon Vintage Tier";

  const style = {
    backgroundPosition: (-40 * patreonTier) + "px 0px"
  };

  return (
    <div title={title} style={style} className="top_patreon" ></div>
  );
}

function TopNav() {
  const [compact, setCompact] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState(pd.settings.last_open_tab);
  const topNavIconsRef:any = React.useRef(null);

  const defaultTab = {
    compact: compact,
    currentTab: currentTab,
    callback: setCurrentTab
  }

  const homeTab = {...defaultTab, id: MAIN_HOME, title:""};
  const myDecksTab = {...defaultTab, id: MAIN_DECKS, title:"MY DECKS"};
  const historyTab = {...defaultTab, id: MAIN_HISTORY, title:"HISTORY"};
  const eventsTab = {...defaultTab, id: MAIN_EVENTS, title:"EVENTS"};
  const exploreTab = {...defaultTab, id: MAIN_EXPLORE, title:"EXPLORE"};
  const economyTab = {...defaultTab, id: MAIN_ECONOMY, title:"ECONOMY"};
  const collectionTab = {...defaultTab, id: MAIN_COLLECTION, title:"COLLECTION"};
  
  const contructedNav = {
    callback: setCurrentTab,
    currentTab: currentTab,
    id: MAIN_CONSTRUCTED,
    rank: pd.rank ? pd.rank.constructed : null,
    rankClass: "top_constructed_rank"
  };

  const limitedNav = {
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
  });

  const patreon = {
    patreon: pd.patreon,
    patreonTier: pd.patreon_tier
  };

  let userName = pd.name.slice(0, -6);
  let userNumerical = pd.name.slice(-6);

  return (
    <div className="top_nav">
      <div ref={topNavIconsRef} className="top_nav_icons">
        <TopNavItem {...homeTab}/>
        <TopNavItem {...myDecksTab}/>
        <TopNavItem {...historyTab}/>
        <TopNavItem {...eventsTab}/>
        <TopNavItem {...exploreTab}/>
        <TopNavItem {...economyTab}/>
        <TopNavItem {...collectionTab}/>
      </div>
      <div className="top_nav_info">
        <div className="top_userdata_container">
          <TopRankIcon {...contructedNav}/>
          <TopRankIcon {...limitedNav}/>
          { pd.patreon ? <PatreonBadge {...patreon} /> : null }
          <div className="top_username" title={"Arena username"}>{userName}</div>
          <div className="top_username_id" title={"Arena user ID"}>{userNumerical}</div>
        </div>
      </div>
  </div>
  );
}

export default function createTopNav(parent: Element): boolean {
  ReactDOM.render(
    <TopNav />,
    parent
  );
  return true;
}

export function updateTopBar() {
  const topNavDiv = $$(".top_nav_container")[0];
  createTopNav(topNavDiv);

  if (pd.offline || !pd.settings.send_data) {
    $$(".unlink")[0].style.display = "block";
  }
}