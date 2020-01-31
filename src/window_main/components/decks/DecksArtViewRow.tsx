import React from "react";
import { Cell } from "react-table";
import { CSSTransition } from "react-transition-group";
import { getCardArtCrop } from "../../../shared/util";
import { ArtTile, MetricText } from "../display";
import { DecksData, DecksTableRowProps } from "./types";

function DeckArt({ url }: { url: string }): JSX.Element {
  return <ArtTile style={{ backgroundImage: `url("${url}")` }} />;
}

function DecksArtViewCell({
  cell,
  hover
}: {
  cell: Cell<DecksData>;
  hover: boolean;
}): JSX.Element {
  return (
    <div
      className="inner_div"
      style={hover ? { backgroundColor: "rgba(0,0,0,0.4)" } : undefined}
      {...cell.getCellProps()}
    >
      {cell.column.needsTileLabel && (
        <MetricText
          style={{
            paddingRight: "8px",
            fontSize: "small",
            whiteSpace: "nowrap",
            fontWeight: 300,
            color: "var(--color-light-50)"
          }}
        >
          {cell.column.render("Header")}:
        </MetricText>
      )}
      {cell.render("Cell")}
    </div>
  );
}

export default function DecksArtViewRow({
  row,
  openDeckCallback,
  ...otherProps
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
  const divProps = { ...otherProps };
  delete divProps.index;
  delete divProps.gridTemplateColumns;
  return (
    <div
      className={"decks_table_deck_tile"}
      onClick={onRowClick}
      title={"show deck details"}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      {...divProps}
    >
      <CSSTransition classNames="deckTileHover" in={!!hover} timeout={200}>
        <DeckArt url={getCardArtCrop(row.values["deckTileId"])} />
      </CSSTransition>
      {row.cells.map(cell => {
        return (
          <DecksArtViewCell
            key={cell.column.id + "_" + row.index}
            cell={cell}
            hover={hover}
          />
        );
      })}
      <div className="inner_div"> </div>
    </div>
  );
}
