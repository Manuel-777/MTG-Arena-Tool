import React from "react";
import { DEFAULT_TILE } from "../../../shared/constants";
import { ListViewRow } from "../tables/ListViewRow";
import { ListViewRowProps } from "../tables/types";
import { DecksData, DecksTableRowProps } from "./types";

export default function DecksListViewRow({
  row,
  openDeckCallback,
  ...otherProps
}: DecksTableRowProps): JSX.Element {
  const deck = row.original;
  const grpId = deck.deckTileId ?? DEFAULT_TILE;
  const listProps: ListViewRowProps<DecksData> = {
    row,
    grpId,
    title: "show deck details",
    openCallback: openDeckCallback,
    ...otherProps
  };
  return <ListViewRow {...listProps} />;
}
