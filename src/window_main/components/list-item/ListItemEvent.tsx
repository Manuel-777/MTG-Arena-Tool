import React from "react";

import { TableViewRowProps } from "../tables/types";
import { EventTableData } from "../events/types";
import ManaCost from "../ManaCost";
import db from "../../../shared/database";
import pd from "../../../shared/player-data";

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
import { DEFAULT_TILE } from "../../../shared/constants";
import { getEventWinLossClass, toggleArchived } from "../../renderer-util";
import { DbCardData } from "../../../types/Metadata";
import RoundCard from "../RoundCard";
import { compareDesc } from "date-fns";
import { openMatch } from "../../match-details";
import { openDraft } from "../../draft-details";

export function ListItemEvent({
  row
}: TableViewRowProps<EventTableData>): JSX.Element {
  const event = row.original;

  const [expanded, setExpanded] = React.useState(false);

  const onRowClick = (): void => {
    setExpanded(!expanded);
  };

  const [hover, setHover] = React.useState(false);
  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);
  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);

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

  const matchRows = event.stats.matchIds.map(pd.match);
  matchRows.sort((a, b) => {
    if (!a || !b) return 0;
    return compareDesc(new Date(a.date), new Date(b.date));
  });
  if (pd.draftExists(draftId)) {
    matchRows.unshift(pd.draft(draftId));
  }

  return (
    <>
      <ListItem
        click={onRowClick}
        mouseEnter={mouseEnter}
        mouseLeave={mouseLeave}
      >
        <HoverTile
          hover={hover}
          grpId={event.CourseDeck.deckTileId || DEFAULT_TILE}
        />
        <Column class="list_item_left">
          <FlexTop innerClass="list_deck_name">
            {db.events[event.InternalEventName] ||
              event.displayName ||
              event.InternalEventName ||
              "Unknown"}
          </FlexTop>
          <FlexBottom>
            <ManaCost class="mana_s20" colors={event.colors || []} />
          </FlexBottom>
        </Column>

        <div
          style={{ flexGrow: 1, display: "flex", justifyContent: "center" }}
          className="list_item_center"
        >
          {draftRares}
        </div>

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
          dataId={event.id || ""}
          hover={hover}
          isArchived={event.archived || false}
        />
      </ListItem>
      <div
        style={expanded ? { height: matchRows.length * 64 + "px" } : {}}
        className="list_event_expand"
      >
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
    </>
  );
}
