import differenceInCalendarDays from "date-fns/differenceInCalendarDays";
import compareAsc from "date-fns/compareAsc";
import pd from "../shared/player-data";
import DataScroller from "./data-scroller";
import { resetMainContainer } from "./renderer-util";
import { createEconomyHeader } from "./components/economy/EconomyHeader";
import { createDayHeader } from "./components/economy/EconomyDayHeader";
import { createChangeRow } from "./components/economy/EconomyRow";
import { getPrettyContext } from "./economyUtils";

const byId = id => document.getElementById(id);

const state = {
  showArchived: false,
  filterEconomy: "All",
  daysago: 0,
  dayList: [],
  sortedChanges: []
};

export function openEconomyTab(dataIndex = 25, scrollTop = 0) {
  const mainDiv = resetMainContainer();
  createEconomyUI(mainDiv);
  const dataScroller = new DataScroller(
    mainDiv,
    renderData,
    20,
    state.sortedChanges.length
  );
  dataScroller.render(dataIndex, scrollTop);
}

// return val = how many rows it rendered into container
function renderData(container, index) {
  // for performance reasons, we leave changes order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = state.sortedChanges.length - index - 1;
  const change = state.sortedChanges[revIndex];

  if (!change) return 0;
  if (change.archived && !state.showArchived) return 0;

  if (
    change.context.startsWith("Event.Prize") &&
    change.context.includes("Future") &&
    !change.xpGained
  ) {
    // skip transactions that are just empty future play/ranked rewards
    // originally for renewal season special events 2019-09
    return 0;
  }

  // print out daily summaries but no sub-events
  if (
    state.filterEconomy === "Day Summaries" &&
    state.daysago !==
      differenceInCalendarDays(new Date(), new Date(change.date))
  ) {
    container.appendChild(createDayHeader(change, state));
    return 1;
  }

  const selectVal = getPrettyContext(change.context, false);
  if (state.filterEconomy !== "All" && selectVal !== state.filterEconomy) {
    return 0;
  }

  let rowsAdded = 0;

  if (
    state.daysago != differenceInCalendarDays(new Date(), new Date(change.date))
  ) {
    container.appendChild(createDayHeader(change, state));
    rowsAdded++;
  }

  // Track Progress txns are mostly redundant with inventory change txns
  // Non-duplicate data (should be) only on txns with level changes
  if (change.context.startsWith("Track.Progress")) {
    if (!change.trackDiff) return rowsAdded;
    const lvlDelta = Math.abs(
      (change.trackDiff.currentLevel || 0) - (change.trackDiff.oldLevel || 0)
    );
    if (!lvlDelta) return rowsAdded;
  }

  const div = createChangeRow(change, change.id);
  container.appendChild(div);
  const flexRight = byId(change.id);
  if (flexRight.scrollWidth > flexRight.clientWidth) {
    flexRight.addEventListener("mousewheel", function(e) {
      this.scrollLeft += parseInt(e.deltaY / 2);
      e.preventDefault();
    });
  }
  rowsAdded++;

  return rowsAdded;
}

function createEconomyUI(mainDiv) {
  state.daysago = -999;
  state.dayList = [];
  state.sortedChanges = [...pd.transactionList];
  state.sortedChanges.sort(compare_economy);

  const headerDiv = createEconomyHeader(state, openEconomyTab);

  mainDiv.appendChild(headerDiv);
  state.daysago = -1;
}

// Compare two economy events
function compare_economy(a, b) {
  if (a === undefined) return 0;
  if (b === undefined) return 0;
  return compareAsc(new Date(a.date), new Date(b.date));
}
