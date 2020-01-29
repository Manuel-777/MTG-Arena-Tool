import React from "react";

import { DecksTableRowProps } from "../decks/types";
import ManaCost from "../ManaCost";
import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass,
  toggleArchived
} from "../../renderer-util";
import format from "date-fns/format";
import { TagBubble } from "../display";
import WildcardsCost from "../WildcardsCost";
import {
  ListItem,
  Column,
  HoverTile,
  FlexTop,
  FlexBottom,
  ArchiveButton
} from "./ListItem";

export function ListItemDeck({
  row,
  openDeckCallback,
  editTagCallback,
  deleteTagCallback
}: DecksTableRowProps): JSX.Element {
  const deck = row.original;
  const parentId = deck.id ?? "";

  const onRowClick = (): void => {
    openDeckCallback(parentId);
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
      winrateTooltip = formatWinrateInterval(
        formatPercent(deck.winrateLow),
        formatPercent(deck.winrateHigh)
      );
    }
    if (deck.lastEditTotal > 0) {
      winrateEditTooltip = `${formatPercent(
        deck.lastEditWinrate
      )} winrate since ${format(new Date(deck.lastUpdated || 0), "Pp")}`;
    }
  }

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
          {[...(deck.tags ? deck.tags : []), deck.format || ""].map(
            (tag: string) => {
              return (
                <TagBubble
                  hideCloseButton
                  key={tag}
                  tag={tag}
                  parentId={deck.id || ""}
                  editTagCallback={editTagCallback}
                  deleteTagCallback={deleteTagCallback}
                ></TagBubble>
              );
            }
          )}
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
          <WildcardsCost deck={deck} />
        )}
      </Column>
      <ArchiveButton
        archiveCallback={toggleArchived}
        dataId={deck.id || ""}
        hover={hover}
        isArchived={deck.archived || false}
      />
    </ListItem>
  );
}
