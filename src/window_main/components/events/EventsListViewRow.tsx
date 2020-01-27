import anime from "animejs";
import compareDesc from "date-fns/compareDesc";
import React from "react";
import { DEFAULT_TILE, EASING_DEFAULT, MANA } from "../../../shared/constants";
import db from "../../../shared/database";
import { createDiv, queryElementsByClass } from "../../../shared/dom-fns";
import pd from "../../../shared/player-data";
import { toMMSS } from "../../../shared/util";
import { openDraft } from "../../draft-details";
import ListItem from "../../listItem";
import { openMatch } from "../../match-details";
import {
  attachDraftData,
  attachMatchData,
  createDraftRares,
  getEventWinLossClass,
  localTimeSince,
  toggleArchived
} from "../../renderer-util";
import { SerializedMatch } from "../matches/types";
import { useLegacyRenderer } from "../tables/hooks";
import { TableViewRowProps } from "../tables/types";
import { EventTableData } from "./types";

function handleOpenMatch(id: string | number): void {
  openMatch(id);
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

function handleOpenDraft(id: string | number): void {
  openDraft(id);
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

function attachEventData(listItem: ListItem, event: EventTableData): void {
  const { stats } = event;
  const { eventState, displayName, duration } = stats;

  const deckNameDiv = createDiv(["list_deck_name"], displayName);
  listItem.leftTop.appendChild(deckNameDiv);

  event.CourseDeck.colors.forEach(color => {
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
      localTimeSince(new Date(event.date)) +
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

  const draftId = event.id + "-draft";
  if (pd.draftExists(draftId)) {
    const draft = pd.draft(draftId);
    const draftRares = createDraftRares(draft);
    listItem.center.appendChild(draftRares);
  }
}

// Given the data of a match will return a data row to be
// inserted into one of the screens.
function createMatchRow(match: SerializedMatch): HTMLElement {
  let tileGrpid, clickCallback;
  if (match.type == "match") {
    tileGrpid = match.playerDeck.deckTileId ?? DEFAULT_TILE;
    clickCallback = handleOpenMatch;
  } else {
    tileGrpid = db.sets[match.set]?.tile ?? DEFAULT_TILE;
    clickCallback = handleOpenDraft;
  }

  const matchRow = new ListItem(tileGrpid, match.id, clickCallback);
  matchRow.divideLeft();
  matchRow.divideRight();

  if (match.type === "match") {
    attachMatchData(matchRow, match);
    matchRow.container.title = "show match details";
  } else {
    attachDraftData(matchRow, match);
    matchRow.container.title = "show draft details";
  }

  return matchRow.container;
}

// This code is executed when an event row is clicked and adds
// rows below the event for every match in that event.
export function expandEvent(event: EventTableData): void {
  const expandDiv = queryElementsByClass(event.id + "exp")[0];
  if (expandDiv.hasAttribute("style")) {
    expandDiv.removeAttribute("style");
    setTimeout(function() {
      expandDiv.innerHTML = "";
    }, 200);
    return;
  } else {
    expandDiv.innerHTML = "";
  }

  const matchRows = event.stats.matchIds.map(pd.match);
  matchRows.sort((a, b) => {
    if (!a || !b) return 0;
    return compareDesc(new Date(a.date), new Date(b.date));
  });
  const draftId = event.id + "-draft";
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

export function renderEventRow(
  container: HTMLElement,
  event: EventTableData
): void {
  const tileGrpid = event.CourseDeck.deckTileId;
  let listItem;
  const clickCallback = (): void => expandEvent(event);
  if (event.custom) {
    listItem = new ListItem(
      tileGrpid,
      event.id,
      clickCallback,
      toggleArchived,
      event.archived
    );
  } else {
    listItem = new ListItem(tileGrpid, event.id, clickCallback);
  }
  listItem.divideLeft();
  listItem.divideRight();
  attachEventData(listItem, event);

  const divExp = createDiv([event.id + "exp", "list_event_expand"]);

  container.appendChild(listItem.container);
  container.appendChild(divExp);
}

export default function EventsListViewRow({
  row
}: TableViewRowProps<EventTableData>): JSX.Element {
  const containerRef = useLegacyRenderer(renderEventRow, row.original);
  return <div title={"show event details"} ref={containerRef} />;
}
