import anime from "animejs";
import compareDesc from "date-fns/compareDesc";
import { DEFAULT_TILE, EASING_DEFAULT, MANA } from "../shared/constants";
import db from "../shared/database";
import { createDiv, queryElementsByClass } from "../shared/dom-fns";
import pd from "../shared/player-data";
import { toMMSS } from "../shared/util";
import { openDraft } from "./draft-details";
import ListItem from "./listItem";
import { openMatch } from "./match-details";
import {
  attachDraftData,
  attachMatchData,
  getEventWinLossClass,
  localTimeSince,
  toggleArchived
} from "./renderer-util";

export function renderEventRow(container, course) {
  const tileGrpid = course.CourseDeck.deckTileId;
  let listItem;
  const clickCallback = () => expandEvent(course);
  if (course.custom) {
    const archiveCallback = id => {
      toggleArchived(id);
    };

    listItem = new ListItem(
      tileGrpid,
      course.id,
      clickCallback,
      archiveCallback,
      course.archived
    );
  } else {
    listItem = new ListItem(tileGrpid, course.id, clickCallback);
  }
  listItem.divideLeft();
  listItem.divideRight();
  attachEventData(listItem, course);

  const divExp = createDiv([course.id + "exp", "list_event_expand"]);

  container.appendChild(listItem.container);
  container.appendChild(divExp);
}

function attachEventData(listItem, course) {
  const { stats } = course;
  const { eventState, displayName, duration } = stats;

  const deckNameDiv = createDiv(["list_deck_name"], displayName);
  listItem.leftTop.appendChild(deckNameDiv);

  course.CourseDeck.colors.forEach(color => {
    const m = createDiv(["mana_s20", `mana_${MANA[color]}`]);
    listItem.leftBottom.appendChild(m);
  });

  listItem.rightTop.appendChild(
    createDiv(
      eventState === "Completed"
        ? ["list_event_phase"]
        : ["list_event_phase_red"],
      eventState
    )
  );

  listItem.rightBottom.appendChild(
    createDiv(
      ["list_match_time"],
      localTimeSince(new Date(course.date)) +
        " " +
        toMMSS(duration ?? 0) +
        " long"
    )
  );

  let { wins, losses } = stats;
  wins = wins || 0;
  losses = losses || 0;
  const wl = `${wins}:${losses}`;
  const winLossClass = getEventWinLossClass({
    CurrentWins: wins,
    CurrentLosses: losses
  });

  const resultDiv = createDiv(["list_match_result", winLossClass], wl);
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
export function expandEvent(course) {
  const expandDiv = queryElementsByClass(course.id + "exp")[0];
  if (expandDiv.hasAttribute("style")) {
    expandDiv.removeAttribute("style");
    setTimeout(function() {
      expandDiv.innerHTML = "";
    }, 200);
    return;
  } else {
    expandDiv.innerHTML = "";
  }

  const matchRows = course.stats.matchIds.map(pd.match);
  matchRows.sort((a, b) => {
    if (!a || !b) return 0;
    return compareDesc(new Date(a.date), new Date(b.date));
  });
  const draftId = course.id + "-draft";
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
