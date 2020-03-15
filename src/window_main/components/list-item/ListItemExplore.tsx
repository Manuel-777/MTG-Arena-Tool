import React from "react";

import { RANKS } from "../../../shared/constants";
import ManaCost from "../misc/ManaCost";
import { formatPercent, getWinrateClass } from "../../rendererUtil";
import { ListItem, Column, HoverTile, FlexTop, FlexBottom } from "./ListItem";
import WildcardsCostPreset from "../misc/WildcardsCostPreset";
import RankSmall from "../misc/RankSmall";

export interface ExploreDeck {
  _id: string;
  eventId: string;
  name: string;
  mainDeck: any[];
  sideboard: any[];
  commander: any[];
  tile: number;
  rank: string[];
  player: string[];
  colors: number[];
  date: string;
  gw: number;
  gl: number;
  mw: number;
  ml: number;
  mt: number;
  gt: number;
  mwrate: number;
  w: number;
  l: number;
  wildcards: {
    u?: number;
    r?: number;
    m?: number;
    c?: number;
  };
}

interface ListItemExploreProps {
  row: ExploreDeck;
  openCallback: (row: any) => void;
}

export function ListItemExplore(props: ListItemExploreProps): JSX.Element {
  const { row, openCallback } = props;
  const [hover, setHover] = React.useState(false);

  const onRowClick = (): void => {
    openCallback(row);
  };

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
      <HoverTile hover={hover} grpId={row.tile || 0} />
      <Column class="list_item_left">
        <FlexTop>
          <div className="list_deck_name">{row.name || ""}</div>
          <div
            className="list_deck_name_it"
            style={{
              textDecoration: row.player.length > 1 ? "underline dotted" : ""
            }}
            title={row.player.length > 1 ? row.player.join(", ") : ""}
          >
            {row.player.length > 1
              ? row.player.length + " players"
              : "by " + row.player[0]}
          </div>
        </FlexTop>
        <FlexBottom>
          <ManaCost class="mana_s20" colors={row.colors || []} />
        </FlexBottom>
      </Column>

      <Column class="list_item_center">
        <WildcardsCostPreset wildcards={row.wildcards} />
      </Column>
      <Column class="list_item_right">
        <FlexTop innerClass="list_deck_winrate">
          {row.mw}:{row.ml} (
          <span className={getWinrateClass(row.mwrate) + "_bright"}>
            {formatPercent(row.mwrate)}
          </span>
          )
        </FlexTop>
        <FlexBottom style={{ justifyContent: "flex-end", marginRight: "18px" }}>
          {RANKS.map(r => {
            if (row.rank.includes(r)) {
              return <RankSmall key={row._id + "-r-" + r} rankTier={r} />;
            }
          })}
        </FlexBottom>
      </Column>
    </ListItem>
  );
}
