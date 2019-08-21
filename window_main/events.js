const anime = require("animejs");
const compareAsc = require("date-fns/compareAsc");
const compareDesc = require("date-fns/compareDesc");

const { DEFAULT_TILE, MANA, EASING_DEFAULT } = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const { createDiv, queryElementsByClass } = require("../shared/dom-fns");
const { getReadableEvent, toMMSS } = require("../shared/util");

const Aggregator = require("./aggregator");
const DataScroller = require("./data-scroller");
const FilterPanel = require("./filter-panel");
const ListItem = require("./list-item");
const StatsPanel = require("./stats-panel");
const {
  attachDraftData,
  attachMatchData,
  getEventWinLossClass,
  localTimeSince,
  openDraft,
  resetMainContainer,
  toggleArchived
} = require("./renderer-util");
const { openMatch } = require("./match-details");

let filters = Aggregator.getDefaultFilters();
filters.eventId = Aggregator.ALL_EVENT_TRACKS;
let filteredMatches;
let sortedEvents;

function openEventsTab(_filters, dataIndex = 25, scrollTop = 0) {
  const mainDiv = resetMainContainer();
  const d = createDiv(["list_fill"]);
  mainDiv.appendChild(d);

  sortedEvents = [...pd.eventList];
  sortedEvents.sort(compareEvents);
  filters = { ...filters, date: pd.settings.last_date_filter, ..._filters };
  filteredMatches = new Aggregator(filters);

  const eventsTop = createDiv(["events_top"]);
  eventsTop.style.display = "flex";
  eventsTop.style.width = "100%";
  eventsTop.style.alignItems = "center";
  eventsTop.style.justifyContent = "space-between";

  const filterPanel = new FilterPanel(
    "events_top",
    selected => openEventsTab(selected),
    filters,
    new Aggregator({ date: filters.date }).trackEvents,
    [],
    [],
    false,
    [],
    false,
    null,
    true
  );

  const eventsTopFilter = filterPanel.render();
  eventsTop.appendChild(eventsTopFilter);

  const statsPanel = new StatsPanel("events_top", filteredMatches);
  const eventsTopWinrate = statsPanel.render();
  eventsTopWinrate.style.width = "300px";
  eventsTopWinrate.style.marginRight = "16px";
  eventsTop.appendChild(eventsTopWinrate);

  mainDiv.appendChild(eventsTop);
  const dataScroller = new DataScroller(
    mainDiv,
    renderData,
    20,
    sortedEvents.length
  );
  dataScroller.render(dataIndex, scrollTop);
}

// return val = how many rows it rendered into container
function renderData(container, index) {
  // for performance reasons, we leave events order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = sortedEvents.length - index - 1;
  const course = sortedEvents[revIndex];

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
      localTimeSince(new Date(course.date)) +
        " " +
        toMMSS(stats.duration) +
        " long"
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

module.exports = {
  openEventsTab: openEventsTab,
  expandEvent: expandEvent
};
