import React from "react";
import { DEFAULT_TILE, MANA } from "../../../shared/constants";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import { formatRank, getReadableEvent, toMMSS } from "../../../shared/util";
import ListItem from "../../components/ListItem";
import { BinarySymbol, NewTag, RankSymbol, TagBubble } from "../display";
import { ListItemProps } from "../ListItem";
import { TagCounts } from "../tables/types";
import { MatchesTableRowProps, SerializedMatch } from "./types";

export default function MatchesListViewRow({
  row,
  ...otherProps
}: MatchesTableRowProps): JSX.Element {
  return <MatchListItem match={row.original} {...otherProps} />;
}

export interface MatchListItemProps {
  match: SerializedMatch;
  tags?: TagCounts;
  openMatchCallback: (deckId: string | number) => void;
  archiveCallback?: (id: string | number) => void;
  addTagCallback?: (id: string, tag: string) => void;
  editTagCallback?: (tag: string, color: string) => void;
  deleteTagCallback?: (id: string, tag: string) => void;
}

export function MatchListItem({
  match,
  tags,
  openMatchCallback,
  archiveCallback,
  addTagCallback,
  editTagCallback,
  deleteTagCallback
}: MatchListItemProps): JSX.Element {
  const grpId = match.playerDeck.deckTileId ?? DEFAULT_TILE;
  const parentId = match.id;
  const onClick = (): void => openMatchCallback(parentId);
  const onClickDelete = archiveCallback
    ? (): void => archiveCallback(parentId)
    : undefined;

  // LEFT SECTION
  let displayName = match.playerDeck.name ?? "";
  if (displayName.includes("?=?Loc/Decks/Precon/")) {
    displayName = displayName.replace("?=?Loc/Decks/Precon/", "");
  }
  const left = {
    top: (
      <>
        <div className={"list_deck_name"}>{displayName}</div>
        <div className={"list_deck_name_it"}>
          {getReadableEvent(match.eventId)}
        </div>
      </>
    ),
    bottom: (
      <>
        {match.playerDeck.colors?.map((color, index) => (
          <div key={index} className={"mana_s20 mana_" + MANA[color]} />
        ))}
      </>
    )
  };

  // RIGHT SECTION
  const oppName = (match.opponent.name ?? "-#000000").slice(0, -6);
  const timestamp = new Date(match.date);
  const onThePlay = match.player.seat === match.onThePlay;
  const right = {
    top: (
      <>
        <div className={"list_match_title"}>vs {oppName}</div>
        <RankSymbol
          rank={match.opponent.rank}
          title={formatRank(match.opponent)}
        />
      </>
    ),
    bottom: (
      <>
        <div className={"list_match_time"}>
          <RelativeTime datetime={timestamp.toISOString()} />{" "}
          {toMMSS(match.duration) + " long"}
        </div>
        {match.oppDeck.colors?.map((color, index) => (
          <div key={index} className={"mana_s20 mana_" + MANA[color]} />
        ))}
        <div className={"matches_tags"}>
          {editTagCallback &&
            deleteTagCallback &&
            match.tags?.map((tag: string) => {
              const tagProps = {
                parentId,
                tag,
                editTagCallback,
                deleteTagCallback
              };
              return <TagBubble key={tag} {...tagProps} />;
            })}
          {tags && addTagCallback && match.tags?.length === 0 && (
            <NewTag
              parentId={parentId}
              addTagCallback={addTagCallback}
              tagPrompt={"Set archetype"}
              tags={tags}
              title={"set custom match archetype"}
            />
          )}
        </div>
      </>
    ),
    after: (
      <>
        <div
          className={
            "list_match_result " +
            (match.player.win > match.opponent.win ? "green" : "red")
          }
        >
          {match.player.win}:{match.opponent.win}
        </div>
        {!!match.onThePlay && (
          <BinarySymbol
            isOn={onThePlay}
            title={onThePlay ? "On the play" : "On the draw"}
          />
        )}
      </>
    )
  };

  const listItemProps: ListItemProps = {
    grpId,
    left,
    right,
    onClick,
    onClickDelete,
    archived: match.archived
  };
  return <ListItem {...listItemProps} title={"show match details"} />;
}
