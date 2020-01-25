import anime from "animejs";
import compareDesc from "date-fns/compareDesc";
import React from "react";
import { CSSTransition } from "react-transition-group";
import { EASING_DEFAULT } from "../../../shared/constants";
import pd from "../../../shared/player-data";
import { openDraft } from "../../draft-details";
import { openMatch } from "../../match-details";
import { toggleArchived } from "../../renderer-util";
import { MatchListItem } from "../matches/MatchesListViewRow";
import { ListViewRow } from "../tables/ListViewRow";
import { ListViewRowProps, TableViewRowProps } from "../tables/types";
import { DraftListItem } from "./DraftListItem";
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

export default function EventsListViewRow({
  row
}: TableViewRowProps<EventTableData>): JSX.Element {
  const event = row.original;
  const grpId = event.CourseDeck.deckTileId;
  const [expanded, setExpanded] = React.useState(false);
  const openCallback = (): void => setExpanded(!expanded);
  const listProps: ListViewRowProps<EventTableData> = {
    row,
    grpId,
    title: (expanded ? "collapse" : "expand") + " event",
    openCallback,
    archiveCallback: toggleArchived
  };
  return (
    <>
      <ListViewRow {...listProps} />
      <CSSTransition
        classNames="list_event_expanded"
        in={!!expanded}
        mountOnEnter
        timeout={0}
      >
        <div className={"list_event_expand"}>
          <EventSubItems event={event} />
        </div>
      </CSSTransition>
    </>
  );
}

function EventSubItems({ event }: { event: EventTableData }): JSX.Element {
  const matchRows = event.stats.matchIds.map(pd.match);
  matchRows.sort((a, b) => {
    if (!a || !b) return 0;
    return compareDesc(new Date(a.date), new Date(b.date));
  });
  const draftId = event.id + "-draft";
  return (
    <>
      {pd.draftExists(draftId) && (
        <DraftListItem
          draft={pd.draft(draftId)}
          openDraftCallback={handleOpenDraft}
        />
      )}
      {matchRows.map(match => (
        <MatchListItem
          key={match.id}
          match={match}
          openMatchCallback={handleOpenMatch}
        />
      ))}
    </>
  );
}
