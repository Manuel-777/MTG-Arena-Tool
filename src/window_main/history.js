import anime from "animejs";
import autocomplete from "../shared/autocomplete";
import {
  DATE_SEASON,
  DEFAULT_TILE,
  EASING_DEFAULT,
  RANKS
} from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import { createDiv, createInput } from "../shared/dom-fns";
import { makeId } from "../shared/util";
import Aggregator from "./aggregator";
import DataScroller from "./data-scroller";
import FilterPanel from "./FilterPanel";
import ListItem from "./listItem";
import StatsPanel from "./stats-panel";
import {
  attachDraftData,
  attachMatchData,
  formatPercent,
  getTagColor,
  ipcSend,
  makeResizable,
  resetMainContainer,
  showColorpicker,
  toggleArchived
} from "./renderer-util";
import { openDraft } from "./draft-details";
import { openMatch } from "./match-details";
import mountReactComponent from "./mountReactComponent";

const byId = id => document.getElementById(id);
const {
  DEFAULT_DECK,
  DEFAULT_ARCH,
  NO_ARCH,
  RANKED_CONST,
  RANKED_DRAFT
} = Aggregator;
let filters = Aggregator.getDefaultFilters();
let filteredMatches;
let sortedHistory;
let totalAgg;
const tagPrompt = "Set archetype";

function getNextRank(currentRank) {
  const rankIndex = RANKS.indexOf(currentRank);
  if (rankIndex < RANKS.length - 1) {
    return RANKS[rankIndex + 1];
  } else {
    return undefined;
  }
}

export function setFilters(selected = {}) {
  if (selected.eventId || selected.date) {
    // clear all dependent filters
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: filters.date,
      eventId: filters.eventId,
      showArchived: filters.showArchived,
      ...selected
    };
  } else if (selected.tag || selected.colors) {
    // tag or colors filters resets deck filter
    filters = {
      ...filters,
      deckId: DEFAULT_DECK,
      ...selected
    };
  } else {
    // default case
    filters = { ...filters, date: pd.settings.last_date_filter, ...selected };
  }
}

export function openHistoryTab(_filters = {}, dataIndex = 25, scrollTop = 0) {
  const mainDiv = resetMainContainer();
  mainDiv.classList.add("flex_item");

  sortedHistory = [...pd.history];
  sortedHistory.sort(compare_matches);
  setFilters(_filters);
  totalAgg = new Aggregator({ date: filters.date });
  if (
    filters.arch !== Aggregator.DEFAULT_ARCH &&
    !totalAgg.archs.includes(filters.arch)
  ) {
    filters.arch = Aggregator.DEFAULT_ARCH;
  }
  filteredMatches = new Aggregator(filters);

  const wrap_r = createDiv(["wrapper_column", "sidebar_column_l"]);
  wrap_r.style.width = pd.settings.right_panel_width + "px";
  wrap_r.style.flex = `0 0 ${pd.settings.right_panel_width}px`;

  const div = createDiv(["ranks_history"]);
  div.style.padding = "0 12px";

  let rankedStats;
  const showingRanked =
    filters.date === DATE_SEASON &&
    (filters.eventId === RANKED_CONST || filters.eventId === RANKED_DRAFT);
  if (showingRanked) {
    const rankStats = createDiv(["ranks_stats"]);
    renderRanksStats(rankStats, filteredMatches);
    rankStats.style.paddingBottom = "16px";
    div.appendChild(rankStats);
    rankedStats =
      filters.eventId === RANKED_CONST
        ? filteredMatches.constructedStats
        : filteredMatches.limitedStats;
  }
  if (filters.eventId === RANKED_CONST) {
    rankedStats = filteredMatches.constructedStats;
  }

  const statsPanel = new StatsPanel(
    "history_top",
    filteredMatches,
    pd.settings.right_panel_width,
    true,
    rankedStats,
    filters.eventId === RANKED_DRAFT
  );
  const historyTopWinrate = statsPanel.render();
  div.appendChild(historyTopWinrate);

  const drag = createDiv(["dragger"]);
  wrap_r.appendChild(drag);
  makeResizable(drag, statsPanel.handleResize);
  wrap_r.appendChild(div);

  const wrap_l = createDiv(["wrapper_column"]);
  wrap_l.appendChild(createDiv(["list_fill"]));

  const historyTop = createDiv(["history_top"]);
  const eventFilter = { eventId: filters.eventId, date: filters.date };
  const matchesInEvent = new Aggregator(eventFilter);
  const matchesInPartialDeckFilters = new Aggregator({
    ...eventFilter,
    tag: filters.tag,
    colors: filters.colors
  });
  const filterPanel = new FilterPanel(
    "history_top",
    selected => openHistoryTab(selected),
    filters,
    totalAgg.events,
    matchesInEvent.tags,
    matchesInPartialDeckFilters.decks,
    true,
    matchesInEvent.archs,
    true,
    matchesInEvent.archCounts,
    true
  );
  mountReactComponent(filterPanel.render(), historyTop);
  wrap_l.appendChild(historyTop);

  mainDiv.appendChild(wrap_l);
  const dataScroller = new DataScroller(
    wrap_l,
    renderData,
    20,
    sortedHistory.length
  );
  dataScroller.render(dataIndex, scrollTop);

  mainDiv.appendChild(wrap_r);
}

