import React from "react";
import _ from "lodash";
import { DecksTableRowProps } from "../decks/types";
import ManaCost from "../misc/ManaCost";
import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass
} from "../../rendererUtil";
import format from "date-fns/format";
import { NewTag, TagBubble } from "../misc/display";
import WildcardsCost from "../misc/WildcardsCost";
import {
  ListItem,
  Column,
  HoverTile,
  FlexTop,
  FlexBottom,
  ArchiveButton
} from "./ListItem";
import Deck from "../../../shared/deck";

export function ListItemDeck({
  row,
  tags,
  archiveCallback,
  openDeckCallback,
  addTagCallback,
  editTagCallback,
  deleteTagCallback
}: DecksTableRowProps): JSX.Element {
  const deck = row.original;
  const deckObj = new Deck(deck);
  const parentId = deck.id ?? "";

  const [tagState, setTagState] = React.useState<Array<string>>(
    deck.tags ?? []
  );
  React.useEffect(() => setTagState(deck.tags ?? []), [deck.tags]);
  const deleteTag = React.useCallback(
    (deckid: string, tag: string): void => {
      setTagState(_.without(tagState, tag));
      deleteTagCallback(deckid, tag);
    },
    [deleteTagCallback, tagState]
  );
  const addTag = React.useCallback(
    (deckid: string, tag: string): void => {
      setTagState([...tagState, tag]);
      addTagCallback(deckid, tag);
    },
    [addTagCallback, tagState]
  );

  const onRowClick = (): void => {
    openDeckCallback(deck);
  };

  const [hover, setHover] = React.useState(false);
  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);
  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);

  if (deck.name?.indexOf("?=?Loc/Decks/Precon/") != -1) {
    deck.name = deck.name?.replace("?=?Loc/Decks/Precon/", "");
  }
  if (deck.name?.indexOf("Decks/Precon_") != -1) {
    deck.name = deck.name?.replace("Decks/Precon_", "");
  }

  const lastTouch = new Date(deck.timeTouched);
  const deckLastTouchedStyle = {
    marginRight: "auto",
    lineHeight: "18px"
  };

  // Deck winrates
  let winrateInterval = "???";
  let winrateTooltip = "play at least 20 matches to estimate actual winrate";
  let winrateEditTooltip = "no data yet";
  if (deck.total > 0) {
    if (deck.total >= 20) {
      winrateInterval = formatPercent(deck.interval);
      winrateTooltip = formatWinrateInterval(deck.winrateLow, deck.winrateHigh);
    }
    if (deck.lastEditTotal > 0) {
      winrateEditTooltip = `${formatPercent(
        deck.lastEditWinrate
      )} winrate since ${format(new Date(deck.lastUpdated || 0), "Pp")}`;
    }
  }
  const formatProps = {
    parentId,
    tag: deck.format ?? "unknown",
    editTagCallback,
    fontStyle: "italic",
    hideCloseButton: true
  };
  const newTagProps = {
    parentId,
    addTagCallback: addTag,
    tagPrompt: "Add",
    tags,
    title: "Add custom deck tag"
  };

  return (
    <ListItem
      click={onRowClick}
      mouseEnter={mouseEnter}
      mouseLeave={mouseLeave}
    >
      <HoverTile hover={hover} grpId={deck.deckTileId || 0} />
      <Column class="list_item_left">
        <FlexTop innerClass="list_deck_name">{deck.name || ""}</FlexTop>
        <FlexBottom>
          <ManaCost class="mana_s20" colors={deck.colors || []} />
        </FlexBottom>
      </Column>

      <Column class="list_item_center">
        <FlexTop innerClass="deck_tags_container">
          <TagBubble {...formatProps} />
          {tagState.map((tag: string) => {
            const tagProps = {
              parentId,
              tag,
              editTagCallback,
              deleteTagCallback: deleteTag
            };
            return <TagBubble key={tag} {...tagProps} />;
          })}
          <NewTag {...newTagProps} />
        </FlexTop>
        <FlexBottom innerClass="list_deck_last">
          updated/played:{" "}
          <i style={deckLastTouchedStyle}>
            <relative-time datetime={lastTouch.toISOString()}>
              {lastTouch.toString()}
            </relative-time>
          </i>
        </FlexBottom>
      </Column>
      <Column class="list_item_right">
        {deck.total > 0 ? (
          <>
            <FlexTop title={winrateTooltip} innerClass="list_deck_winrate">
              {deck.wins}:{deck.losses} (
              <span className={getWinrateClass(deck.winrate) + "_bright"}>
                {formatPercent(deck.winrate)}
              </span>{" "}
              <i style={{ opacity: 0.6 }}>&plusmn; {winrateInterval}</i>)
            </FlexTop>
            <FlexBottom
              title={winrateEditTooltip}
              innerClass="list_deck_winrate"
            >
              Since last edit:{" "}
              {deck.lastEditTotal > 0 ? (
                <span
                  className={getWinrateClass(deck.lastEditWinrate) + "_bright"}
                >
                  {formatPercent(deck.lastEditWinrate)}
                </span>
              ) : (
                <span>---</span>
              )}
            </FlexBottom>
          </>
        ) : (
          <WildcardsCost deck={deckObj} />
        )}
      </Column>
      {!!deck.custom && (
        <ArchiveButton
          archiveCallback={archiveCallback}
          dataId={deck.id || ""}
          hover={hover}
          isArchived={deck.archived || false}
        />
      )}
    </ListItem>
  );
}
