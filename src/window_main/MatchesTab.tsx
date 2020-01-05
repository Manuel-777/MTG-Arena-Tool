import anime from "animejs";
import isValid from "date-fns/isValid";
import React from "react";
import { DATE_SEASON, EASING_DEFAULT, RANKS } from "../shared/constants";
import db from "../shared/database";
import { createDiv } from "../shared/dom-fns";
import pd from "../shared/player-data";
import Aggregator from "./aggregator";
import { AggregatorFilters } from "./components/decks/types";
import MatchesTable from "./components/matches/MatchesTable";
import {
  MatchesTableState,
  MatchTableData,
  SerializedMatch,
  TagCounts
} from "./components/matches/types";
import { openMatch } from "./match-details";
import mountReactComponent from "./mountReactComponent";
import {
  formatPercent,
  hideLoadingBars,
  ipcSend,
  makeResizable,
  resetMainContainer,
  toggleArchived
} from "./renderer-util";
import StatsPanel from "./stats-panel";

const { DEFAULT_ARCH, NO_ARCH, RANKED_CONST, RANKED_DRAFT } = Aggregator;
const tagPrompt = "Set archetype";

function openMatchDetails(id: string | number): void {
  openMatch(id);
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

function addTag(matchid: string, tag: string): void {
  const match = pd.match(matchid);
  if (!match || !tag) return;
  if ([tagPrompt, NO_ARCH, DEFAULT_ARCH].includes(tag)) return;
  if (match.tags && match.tags.includes(tag)) return;
  ipcSend("add_matches_tag", { matchid, tag });
}

function editTag(tag: string, color: string): void {
  ipcSend("edit_tag", { tag, color });
}

function deleteTag(matchid: string, tag: string): void {
  const match = pd.match(matchid);
  if (!match || !tag) return;
  if (!match.tags || !match.tags.includes(tag)) return;
  ipcSend("delete_matches_tag", { matchid, tag });
}

function getNextRank(currentRank: string): undefined | string {
  const rankIndex = (RANKS as any).indexOf(currentRank);
  if (rankIndex < RANKS.length - 1) {
    return RANKS[rankIndex + 1];
  } else {
    return undefined;
  }
}

function saveUserState(state: MatchesTableState): void {
  ipcSend("save_user_settings", {
    matchesTableState: state,
    matchesTableMode: state.matchesTableMode,
    skip_refresh: true
  });
}

function getStepsUntilNextRank(mode: boolean, winrate: number): string {
  const rr = mode ? pd.rank.limited : pd.rank.constructed;

  const cr = rr.rank;
  const cs = rr.step;
  const ct = rr.tier;

  let st = 1;
  let stw = 1;
  let stl = 0;
  if (cr == "Bronze") {
    st = 4;
    stw = 2;
    stl = 0;
  }
  if (cr == "Silver") {
    st = 5;
    stw = 2;
    stl = 1;
  }
  if (cr == "Gold") {
    st = 6;
    stw = 1;
    stl = 1;
  }
  if (cr == "Platinum") {
    st = 7;
    stw = 1;
    stl = 1;
  }
  if (cr == "Diamond") {
    st = 7;
    stw = 1;
    stl = 1;
  }

  const expectedValue = winrate * stw - (1 - winrate) * stl;
  if (expectedValue <= 0) return "&#x221e";

  const stepsNeeded = st * ct - cs;
  let expected = 0;
  let n = 0;
  // console.log("stepsNeeded", stepsNeeded);
  while (expected <= stepsNeeded) {
    expected = n * expectedValue;
    // console.log("stepsNeeded:", stepsNeeded, "expected:", expected, "N:", n);
    n++;
  }

  return "~" + n;
}

function renderRanksStats(
  container: HTMLElement,
  aggregator: any,
  isLimited: boolean
): void {
  container.innerHTML = "";
  if (!aggregator || !aggregator.stats.total) return;
  const { winrate } = aggregator.stats;

  const seasonName = !isLimited ? "constructed" : "limited";
  const switchSeasonName = isLimited ? "constructed" : "limited";
  const switchSeasonFilters: AggregatorFilters = {
    ...Aggregator.getDefaultFilters(),
    date: DATE_SEASON,
    eventId: isLimited ? RANKED_CONST : RANKED_DRAFT
  };

  const seasonToggleButton = createDiv(
    ["button_simple", "button_thin", "season_toggle"],
    `Show ${switchSeasonName}`
  );
  seasonToggleButton.style.margin = "8px auto";

  container.appendChild(seasonToggleButton);
  container.appendChild(
    createDiv(["ranks_history_title"], `Current ${seasonName} season:`)
  );

  const currentRank = isLimited
    ? pd.rank.limited.rank
    : pd.rank.constructed.rank;
  const expected = getStepsUntilNextRank(isLimited, winrate);
  container.appendChild(
    createDiv(
      ["ranks_history_title"],
      `Games until ${getNextRank(currentRank)}: ${expected}`,
      { title: `Using ${formatPercent(winrate)} winrate` }
    )
  );

  seasonToggleButton.addEventListener("click", () => {
    openMatchesTab(switchSeasonFilters);
  });
}

function updateStatsPanel(
  container: HTMLElement,
  aggregator: Aggregator
): void {
  container.innerHTML = "";
  const filters = aggregator.filters;
  const { date, eventId } = filters;
  let rankedStats;
  const showingRanked =
    date === DATE_SEASON &&
    (eventId === RANKED_CONST || eventId === RANKED_DRAFT);
  const isLimited = eventId === RANKED_DRAFT;

  const div = createDiv(["ranks_history"]);
  div.style.padding = "0 12px";

  if (showingRanked) {
    const rankStats = createDiv(["ranks_stats"]);
    renderRanksStats(rankStats, aggregator, isLimited);
    rankStats.style.paddingBottom = "16px";
    div.appendChild(rankStats);

    rankedStats =
      eventId === RANKED_CONST
        ? aggregator.constructedStats
        : aggregator.limitedStats;
  }
  if (eventId === RANKED_CONST) {
    rankedStats = aggregator.constructedStats;
  }
  const statsPanel = new StatsPanel(
    "matches_top",
    aggregator,
    pd.settings.right_panel_width,
    true,
    rankedStats,
    isLimited
  );
  const statsPanelDiv = statsPanel.render();
  statsPanelDiv.style.display = "flex";
  statsPanelDiv.style.flexDirection = "column";
  statsPanelDiv.style.marginTop = "16px";
  statsPanelDiv.style.padding = "12px";
  div.appendChild(statsPanelDiv);
  const drag = createDiv(["dragger"]);
  container.appendChild(drag);
  makeResizable(drag, statsPanel.handleResize);
  container.appendChild(div);
}

function getMatchesData(aggregator: Aggregator): MatchTableData[] {
  return pd.matchList
    .filter((match: SerializedMatch) => {
      // legacy filter logic
      if (match == undefined) {
        return false;
      }
      if (!match.opponent || !match.opponent.userid) {
        return false;
      }
      if (match.opponent.userid.indexOf("Familiar") !== -1) {
        return false;
      }
      return aggregator.filterMatch(match);
    })
    .map(
      (match: SerializedMatch): MatchTableData => {
        const timestamp = new Date(match.date ?? NaN);
        const colors = match.playerDeck.colors ?? [];
        const oppColors = match.oppDeck.colors ?? [];
        return {
          ...match,
          archivedSortVal: match.archived ? 1 : 0,
          custom: true,
          colors,
          colorSortVal: colors.join(""),
          deckId: match.playerDeck.id ?? "",
          deckName: match.playerDeck.name ?? "",
          deckTags: match.playerDeck.tags ?? [],
          deckFormat: match.playerDeck.format ?? "",
          losses: match.opponent.win,
          oppArchetype: match.oppDeck.archetype ?? "unknown",
          oppColors,
          oppColorSortVal: oppColors.join(""),
          oppLeaderboardPlace: match.opponent.leaderboardPlace,
          oppName: match.opponent.name ?? "",
          oppPercentile: match.opponent.percentile
            ? match.opponent.percentile / 100
            : undefined,
          oppRank: match.opponent.rank,
          oppTier: match.opponent.tier,
          oppUserId: match.opponent.userid,
          tags: match.tags ?? [],
          timestamp: isValid(timestamp) ? timestamp.getTime() : NaN,
          wins: match.player.win
        };
      }
    );
}

function getTotalAggData(): [string[], TagCounts] {
  const totalAgg = new Aggregator();
  const allTags = [
    ...(totalAgg.archs ?? []).filter(
      arch => arch !== NO_ARCH && arch !== DEFAULT_ARCH
    ),
    ...Object.values(db.archetypes).map(arch => arch.name)
  ];
  const tags = [...new Set(allTags)].map(tag => {
    const count = (totalAgg.archCounts as any)?.[String(tag)] ?? 0;
    return { tag, q: count };
  });
  return [totalAgg.events, tags];
}

export function MatchesTab({
  aggFiltersArg
}: {
  aggFiltersArg: AggregatorFilters;
}): JSX.Element {
  const {
    matchesTableMode,
    matchesTableState,
    last_date_filter: dateFilter,
    right_panel_width: panelWidth
  } = pd.settings;
  const showArchived =
    matchesTableState?.filters?.archivedCol !== "hideArchived";
  const defaultAggFilters = {
    ...Aggregator.getDefaultFilters(),
    date: dateFilter,
    ...aggFiltersArg,
    showArchived
  };
  const [aggFilters, setAggFilters] = React.useState(
    defaultAggFilters as AggregatorFilters
  );
  const [events, tags] = React.useMemo(getTotalAggData, []);
  const data = React.useMemo(() => {
    const aggregator = new Aggregator(aggFilters);
    return getMatchesData(aggregator);
  }, [aggFilters]);

  const sidePanelWidth = panelWidth + "px";
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const filterMatchesCallback = React.useCallback(
    (matchIds?: string | string[]): void => {
      if (rightPanelRef?.current) {
        updateStatsPanel(
          rightPanelRef.current,
          new Aggregator({ ...aggFilters, matchIds })
        );
      }
    },
    [rightPanelRef, aggFilters]
  );

  return (
    <>
      <div
        className={"wrapper_column"}
        style={{
          overflowX: "auto"
        }}
      >
        <MatchesTable
          data={data}
          aggFilters={aggFilters}
          events={events}
          tags={tags}
          cachedState={matchesTableState}
          cachedTableMode={matchesTableMode}
          setAggFiltersCallback={setAggFilters}
          tableStateCallback={saveUserState}
          filterMatchesCallback={filterMatchesCallback}
          openMatchCallback={openMatchDetails}
          archiveCallback={toggleArchived}
          addTagCallback={addTag}
          editTagCallback={editTag}
          deleteTagCallback={deleteTag}
        />
      </div>
      <div
        ref={rightPanelRef}
        className={"wrapper_column sidebar_column_l"}
        style={{
          width: sidePanelWidth,
          flex: `0 0 ${sidePanelWidth}`
        }}
      ></div>
    </>
  );
}

export function openMatchesTab(aggFilters: AggregatorFilters = {}): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mainDiv.classList.add("flex_item");
  mountReactComponent(<MatchesTab aggFiltersArg={aggFilters} />, mainDiv);
}
