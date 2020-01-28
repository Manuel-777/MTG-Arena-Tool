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
import { DEFAULT_TILE } from "../../../shared/constants";
import { getEventWinLossClass } from "../../renderer-util";
import { DbCardData } from "../../../shared/types/Metadata";
import RoundCard from "../RoundCard";

export function ListItemEvent({
  row
}: TableViewRowProps<EventTableData>): JSX.Element {
  const event = row.original;

  const onRowClick = (): void => {
    console.log("click / expand");
  };

  const archiveCallback = (eventId: string): void => {
    console.log("archive " + eventId);
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

  return (
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
        archiveCallback={archiveCallback}
        dataId={event.id || ""}
        hover={hover}
        isArchived={event.archived || false}
      />
    </ListItem>
  );
}
