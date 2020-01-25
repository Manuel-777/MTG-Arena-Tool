import React from "react";
import { DEFAULT_TILE, MANA } from "../../../shared/constants";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import { formatRank, getReadableEvent, toMMSS } from "../../../shared/util";
import ListItem from "../../components/ListItem";
import { BinarySymbol, MetricText, RankSymbol } from "../display";
import { ListItemProps } from "../ListItem";
import { ListViewRow } from "../tables/ListViewRow";
import { ListViewRowProps } from "../tables/types";
import { MatchesTableRowProps, MatchTableData, SerializedMatch } from "./types";

export default function MatchesListViewRow({
  row,
  openMatchCallback,
  ...otherProps
}: MatchesTableRowProps): JSX.Element {
  const match = row.original;
  const grpId = match.playerDeck.deckTileId ?? DEFAULT_TILE;
  const listProps: ListViewRowProps<MatchTableData> = {
    row,
    grpId,
    title: "show match details",
    openCallback: openMatchCallback,
    ...otherProps
  };
  return <ListViewRow {...listProps} />;
}

export interface MatchListItemProps {
  match: SerializedMatch;
  openMatchCallback: (deckId: string | number) => void;
}

// TODO consider refactoring this into some kind of ListViewRow???
export function MatchListItem({
  match,
  openMatchCallback
}: MatchListItemProps): JSX.Element {
  const grpId = match.playerDeck.deckTileId ?? DEFAULT_TILE;
  const parentId = match.id;
  const onClick = (): void => openMatchCallback(parentId);

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
        <div className={"list_match_title"}>{oppName}</div>
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
          <MetricText
            style={{
              fontSize: "small",
              whiteSpace: "nowrap",
              fontWeight: 300,
              color: "var(--color-light-50)",
              marginRight: "8px"
            }}
          >
            Duration:
          </MetricText>
          {toMMSS(match.duration)}
        </div>
        {match.oppDeck.colors?.map((color, index) => (
          <div key={index} className={"mana_s20 mana_" + MANA[color]} />
        ))}
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
          {match.player.win}&nbsp;&nbsp;&nbsp;{match.opponent.win}
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
    archived: match.archived
  };
  return <ListItem {...listItemProps} title={"show match details"} />;
}
