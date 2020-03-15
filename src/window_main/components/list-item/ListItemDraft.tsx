import React from "react";

import {
  ListItem,
  Column,
  HoverTile,
  FlexTop,
  FlexBottom,
  ArchiveButton
} from "./ListItem";

import ShareButton from "../misc/ShareButton";
import db from "../../../shared/database";

import { DEFAULT_TILE } from "../../../shared/constants";
import { DbCardData } from "../../../types/Metadata";
import RoundCard from "../misc/RoundCard";
import { toggleArchived } from "../../rendererUtil";
import { getReadableEvent } from "../../../shared/util";

interface ListItemDraftProps {
  draft: any;
  openDraftCallback: (id: string) => void;
}

export default function ListItemDraft({
  draft,
  openDraftCallback
}: ListItemDraftProps): JSX.Element {
  const parentId = draft.id || "";

  const onRowClick = (): void => {
    openDraftCallback(parentId);
  };

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
        grpId={db.sets[draft.set].tile || DEFAULT_TILE}
      />

      <Column class="list_item_left">
        <FlexTop>
          <div className="list_deck_name">{draft.set + " Draft" || ""}</div>
        </FlexTop>
        <FlexBottom>
          <div className="list_deck_name_it">
            {getReadableEvent(draft.InternalEventName)}
          </div>
        </FlexBottom>
      </Column>

      <div
        style={{ flexGrow: 1, display: "flex", justifyContent: "center" }}
        className="list_item_center"
      >
        {draft.pickedCards
          .map((cardId: number) => db.card(cardId))
          .filter(
            (card: DbCardData) =>
              (card && card.rarity == "rare") || card.rarity == "mythic"
          )
          .map((card: DbCardData, index: number) => {
            return <RoundCard key={index} card={card}></RoundCard>;
          })}
      </div>

      <Column class="list_event_phase">
        <FlexTop>See Replay</FlexTop>
        <FlexBottom>
          <div className="list_match_time">
            {draft.date ? (
              <relative-time datetime={new Date(draft.date || 0).toISOString()}>
                {draft.date?.toString() ?? ""}
              </relative-time>
            ) : (
              "-"
            )}
          </div>
        </FlexBottom>
      </Column>

      <Column style={{ display: "flex" }}>
        <ShareButton type="draft" data={draft} />
      </Column>

      <ArchiveButton
        archiveCallback={toggleArchived}
        dataId={draft.id || ""}
        hover={hover}
        isArchived={draft.archived || false}
      />
    </ListItem>
  );
}
