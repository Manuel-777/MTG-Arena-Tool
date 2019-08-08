const anime = require("animejs");
const compareAsc = require("date-fns/compareAsc");
const compareDesc = require("date-fns/compareDesc");

const autocomplete = require("../shared/autocomplete");
const {
  DATE_SEASON,
  DEFAULT_TILE,
  EASING_DEFAULT,
  HISTORY_MATCHES,
  HISTORY_EVENTS,
  HISTORY_DRAFTS,
  HISTORY_METAGAME,
  MANA,
  RANKS
} = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const {
  createDiv,
  createInput,
  createLabel,
  queryElements: $$,
  queryElementsByClass
} = require("../shared/dom-fns");
const { createSelect } = require("../shared/select");
const {
  get_deck_colors,
  get_rank_index_16,
  getReadableEvent,
  makeId,
  timeSince,
  toMMSS
} = require("../shared/util");

const Aggregator = require("./aggregator");
const DataScroller = require("./data-scroller");
const ListItem = require("./list-item");
const StatsPanel = require("./stats-panel");
const {
  formatPercent,
  getEventWinLossClass,
  getTagColor,
  hideLoadingBars,
  ipcSend,
  openDialog,
  openDraft,
  resetMainContainer,
  showColorpicker,
  showLoadingBars,
  toggleArchived
} = require("./renderer-util");
const {
  getTagString,
  renderArchivedFilter,
  renderDateFilter,
  renderDeckFilter,
  renderManaFilter
} = require("./filters");
const { openMatch } = require("./match-details");

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

let lastOpenSection = HISTORY_MATCHES;

function getNextRank(currentRank) {
  const rankIndex = RANKS.indexOf(currentRank);
  if (rankIndex < RANKS.length - 1) {
    return RANKS[rankIndex + 1];
  } else {
    return undefined;
  }
}

