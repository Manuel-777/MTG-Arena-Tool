import React from "react";
import { getCardArtCrop } from "../../shared/util";
import { DecksTableRowProps } from "./decks/types";
import ManaCost from "./ManaCost";

export function ListItemDeck({
  row,
  openDeckCallback
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
      <Column class="list_item_center">?</Column>
      <Column class="list_item_right">?</Column>
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
  innerClass?: string;
}

// These two are technically equal, but I like the way
// of using them as different components, it makes coding
// complex list items prettier.
export function FlexTop(props: FlexProps): JSX.Element {
  return (
    <div className="flex_top">
      {props.innerClass ? (
        <div className={props.innerClass}>{props.children}</div>
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
        <div className={props.innerClass}>{props.children}</div>
      ) : (
        props.children
      )}
    </div>
  );
}
