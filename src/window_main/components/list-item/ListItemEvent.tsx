import React, { useRef } from "react";
import { TableViewRowProps } from "../tables/types";
import { EventTableData } from "../events/types";
import ManaCost from "../misc/ManaCost";
import db from "../../../shared/database";

import {
  ListItem,
  Column,
  HoverTile,
  FlexTop,
  FlexBottom,
  ArchiveButton
} from "./ListItem";
import ListItemMatch from "./ListItemMatch";
import ListItemDraft from "./ListItemDraft";
import {
  DEFAULT_TILE,
  SUB_MATCH,
  SUB_DRAFT,
  IPC_NONE
} from "../../../shared/constants";
import { getEventWinLossClass, toggleArchived } from "../../rendererUtil";
import { DbCardData } from "../../../types/Metadata";
import RoundCard from "../misc/RoundCard";
import { compareDesc } from "date-fns";
import { useDispatch } from "react-redux";
import { InternalMatch } from "../../../types/match";
import { InternalDraft } from "../../../types/draft";
import uxMove from "../../uxMove";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { getMatch, draftExists, getDraft } from "../../../shared-store";

function DraftRares({ event }: { event: EventTableData }): JSX.Element {
  const draftId = event.id + "-draft";
  let draftRares: JSX.Element[] = [];
  if (draftExists(draftId)) {
    const draft = getDraft(draftId);
    if (draft) {
      const pool = [...draft.CardPool];
      draftRares = pool
        .map((cardId: string | number) => db.card(cardId))
        .filter(
          (card: DbCardData | undefined) =>
            card && (card.rarity == "rare" || card.rarity == "mythic")
        )
        .map((card: DbCardData | undefined, index: number) => {
          return card ? <RoundCard key={index} card={card}></RoundCard> : <></>;
        });
    }
  }
  return (
    <div
      style={{ flexGrow: 1, display: "flex", justifyContent: "center" }}
      className="list_item_center"
    >
      {draftRares}
    </div>
  );
}

function EventMainRow({
  event,
  onRowClick
}: {
  event: EventTableData;
  onRowClick: () => void;
}): JSX.Element {
  const eventName =
    db.events[event.InternalEventName] ??
    event.displayName ??
    event.InternalEventName ??
    "Unknown";
  const eventColors = event.colors ?? [];

  const [hover, setHover] = React.useState(false);
  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);
  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);

  return (
    <ListItem
      click={onRowClick}
      mouseEnter={mouseEnter}
      mouseLeave={mouseLeave}
    >
      <HoverTile
        hover={hover}
        grpId={event.CourseDeck.deckTileId ?? DEFAULT_TILE}
      />
      <Column class="list_item_left">
        <FlexTop innerClass="list_deck_name">{eventName}</FlexTop>
        <FlexBottom>
          <ManaCost class="mana_s20" colors={eventColors} />
        </FlexBottom>
      </Column>

      <DraftRares event={event} />

      <Column class="list_item_right">
        <FlexTop
          innerClass={
            event.eventState == "Completed"
              ? "list_event_phase"
              : "list_event_phase_red"
          }
        >
          {event.eventState}
        </FlexTop>
        <FlexBottom innerClass="list_match_time">
          <relative-time datetime={new Date(event.date).toISOString()}>
            {event.date.toString()}
          </relative-time>
        </FlexBottom>
      </Column>

      <Column class="list_match_result">
        <div
          className={getEventWinLossClass({
            CurrentWins: event.wins,
            CurrentLosses: event.losses
          })}
        >
          {event.wins}:{event.losses}
        </div>
      </Column>

      <ArchiveButton
        archiveCallback={toggleArchived}
        dataId={event.id ?? ""}
        hover={hover}
        isArchived={event.archived ?? false}
      />
    </ListItem>
  );
}

function EventSubRows({
  event,
  expanded
}: {
  event: EventTableData;
  expanded: boolean;
}): JSX.Element {
  const draftId = event.id + "-draft";
  const dispatcher = useDispatch();

  const openMatch = React.useCallback(
    (match: InternalMatch): void => {
      uxMove(-100);
      reduxAction(
        dispatcher,
        "SET_BACK_GRPID",
        match.playerDeck.deckTileId,
        IPC_NONE
      );
      reduxAction(
        dispatcher,
        "SET_SUBNAV",
        {
          type: SUB_MATCH,
          id: match.id
        },
        IPC_NONE
      );
    },
    [dispatcher]
  );

  const openDraft = React.useCallback(
    (id: string | number): void => {
      uxMove(-100);
      reduxAction(
        dispatcher,
        "SET_SUBNAV",
        {
          type: SUB_DRAFT,
          id: id
        },
        IPC_NONE
      );
    },
    [dispatcher]
  );

  // This will be set on first render, no need to update state again
  const initialDraft = useRef<InternalDraft | undefined>(undefined);
  const matchRows: InternalMatch[] = React.useMemo(() => {
    if (!expanded) {
      return [];
    }
    const matchRows = event.stats.matchIds
      .map(id => getMatch(id))
      .filter(match => match !== undefined) as InternalMatch[];
    matchRows.sort((a, b) => {
      if (!a || !b) return 0;
      return compareDesc(new Date(a.date), new Date(b.date));
    });

    initialDraft.current = getDraft(draftId);
    return matchRows;
  }, [draftId, event.stats.matchIds, expanded, initialDraft]);

  const style = expanded ? { height: matchRows.length * 64 + "px" } : {};

  return (
    <div style={style} className="list_event_expand">
      {initialDraft.current ? (
        <ListItemDraft
          key={initialDraft.current.id}
          draft={initialDraft.current}
          openDraftCallback={openDraft}
        />
      ) : null}
      {matchRows.map(match => {
        return match.type == "match" ? (
          <ListItemMatch
            key={match.id}
            tags={match.tags}
            match={match as InternalMatch}
            openMatchCallback={openMatch}
          />
        ) : null;
      })}
    </div>
  );
}

export function ListItemEvent({
  row
}: TableViewRowProps<EventTableData>): JSX.Element {
  const event = row.original;
  const [expanded, setExpanded] = React.useState(false);
  const onRowClick = React.useCallback((): void => {
    setExpanded(!expanded);
  }, [expanded]);
  const mainRowProps = { event, onRowClick };
  const subRowsProps = { event, expanded };
  return (
    <>
      <EventMainRow {...mainRowProps} />
      <EventSubRows {...subRowsProps} />
    </>
  );
}