function setFilters(selected = {}) {
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

function openHistoryTab(
  _filters = {},
  dataIndex = 25,
  scrollTop = 0,
  openSection = lastOpenSection
) {
  if (openSection !== -1) {
    lastOpenSection = openSection;
  } else {
    openSection = lastOpenSection;
  }
  setFilters(_filters);
  totalAgg = new Aggregator({ date: filters.date });
  filteredMatches = new Aggregator(filters);

  hideLoadingBars();
  const mainDiv = resetMainContainer();
  mainDiv.classList.add("flex_item");

  const navCol = createDiv(["wrapper_column", "sidebar_column_r"]);
  navCol.appendChild(createDiv(["list_fill"]));

  // Primary section nav
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + HISTORY_MATCHES], "Matches")
  );
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + HISTORY_EVENTS], "Events")
  );
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + HISTORY_DRAFTS], "Drafts")
  );
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + HISTORY_METAGAME], "Metagame")
  );
  navCol.appendChild(createDiv(["list_fill"]));
  navCol.appendChild(createDiv(["list_fill"]));

  const updateFilterHandler = key => {
    return value => openHistoryTab({ [key]: value });
  };

  // Filters
  navCol.appendChild(createLabel(["filter_label"], "Filters:"));
  renderDateFilter(filters.date, updateFilterHandler("date"), navCol);
  renderArchivedFilter(
    filters.showArchived,
    updateFilterHandler("showArchived"),
    navCol
  );

  if ([HISTORY_MATCHES, HISTORY_METAGAME].includes(openSection)) {
    const eventFilter = { eventId: filters.eventId, date: filters.date };
    const matchesInEvent = new Aggregator(eventFilter);
    const matchesInPartialDeckFilters = new Aggregator({
      ...eventFilter,
      tag: filters.tag,
      colors: filters.colors
    });
    createSelect(
      navCol,
      totalAgg.events,
      filters.eventId,
      updateFilterHandler("eventId"),
      "select_filter",
      getReadableEvent
    );
    navCol.appendChild(createDiv(["list_fill"]));

    navCol.appendChild(createLabel(["filter_label"], "My Deck:"));
    renderManaFilter(filters.colors, updateFilterHandler("colors"), navCol);
    createSelect(
      navCol,
      matchesInEvent.tags,
      filters.tag,
      updateFilterHandler("tag"),
      "select_filter",
      getTagString
    );
    renderDeckFilter(
      filters.deckId,
      matchesInPartialDeckFilters.decks,
      updateFilterHandler("deckId"),
      navCol
    );
    navCol.appendChild(createDiv(["list_fill"]));

    navCol.appendChild(createLabel(["filter_label"], "Opponent:"));
    renderManaFilter(
      filters.oppColors,
      updateFilterHandler("oppColors"),
      navCol
    );
    createSelect(
      navCol,
      matchesInEvent.archs,
      filters.arch,
      updateFilterHandler("arch"),
      "select_filter",
      tag => getTagString(tag, matchesInEvent.archCounts)
    );
  } else if (openSection === HISTORY_EVENTS) {
    createSelect(
      navCol,
      totalAgg.trackEvents,
      filters.eventId,
      updateFilterHandler("eventId"),
      "select_filter",
      getReadableEvent
    );
  }

  mainDiv.appendChild(navCol);

  // Nav Event Handlers
  $$(".sn" + openSection)[0].classList.add("nav_selected");
  $$(".settings_nav").forEach(el =>
    el.addEventListener("click", function() {
      const classList = [...this.classList];
      if (classList.includes("nav_selected")) return;

      if (classList.includes("sn1")) {
        openHistoryTab({}, 0, 0, 1);
      } else if (classList.includes("sn2")) {
        openHistoryTab({}, 0, 0, 2);
      } else if (classList.includes("sn3")) {
        openHistoryTab({}, 0, 0, 3);
      } else if (classList.includes("sn4")) {
        openHistoryTab({}, 0, 0, 4);
      }
    })
  );

  const mainCol = createDiv(["wrapper_column"]);
  mainCol.appendChild(createDiv(["list_fill"]));
  mainDiv.appendChild(mainCol);

  if (openSection === HISTORY_METAGAME) {
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
      pd.windowBounds.width - 300,
      true,
      rankedStats,
      filters.eventId === RANKED_DRAFT
    );
    const historyTopWinrate = statsPanel.render();
    div.appendChild(historyTopWinrate);

    mainCol.appendChild(div);
    return;
  }

  let renderData;
  if (openSection === HISTORY_MATCHES) {
    sortedHistory = [...pd.matchList];
    sortedHistory.sort(compare_matches);
    if (
      filters.arch !== Aggregator.DEFAULT_ARCH &&
      !totalAgg.archs.includes(filters.arch)
    ) {
      filters.arch = Aggregator.DEFAULT_ARCH;
    }
    renderData = renderMatch;
  } else if (openSection === HISTORY_EVENTS) {
    sortedHistory = [...pd.eventList];
    sortedHistory.sort(compareEvents);
    renderData = renderEvent;
  } else if (openSection === HISTORY_DRAFTS) {
    sortedHistory = [...pd.draftList];
    sortedHistory.sort(compare_matches);
    renderData = renderDraft;
  }

  const dataScroller = new DataScroller(
    mainCol,
    renderData,
    20,
    sortedHistory.length
  );
  dataScroller.render(dataIndex, scrollTop);
}

