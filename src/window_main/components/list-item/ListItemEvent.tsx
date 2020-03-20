import React from "react";
import { TableViewRowProps } from "../tables/types";
import { EventTableData } from "../events/types";
import ManaCost from "../misc/ManaCost";
import db from "../../../shared/database";
import pd from "../../../shared/PlayerData";

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
import { DEFAULT_TILE, SUB_MATCH, SUB_DRAFT } from "../../../shared/constants";
import { getEventWinLossClass, toggleArchived } from "../../rendererUtil";
import { DbCardData } from "../../../types/Metadata";
import RoundCard from "../misc/RoundCard";
import { compareDesc } from "date-fns";
import { useDispatch } from "react-redux";
import { rendererSlice } from "../../../shared/redux/reducers";
import { InternalMatch } from "../../../types/match";
import uxMove from "../../uxMove";

function DraftRares({ event }: { event: EventTableData }): JSX.Element {
  const draftId = event.id + "-draft";
  let draftRares: JSX.Element[] = [];
  if (pd.draftExists(draftId)) {
    const draft = pd.draft(draftId);
    draftRares = [
      ...draft.pickedCards
        .map((cardId: number) => db.card(cardId))
        .filter(
          (card: DbCardData) =>
            (card && card.rarity == "rare") || card.rarity == "mythic"
        )
        .map((card: DbCardData, index: number) => {
          return <RoundCard key={index} card={card}></RoundCard>;
        })
    ];
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
      const { setBackgroundGrpId, setSubNav } = rendererSlice.actions;
      dispatcher(setBackgroundGrpId(match.playerDeck.deckTileId));
      dispatcher(
        setSubNav({
          type: SUB_MATCH,
          id: match.id
        })
      );
    },
    [dispatcher]
  );

  const openDraft = React.useCallback(
    (id: string | number): void => {
      uxMove(-100);
      const { setSubNav } = rendererSlice.actions;
      dispatcher(
        setSubNav({
          type: SUB_DRAFT,
          id: id
        })
      );
    },
    [dispatcher]
  );

  const matchRows: InternalMatch[] = React.useMemo(() => {
    if (!expanded) {
      return [];
    }
    const matchRows = event.stats.matchIds
      .map(pd.match)
      .filter(match => match !== undefined) as InternalMatch[];
    matchRows.sort((a, b) => {
      if (!a || !b) return 0;
      return compareDesc(new Date(a.date), new Date(b.date));
    });
    if (pd.draftExists(draftId)) {
      matchRows.unshift(pd.draft(draftId));
    }
    return matchRows;
  }, [draftId, event.stats.matchIds, expanded]);

  const style = expanded ? { height: matchRows.length * 64 + "px" } : {};

  return (
    <div style={style} className="list_event_expand">
      {matchRows.map(match => {
        return match.type == "match" ? (
          <ListItemMatch
            key={match.id}
            tags={match.tags}
            match={match}
            openMatchCallback={openMatch}
          />
        ) : (
          <ListItemDraft
            key={match.id}
            draft={match}
            openDraftCallback={openDraft}
          />
        );
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
