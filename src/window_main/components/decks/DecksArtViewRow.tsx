import React from "react";
import { CSSTransition } from "react-transition-group";
import { getCardArtCrop } from "../../../shared/util";
import { ArtTile, MetricText } from "../display";
import { TableViewRowProps } from "../tables/types";
import { DecksData } from "./types";

function DeckArt({ url }: { url: string }): JSX.Element {
  return <ArtTile style={{ backgroundImage: `url("${url}")` }} />;
}

export default function DecksArtViewRow({
  row,
  ...otherProps
}: TableViewRowProps<DecksData>): JSX.Element {
  const [hover, setHover] = React.useState(false);

  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);

  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);

  return (
    <div
      className={"decks_table_deck_tile"}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      {...otherProps}
    >
      <CSSTransition classNames="deckTileHover" in={!!hover} timeout={200}>
        <DeckArt url={getCardArtCrop(row.values["deckTileId"])} />
      </CSSTransition>
      {row.cells.map(cell => {
        // cell.hover = hover;
        return (
          <div
            className="inner_div"
            style={hover ? { backgroundColor: "rgba(0,0,0,0.4)" } : undefined}
            {...cell.getCellProps()}
            key={cell.column.id + "_" + row.index}
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
      })}
      <div className="inner_div"> </div>
    </div>
  );
}