// return val = how many rows it rendered into container
function renderMatch(container, index) {
  // for performance reasons, we leave matches order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = sortedHistory.length - index - 1;
  const match = sortedHistory[revIndex];

  if (!match || !match.opponent) return 0;
  if (!filteredMatches.filterMatch(match)) return 0;
  if (match.opponent.userid.includes("Familiar")) return 0;

  const listItem = new ListItem(
    match.playerDeck.deckTileId,
    match.id,
    handleOpenMatch,
    toggleArchived,
    match.archived
  );
  listItem.divideLeft();
  listItem.divideRight();

  attachMatchData(listItem, match);
  container.appendChild(listItem.container);

  // Render tag
  const tagsDiv = byId("history_tags_" + match.id);
  const allTags = [
    ...totalAgg.archs.filter(arch => arch !== NO_ARCH && arch !== DEFAULT_ARCH),
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
  return 1;
}

// return val = how many rows it rendered into container
function renderDraft(container, index) {
  // for performance reasons, we leave matches order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = sortedHistory.length - index - 1;
  const draft = sortedHistory[revIndex];

  if (
    !draft ||
    (draft.archived && !filters.showArchived) ||
    !filteredMatches ||
    !filteredMatches.filterDate(draft.date)
  )
    return 0;

  let tileGrpid = DEFAULT_TILE;
  if (draft.set in db.sets && db.sets[draft.set].tile) {
    tileGrpid = db.sets[draft.set].tile;
  }

  const listItem = new ListItem(
    tileGrpid,
    draft.id,
    handleOpenDraft,
    toggleArchived,
    draft.archived
  );
  listItem.divideLeft();
  listItem.divideRight();

  attachDraftData(listItem, draft);
  container.appendChild(listItem.container);
  return 1;
}

// return val = how many rows it rendered into container
function renderEvent(container, index) {
  // for performance reasons, we leave events order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = sortedHistory.length - index - 1;
  const course = sortedHistory[revIndex];

  if (
    course === undefined ||
    course.CourseDeck === undefined ||
    (course.archived && !filters.showArchived)
  ) {
    return 0;
  }

  if (!filteredMatches) return 0;
  if (!filteredMatches.filterDate(course.date)) return 0;
  if (!filteredMatches.filterEvent(course.InternalEventName)) {
    return 0;
  }

  const tileGrpid = course.CourseDeck.deckTileId;
  let listItem;
  if (course.custom) {
    const archiveCallback = id => {
      toggleArchived(id);
    };

    listItem = new ListItem(
      tileGrpid,
      course.id,
      expandEvent,
      archiveCallback,
      course.archived
    );
  } else {
    listItem = new ListItem(tileGrpid, course.id, expandEvent);
  }
  listItem.divideLeft();
  listItem.divideRight();
  attachEventData(listItem, course);

  var divExp = createDiv([course.id + "exp", "list_event_expand"]);

  container.appendChild(listItem.container);
  container.appendChild(divExp);
  return 1;
}

// converts a match index from a courses
// object into a valid index into the
// matchesHistory object
function getMatchesHistoryIndex(matchIndex) {
  if (pd.matchExists(matchIndex)) {
    return matchIndex;
  }

  const newStyleMatchIndex = `${matchIndex}-${pd.arenaId}`;
  if (pd.matchExists(newStyleMatchIndex)) {
    return newStyleMatchIndex;
  }

  // We couldn't find a matching index
  // data might be corrupt
  return undefined;
}

function getWlGate(course) {
  // quick hack to handle new War of the Spark Lore Events
  const wlGate =
    course.ModuleInstanceData.WinLossGate ||
    course.ModuleInstanceData.WinNoGate;
  return wlGate;
}

// Given a courses object returns all of the matches
function getCourseStats(course) {
  const wlGate = getWlGate(course);
  let matchesList = wlGate ? wlGate.ProcessedMatchIds : undefined;
  const stats = { wins: 0, losses: 0, duration: 0 };
  if (!matchesList) return stats;

  matchesList
    .map(getMatchesHistoryIndex)
    .map(pd.match)
    .filter(
      match =>
        match &&
        match.type === "match" &&
        (!match.archived || filters.showArchived)
    )
    .forEach(match => {
      // some of the data is wierd. Games which last years or have no data.
      if (match.duration && match.duration < 3600) {
        stats.duration += match.duration;
      }
      if (match.player.win > match.opponent.win) {
        stats.wins++;
      } else if (match.player.win < match.opponent.win) {
        stats.losses++;
      }
    });
  return stats;
}

function attachMatchData(listItem, match) {
  // Deck name
  const deckNameDiv = createDiv(["list_deck_name"], match.playerDeck.name);
  listItem.leftTop.appendChild(deckNameDiv);

  // Event name
  const eventNameDiv = createDiv(
    ["list_deck_name_it"],
    getReadableEvent(match.eventId)
  );
  listItem.leftTop.appendChild(eventNameDiv);

  match.playerDeck.colors.forEach(color => {
    const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
    listItem.leftBottom.appendChild(m);
  });

  // Opp name
  if (match.opponent.name == null) match.opponent.name = "-#000000";
  const oppNameDiv = createDiv(
    ["list_match_title"],
    "vs " + match.opponent.name.slice(0, -6)
  );
  listItem.rightTop.appendChild(oppNameDiv);

  // Opp rank
  const oppRank = createDiv(["ranks_16"]);
  oppRank.style.marginRight = "0px";
  oppRank.style.backgroundPosition =
    get_rank_index_16(match.opponent.rank) * -16 + "px 0px";
  oppRank.title = match.opponent.rank + " " + match.opponent.tier;
  listItem.rightTop.appendChild(oppRank);

  // Match time
  const matchTime = createDiv(
    ["list_match_time"],
    timeSince(new Date(match.date)) + " ago - " + toMMSS(match.duration)
  );
  listItem.rightBottom.appendChild(matchTime);

  // Opp colors
  get_deck_colors(match.oppDeck).forEach(color => {
    const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
    listItem.rightBottom.appendChild(m);
  });

  const tagsDiv = createDiv(["history_tags"], "", {
    id: "history_tags_" + match.id
  });
  listItem.rightBottom.appendChild(tagsDiv);

  // Result
  const resultDiv = createDiv(
    [
      "list_match_result",
      match.player.win > match.opponent.win ? "green" : "red"
    ],
    `${match.player.win}:${match.opponent.win}`
  );
  listItem.right.after(resultDiv);

  // On the play/draw
  if (match.onThePlay) {
    let onThePlay = false;
    if (match.player.seat == match.onThePlay) {
      onThePlay = true;
    }
    const div = createDiv([onThePlay ? "ontheplay" : "onthedraw"]);
    div.title = onThePlay ? "On the play" : "On the draw";
    listItem.right.after(div);
  }
}

function attachDraftData(listItem, draft) {
  // console.log("Draft: ", match);

  const draftSetDiv = createDiv(["list_deck_name"], draft.set + " draft");
  listItem.leftTop.appendChild(draftSetDiv);

  const draftTimeDiv = createDiv(
    ["list_match_time"],
    timeSince(new Date(draft.date)) + " ago."
  );
  listItem.rightBottom.appendChild(draftTimeDiv);

  const replayDiv = createDiv(["list_match_replay"], "See replay");
  listItem.rightTop.appendChild(replayDiv);

  const replayShareButton = createDiv(["list_draft_share", draft.id + "dr"]);
  replayShareButton.addEventListener("click", e => {
    e.stopPropagation();
    const cont = createDiv(["dialog_content"]);
    cont.style.width = "500px";

    cont.append(createDiv(["share_title"], "Link for sharing:"));
    const icd = createDiv(["share_input_container"]);
    const linkInput = createInput([], "", {
      id: "share_input",
      autocomplete: "off"
    });
    linkInput.addEventListener("click", () => linkInput.select());
    icd.appendChild(linkInput);
    const but = createDiv(["button_simple"], "Copy");
    but.addEventListener("click", function() {
      ipcSend("set_clipboard", byId("share_input").value);
    });
    icd.appendChild(but);
    cont.appendChild(icd);

    cont.appendChild(createDiv(["share_subtitle"], "<i>Expires in: </i>"));
    createSelect(
      cont,
      ["One day", "One week", "One month", "Never"],
      "",
      () => draftShareLink(draft.id),
      "expire_select"
    );

    openDialog(cont);
    draftShareLink(draft.id);
  });
  listItem.right.after(replayShareButton);
}

function draftShareLink(id) {
  const shareExpire = $$(".expire_select")[0].value;
  let expire = 0;
  switch (shareExpire) {
    case "One day":
      expire = 0;
      break;
    case "One week":
      expire = 1;
      break;
    case "One month":
      expire = 2;
      break;
    case "Never":
      expire = -1;
      break;
    default:
      expire = 0;
      break;
  }
  showLoadingBars();
  ipcSend("request_draft_link", { expire, id });
}

function attachEventData(listItem, course) {
  let deckName = getReadableEvent(course.InternalEventName);
  let deckNameDiv = createDiv(["list_deck_name"], deckName);
  listItem.leftTop.appendChild(deckNameDiv);

  course.CourseDeck.colors.forEach(color => {
    let m = createDiv(["mana_s20", `mana_${MANA[color]}`]);
    listItem.leftBottom.appendChild(m);
  });

  var eventState = course.CurrentEventState;
  if (course.custom || eventState === "DoneWithMatches" || eventState === 2) {
    listItem.rightTop.appendChild(createDiv(["list_event_phase"], "Completed"));
  } else {
    listItem.rightTop.appendChild(
      createDiv(["list_event_phase_red"], "In progress")
    );
  }

  const stats = getCourseStats(course);

  listItem.rightBottom.appendChild(
    createDiv(
      ["list_match_time"],
      timeSince(new Date(course.date)) + " ago - " + toMMSS(stats.duration)
    )
  );

  let { wins, losses } = stats;
  const wlGate = getWlGate(course);
  if (filters.showArchived && wlGate) {
    wins = wlGate.CurrentWins;
    losses = wlGate.CurrentLosses;
  }
  wins = wins || 0;
  losses = losses || 0;
  const wl = `${wins}:${losses}`;
  const winLossClass = getEventWinLossClass({
    CurrentWins: wins,
    CurrentLosses: losses
  });

  let resultDiv = createDiv(["list_match_result", winLossClass], wl);
  resultDiv.style.marginLeft = "8px";
  listItem.right.after(resultDiv);
}

// Given the data of a match will return a data row to be
// inserted into one of the screens.
function createMatchRow(match) {
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

  const matchRow = new ListItem(tileGrpid, match.id, clickCallback);
  matchRow.divideLeft();
  matchRow.divideRight();

  if (match.type === "match") {
    attachMatchData(matchRow, match);
  } else {
    attachDraftData(matchRow, match);
  }

  return matchRow.container;
}

// This code is executed when an event row is clicked and adds
// rows below the event for every match in that event.
function expandEvent(id) {
  const course = pd.event(id);
  let expandDiv = queryElementsByClass(id + "exp")[0];

  if (expandDiv.hasAttribute("style")) {
    expandDiv.removeAttribute("style");
    setTimeout(function() {
      expandDiv.innerHTML = "";
    }, 200);
    return;
  }

  expandDiv.innerHTML = "";
  const wlGate = getWlGate(course);
  const matchesList = wlGate ? wlGate.ProcessedMatchIds || [] : [];
  const matchRows = matchesList
    .map(index => pd.match(index) || pd.match(index + "-" + pd.arenaId))
    .filter(
      match =>
        match !== undefined &&
        match.type === "match" &&
        (!match.archived || filters.showArchived)
    );
  const draftId = id + "-draft";
  matchRows.sort((a, b) => {
    if (!a || !b) return 0;
    return compareDesc(new Date(a.date), new Date(b.date));
  });
  if (pd.draftExists(draftId)) {
    matchRows.unshift(pd.draft(draftId));
  }
  matchRows.forEach(match => {
    const row = createMatchRow(match);
    expandDiv.appendChild(row);
  });

  const newHeight = matchRows.length * 64 + 16;

  expandDiv.style.height = `${newHeight}px`;
}

function compareEvents(a, b) {
  if (!a || !b) return 0;
  return compareAsc(new Date(a.date), new Date(b.date));
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

module.exports = { openHistoryTab, setFilters };
