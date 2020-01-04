/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { CSSTransition } from "react-transition-group";

import { getCardArtCrop } from "../../../shared/util";

import { ArtTileCell } from "./cells";
import { MetricText } from "../display";
import { DecksTableRowProps } from "./types";

export function DecksTableViewRow({
  row,
  index,
  openDeckCallback,
  gridTemplateColumns
}: DecksTableRowProps): JSX.Element {
  const deckId = row.values.deckId;
  const mouseClick = React.useCallback(() => {
    openDeckCallback(deckId);
  }, [deckId]);
  return (
    <div
      className={
        "decks_table_body_row " + (index % 2 == 0 ? "line_light" : "line_dark")
      }
      style={{ gridTemplateColumns }}
      onClick={mouseClick}
    >
      {row.cells.map((cell: any) => {
        return (
          <div
            className="inner_div"
            {...cell.getCellProps()}
            key={cell.column.id + "_" + row.index}
            title={`show ${row.values.name} details`}
          >
            {cell.render("Cell")}
          </div>
        );
      })}
    </div>
  );
}

export function DecksArtViewRow({
  row,
  openDeckCallback
}: DecksTableRowProps): JSX.Element {
  const [hover, setHover] = React.useState(false);

  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);

  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);

  const deckId = row.values.deckId;
  const mouseClick = React.useCallback(() => {
    openDeckCallback(deckId);
  }, [deckId]);

  return (
    <div
      className={"decks_table_deck_tile"}
      title={`show ${row.values.name} details`}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      onClick={mouseClick}
    >
      <CSSTransition classNames="deckTileHover" in={!!hover} timeout={200}>
        <ArtTileCell url={getCardArtCrop(row.values["deckTileId"])} />
      </CSSTransition>
      {row.cells.map((cell: any) => {
        cell.hover = hover;
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