// return val = how many rows it rendered into container
function renderData(container, index) {
  // for performance reasons, we leave matches order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = sortedHistory.length - index - 1;
  const match = sortedHistory[revIndex];

  //console.log("match: ", id, match);
  if (match == undefined) {
    return 0;
  }

  if (match.type == "match") {
    if (!match.opponent || !match.opponent.userid) {
      return 0;
    }
    if (match.opponent.userid.indexOf("Familiar") !== -1) {
      return 0;
    }
  }

  if (match.type == "Event") {
    return 0;
  }

  if (!filteredMatches.filterMatch(match)) {
    return 0;
  }

  let tileGrpid, clickCallback;
  if (match.type == "match") {
    tileGrpid = match.playerDeck.deckTileId;
    clickCallback = handleOpenMatch;
  } else {
    if (match.set in db.sets && db.sets[match.set].tile) {
      tileGrpid = db.sets[match.set].tile;
    } else {
      tileGrpid = DEFAULT_TILE;
    }
    clickCallback = handleOpenDraft;
  }
  const deleteCallback = id => {
    toggleArchived(id);
  };

  const listItem = new ListItem(
    tileGrpid,
    match.id,
    clickCallback,
    deleteCallback,
    match.archived
  );
  listItem.divideLeft();
  listItem.divideRight();

  if (match.type === "match") {
    attachMatchData(listItem, match);
    container.appendChild(listItem.container);

    // Render tag
    const tagsDiv = byId("history_tags_" + match.id);
    const allTags = [
      ...totalAgg.archs.filter(
        arch => arch !== NO_ARCH && arch !== DEFAULT_ARCH
      ),
      ...db.archetypes.map(arch => arch.name)
    ];
    const tags = [...new Set(allTags)].map(tag => {
      const count = totalAgg.archCounts[tag] || 0;
      return { tag, q: count };
    });
    if (match.tags && match.tags.length) {
      match.tags.forEach(tag => createTag(tagsDiv, match.id, tags, tag, true));
    } else {
      createTag(tagsDiv, match.id, tags, null, false);
    }
  } else {
    attachDraftData(listItem, match);
    container.appendChild(listItem.container);
  }

  //console.log("Load match: ", match_id, match);
  //console.log("Match: ", match.type, match);
  return 1;
}

