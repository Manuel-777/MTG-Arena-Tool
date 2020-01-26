import React from "react";
import { getCardArtCrop } from "../../shared/util";
import { DecksTableRowProps } from "./decks/types";
import ManaCost from "./ManaCost";
import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass
} from "../renderer-util";
import format from "date-fns/format";
import { TagBubble } from "./display";
import WildcardsCost from "./WildcardsCost";
export function ListItemDeck({
  row,
  archiveCallback,
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

  const lastTouch = new Date(deck.timeTouched);
  const deckLastTouchedStyle = {
    marginLeft: "18px",
    marginRight: "auto",
    lineHeight: "18px",
    opacity: 0.6
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
        <FlexBottom>
          <i style={deckLastTouchedStyle}>
            <relative-time datetime={lastTouch.toISOString()}>
              updated/played: {lastTouch.toString()}
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
        archiveCallback={archiveCallback}
        dataId={deck.id || ""}
        hover={hover}
        isArchived={deck.archived || false}
      />
    </ListItem>
  );
}

interface ListItemnProps extends JSX.ElementChildrenAttribute {
  click: VoidFunction;
  mouseEnter: VoidFunction;
  mouseLeave: VoidFunction;
}

export function ListItem(props: ListItemnProps): JSX.Element {
  const { click, mouseEnter, mouseLeave } = props;
  return (
    <div
      onClick={click}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      className="list_item_container"
    >
      {props.children}
    </div>
  );
}

function getHoverStyle(hover: boolean): React.CSSProperties {
  return hover
    ? {
        opacity: "1",
        width: "200px"
      }
    : {
        opacity: "0.66",
        width: "128px"
      };
}

interface HoverTileProps {
  hover: boolean;
  grpId: number;
}

export function HoverTile(props: HoverTileProps): JSX.Element {
  const { hover, grpId } = props;

  return (
    <div
      className="list_item_image"
      style={{
        backgroundImage: `url(${getCardArtCrop(grpId)})`,
        ...getHoverStyle(hover)
      }}
    ></div>
  );
}

interface ColumnProps extends JSX.ElementChildrenAttribute {
  class: string;
}

export function Column(props: ColumnProps): JSX.Element {
  return (
    <div style={{ flexDirection: "column" }} className={props.class}>
      {props.children}
    </div>
  );
}

interface FlexProps extends JSX.ElementChildrenAttribute {
  title?: string;
  innerClass?: string;
}

// These two are technically equal, but I like the way
// of using them as different components, it makes coding
// complex list items prettier.
export function FlexTop(props: FlexProps): JSX.Element {
  return (
    <div className="flex_top">
      {props.innerClass ? (
        <div title={props.title} className={props.innerClass}>
          {props.children}
        </div>
      ) : (
        props.children
      )}
    </div>
  );
}

export function FlexBottom(props: FlexProps): JSX.Element {
  return (
    <div className="flex_bottom">
      {props.innerClass ? (
        <div title={props.title} className={props.innerClass}>
          {props.children}
        </div>
      ) : (
        props.children
      )}
    </div>
  );
}

interface ArchiveButtonProps {
  archiveCallback: (id: string) => void;
  hover: boolean;
  isArchived: boolean;
  dataId: string;
}

function archiveButtonStyle(hover: boolean): React.CSSProperties {
  return hover
    ? {
        width: "32px"
      }
    : {
        width: "4px"
      };
}

export function ArchiveButton(props: ArchiveButtonProps): JSX.Element {
  const { isArchived, archiveCallback, dataId } = props;

  return (
    <div
      onClick={(e): void => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        archiveCallback(dataId);
      }}
      className={isArchived ? "list_item_unarchive" : "list_item_archive"}
      title={isArchived ? "restore" : "archive (will not delete data)"}
      style={archiveButtonStyle(props.hover)}
    ></div>
  );
}
