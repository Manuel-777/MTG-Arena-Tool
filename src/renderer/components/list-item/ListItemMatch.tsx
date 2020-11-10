import _ from "lodash";
import React, { useCallback } from "react";
import { toMMSS } from "../../../shared/utils/dateTo";
import { ListItemMatchProps } from "../matches/types";
import ManaCost from "../misc/ManaCost";
import RankIcon from "../misc/RankIcon";
import ResultDetails from "../misc/ResultDetails";
import { NewTag, TagBubble } from "../misc/TagBubble";
import {
  ArchiveButton,
  Column,
  FlexBottom,
  FlexTop,
  HoverTile,
  ListItem,
} from "./ListItem";
import css from "./ListItem.css";
import sharedCss from "../../../shared/shared.css";
import { ipcSend } from "../../ipcSend";
import database from "../../../shared/database-wrapper";
import RankSmall from "../misc/RankSmall";
import { constants, getEventPrettyName } from "mtgatool-shared";
const { DEFAULT_TILE } = constants;

export default function ListItemMatch({
  match,
  openMatchCallback,
  archiveCallback,
  addTagCallback,
  editTagCallback,
  deleteTagCallback,
  tags,
}: ListItemMatchProps): JSX.Element {
  const [tagState, setTagState] = React.useState<Array<string>>(
    match.tags ?? []
  );
  React.useEffect(() => setTagState(match.tags ?? []), [match.tags]);
  const deleteTag = React.useCallback(
    (id: string, tag: string): void => {
      setTagState(_.without(tagState, tag));
      deleteTagCallback && deleteTagCallback(id, tag);
    },
    [deleteTagCallback, tagState]
  );
  const addTag = React.useCallback(
    (id: string, tag: string): void => {
      setTagState([...tagState, tag]);
      addTagCallback && addTagCallback(id, tag);
    },
    [addTagCallback, tagState]
  );

  const onRowClick = (): void => {
    openMatchCallback(match);
  };

  const copy = useCallback((string: string) => {
    ipcSend("set_clipboard", string);
  }, []);

  let dateTime = new Date(match.date);
  // Quick hack to check if NaN
  if (dateTime.getTime() !== dateTime.getTime()) {
    dateTime = new Date();
  }

  const isLimited = database.limited_ranked_events.includes(match.eventId);

  return (
    <ListItem click={onRowClick}>
      <div
        className={css.listItemLeftIndicator}
        style={{
          backgroundColor:
            match.player.win > match.opponent.win
              ? `var(--color-g)`
              : `var(--color-r)`,
        }}
      />
      <HoverTile grpId={match.playerDeck.deckTileId || DEFAULT_TILE}>
        <RankIcon
          rank={match.player.rank}
          tier={match.player.tier}
          percentile={match.player.percentile || 0}
          leaderboardPlace={match.player.leaderboardPlace || 0}
          format={isLimited ? "limited" : "constructed"}
        />
      </HoverTile>

      <Column class={css.listItemLeft}>
        <FlexTop>
          <div className={css.listDeckName}>{match.playerDeck.name || ""}</div>
          <div className={css.listDeckNameIt}>
            {getEventPrettyName(match.eventId)}
          </div>
        </FlexTop>
        <FlexBottom>
          <ManaCost
            class={sharedCss.manaS20}
            colors={match.playerDeck.colors || []}
          />
          <div style={{marginLeft: "auto"}} className={css.listMatchTime}>
            <relative-time datetime={dateTime.toISOString()}>
              {match.date?.toString() ?? ""}
            </relative-time>{" "}
            {toMMSS(match.duration) + " long"}
          </div>
        </FlexBottom>
      </Column>

      <Column class={css.listItemCenter}>
      </Column>

      <Column class={css.listItemRight}>
        <FlexTop>
          <div className={css.listMatchTitle}>
            {"vs " + match.opponent.name.slice(0, -6)}
          </div>
          <div
            onClick={(
              e: React.MouseEvent<HTMLDivElement, MouseEvent>
            ): void => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              copy(match.opponent.name);
            }}
            className={css.copyButton}
          />
          <RankSmall rank={match.opponent} />
        </FlexTop>
        <FlexBottom>
          <ManaCost
            class={sharedCss.manaS20}
            colors={match.oppDeck.colors || []}
          />
          {addTagCallback && editTagCallback ? (
            <div style={{marginLeft: "8px"}}>
              {tagState.length > 0 ? (
                tagState.map((tag: any) => {
                  return (
                    <TagBubble
                      key={tag}
                      tag={tag}
                      parentId={match.id}
                      editTagCallback={editTagCallback}
                      deleteTagCallback={deleteTag}
                    />
                  );
                })
              ) : (
                <NewTag
                  tagPrompt="Add"
                  tags={tags}
                  addTagCallback={addTag}
                  parentId={match.id}
                />
              )}
            </div>
          ) : (
            <></>
          )}
        </FlexBottom>
      </Column>

      <ResultDetails match={match} />

      <Column class={css.listMatchResult}>
        <div
          className={
            match.player.win > match.opponent.win
              ? sharedCss.green
              : sharedCss.red
          }
        >
          {match.player.win}:{match.opponent.win}
        </div>
      </Column>

      {!!archiveCallback && (
        <ArchiveButton
          archiveCallback={archiveCallback}
          dataId={match.id ?? ""}
          isArchived={match.archived ?? false}
        />
      )}
    </ListItem>
  );
}