function handleOpenMatch(id) {
  openMatch(id);
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

function handleOpenDraft(id) {
  openDraft(id);
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

function renderRanksStats(container, aggregator) {
  container.innerHTML = "";
  if (!aggregator || !aggregator.stats.total) return;
  const { winrate } = aggregator.stats;

  const viewingLimitSeason = filters.eventId === RANKED_DRAFT;
  const seasonName = !viewingLimitSeason ? "constructed" : "limited";
  const switchSeasonName = viewingLimitSeason ? "constructed" : "limited";
  const switchSeasonFilters = {
    ...Aggregator.getDefaultFilters(),
    date: DATE_SEASON,
    eventId: viewingLimitSeason ? RANKED_CONST : RANKED_DRAFT
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

  const currentRank = viewingLimitSeason
    ? pd.rank.limited.rank
    : pd.rank.constructed.rank;
  const expected = getStepsUntilNextRank(viewingLimitSeason, winrate);
  container.appendChild(
    createDiv(
      ["ranks_history_title"],
      `Games until ${getNextRank(currentRank)}: ${expected}`,
      { title: `Using ${formatPercent(winrate)} winrate` }
    )
  );

  seasonToggleButton.addEventListener("click", () => {
    openHistoryTab(switchSeasonFilters);
  });
}

function createTag(div, matchId, tags, tag, showClose = true) {
  const tagCol = getTagColor(tag);
  const iid = makeId(6);
  const t = createDiv(["deck_tag", iid], tag || tagPrompt);
  t.style.backgroundColor = tagCol;

  if (tag) {
    t.addEventListener("click", function(e) {
      e.stopPropagation();
      showColorpicker(
        tagCol,
        color => (t.style.backgroundColor = color.rgbString),
        color => ipcSend("edit_tag", { tag, color: color.rgbString }),
        () => (t.style.backgroundColor = tagCol)
      );
    });
  } else {
    t.addEventListener("click", function(e) {
      t.innerHTML = "";
      const ac = createDiv(["autocomplete"]);
      const input = createInput(["deck_tag_input"], "", {
        id: iid,
        type: "text",
        autocomplete: "off",
        placeholder: tagPrompt,
        size: 1
      });
      input.style.minWidth = "120px";
      input.addEventListener("keyup", function(e) {
        if (e.keyCode === 13) {
          e.stopPropagation();
          const val = this.value;
          if (val && val !== tagPrompt) {
            addTag(matchId, val);
          }
        } else {
          setTimeout(() => {
            input.style.width = this.value.length * 8 + "px";
          }, 10);
        }
      });
      const focusAndSave = () => {
        input.focus();
        input.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 13 }));
      };
      autocomplete(input, tags, focusAndSave, focusAndSave);

      ac.appendChild(input);
      t.appendChild(ac);
      input.focus();

      e.stopPropagation();
    });
  }

  if (showClose && tag) {
    const tc = createDiv(["deck_tag_close"]);
    tc.addEventListener("click", function(e) {
      e.stopPropagation();
      tc.style.visibility = "hidden";
      deleteTag(matchId, tag);
    });
    t.appendChild(tc);
  } else {
    t.style.paddingRight = "12px";
  }
  div.appendChild(t);
  return t;
}

function addTag(matchid, tag) {
  const match = pd.match(matchid);
  if (!match || !tag) return;
  if ([tagPrompt, NO_ARCH, DEFAULT_ARCH].includes(tag)) return;
  if (match.tags && match.tags.includes(tag)) return;

  ipcSend("add_history_tag", { matchid, tag });
}

function deleteTag(matchid, tag) {
  const match = pd.match(matchid);
  if (!match || !tag) return;
  if (!match.tags || !match.tags.includes(tag)) return;

  ipcSend("delete_history_tag", { matchid, tag });
}

function getStepsUntilNextRank(mode, winrate) {
  let rr = mode ? pd.rank.limited : pd.rank.constructed;

  let cr = rr.rank;
  let cs = rr.step;
  let ct = rr.tier;

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

  let stepsNeeded = st * ct - cs;
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

function compare_matches(a, b) {
  if (a === undefined) return 0;
  if (b === undefined) return 0;

  return Date.parse(a.date) - Date.parse(b.date);
}
