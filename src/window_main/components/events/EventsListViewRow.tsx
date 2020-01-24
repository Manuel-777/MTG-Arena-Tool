import anime from "animejs";
import compareDesc from "date-fns/compareDesc";
import React from "react";
import { CSSTransition } from "react-transition-group";
import { EASING_DEFAULT, MANA } from "../../../shared/constants";
import db from "../../../shared/database";
import pd from "../../../shared/player-data";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import { DbCardData } from "../../../shared/types/Metadata";
import { toMMSS } from "../../../shared/util";
import ListItem, { ListItemProps } from "../../components/ListItem";
import { openDraft } from "../../draft-details";
import { openMatch } from "../../match-details";
import { getEventWinLossClass, toggleArchived } from "../../renderer-util";
import { MatchListItem } from "../matches/MatchesListViewRow";
import { TableViewRowProps } from "../tables/types";
import { DraftCardIcon, DraftListItem } from "./DraftListItem";
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
  return <EventListItem event={row.original} />;
}

export function EventListItem({
  event
}: {
  event: EventTableData;
}): JSX.Element {
  const { stats } = event;
  const { eventState, displayName, duration } = stats;
  const grpId = event.CourseDeck.deckTileId;
  const parentId = event.id;
  const [expanded, setExpanded] = React.useState(false);
  const onClick = (): void => setExpanded(!expanded);
  const onClickDelete = event.custom
    ? (): void => toggleArchived(parentId)
    : undefined;

  // LEFT SECTION
  const left = {
    top: <div className={"list_deck_name"}>{displayName}</div>,
    bottom: (
      <>
        {event.CourseDeck.colors.map((color, index) => (
          <div key={index} className={"mana_s20 mana_" + MANA[color]} />
        ))}
      </>
    )
  };

  // CENTER SECTION
  let center;
  const draftId = event.id + "-draft";
  if (pd.draftExists(draftId)) {
    const draft = pd.draft(draftId);
    const highlightCards: DbCardData[] = draft.pickedCards
      .map((cardId: number) => db.card(cardId))
      .filter(
        (card?: DbCardData) =>
          card?.rarity === "rare" || card?.rarity === "mythic"
      );
    center = (
      <div className={"flex_item"} style={{ margin: "auto" }}>
        {highlightCards.map((card, index) => (
          <DraftCardIcon key={index} card={card} />
        ))}
      </div>
    );
  }

  // RIGHT SECTION
  const timestamp = new Date(event.date);
  let { wins, losses } = stats;
  wins = wins || 0;
  losses = losses || 0;
  const wl = `${wins}:${losses}`;
  const winLossClass = getEventWinLossClass({
    CurrentWins: wins,
    CurrentLosses: losses
  });
  const right = {
    top: (
      <div
        className={
          eventState === "Completed"
            ? "list_event_phase"
            : "list_event_phase_red"
        }
      >
        {eventState}
      </div>
    ),
    bottom: (
      <>
        <div className={"list_match_time"}>
          <RelativeTime datetime={timestamp.toISOString()} />{" "}
          {toMMSS(duration) + " long"}
        </div>
      </>
    ),
    after: <div className={"list_match_result " + winLossClass}>{wl}</div>
  };

  const listItemProps: ListItemProps = {
    grpId,
    left,
    center,
    right,
    onClick,
    onClickDelete,
    archived: event.archived
  };
  return (
    <>
      <ListItem
        {...listItemProps}
        title={(expanded ? "collapse" : "expand") + " event"}
      />
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
