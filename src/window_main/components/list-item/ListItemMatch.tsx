import _ from "lodash";
import React from "react";
import { DEFAULT_TILE } from "../../../shared/constants";
import { getReadableEvent, toMMSS } from "../../../shared/util";
import { ListItemMatchProps } from "../matches/types";
import ManaCost from "../misc/ManaCost";
import RankSmall from "../misc/RankSmall";
import ResultDetails from "../misc/ResultDetails";
import { NewTag, TagBubble } from "../misc/TagBubble";
import {
  ArchiveButton,
  Column,
  FlexBottom,
  FlexTop,
  HoverTile,
  ListItem
} from "./ListItem";

export default function ListItemMatch({
  match,
  openMatchCallback,
  archiveCallback,
  addTagCallback,
  editTagCallback,
  deleteTagCallback,
  tags
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
        grpId={match.playerDeck.deckTileId || DEFAULT_TILE}
      />

      <Column class="list_item_left">
        <FlexTop>
          <div className="list_deck_name">{match.playerDeck.name || ""}</div>
          <div className="list_deck_name_it">
            {getReadableEvent(match.eventId)}
          </div>
        </FlexTop>
        <FlexBottom>
          <ManaCost class="mana_s20" colors={match.playerDeck.colors || []} />
        </FlexBottom>
      </Column>

      <Column style={{ flexGrow: 1 }} class="list_item_right">
        <FlexTop>
          <div className="list_match_title">
            {"vs " + match.opponent.name.slice(0, -6)}
          </div>
          <RankSmall rank={match.opponent}></RankSmall>
        </FlexTop>
        <FlexBottom style={{ alignItems: "center" }}>
          <div className="list_match_time">
            <relative-time datetime={new Date(match.date || 0).toISOString()}>
              {match.date?.toString() ?? ""}
            </relative-time>{" "}
            {" " + toMMSS(match.duration) + " long"}
          </div>

          <ManaCost class="mana_s20" colors={match.oppDeck.colors || []} />
          {addTagCallback && editTagCallback ? (
            <div style={{ marginLeft: "8px" }}>
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

      <Column class="list_match_result">
        <div
          className={match.player.win > match.opponent.win ? "green" : "red"}
        >
          {match.player.win}:{match.opponent.win}
        </div>
      </Column>

      {!!archiveCallback && (
        <ArchiveButton
          archiveCallback={archiveCallback}
          dataId={match.id ?? ""}
          hover={hover}
          isArchived={match.archived ?? false}
        />
      )}
    </ListItem>
  );
}
