import { format } from "date-fns";
import _ from "lodash";
import React from "react";
import { CARD_RARITIES, DEFAULT_TILE, MANA } from "../../../shared/constants";
import pd from "../../../shared/player-data";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass
} from "../../renderer-util";
import { NewTag, TagBubble } from "../display";
import ListItem, { ListItemProps, ListItemSection } from "../ListItem";
import { TagCounts } from "../tables/types";
import { DecksData, DecksTableRowProps } from "./types";

export default function DecksListViewRow({
  row,
  ...otherProps
}: DecksTableRowProps): JSX.Element {
  return <DeckListItem deck={row.original} {...otherProps} />;
}

export interface DeckListItemProps {
  deck: DecksData;
  tags: TagCounts;
  openDeckCallback: (deckId: string | number) => void;
  archiveCallback: (id: string | number) => void;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (id: string, tag: string) => void;
}

export function DeckListItem({
  deck,
  tags,
  openDeckCallback,
  archiveCallback,
  addTagCallback,
  editTagCallback,
  deleteTagCallback
}: DeckListItemProps): JSX.Element {
  const grpId = deck.deckTileId ?? DEFAULT_TILE;
  const parentId = deck.id ?? "";
  const onClick = (): void => openDeckCallback(parentId);
  const onClickDelete = deck.custom
    ? (): void => archiveCallback(parentId)
    : undefined;

  // LEFT SECTION
  let displayName = deck.name ?? "";
  if (displayName.includes("?=?Loc/Decks/Precon/")) {
    displayName = displayName.replace("?=?Loc/Decks/Precon/", "");
  }
  const left = {
    top: <div className={"list_deck_name"}>{displayName}</div>,
    bottom: (
      <>
        {deck.colors?.map((color, index) => (
          <div key={index} className={"mana_s20 mana_" + MANA[color]} />
        ))}
      </>
    )
  };

  // CENTER SECTION
  const formatProps = {
    parentId,
    tag: deck.format ?? "unknown",
    editTagCallback,
    fontStyle: "italic",
    hideCloseButton: true
  };
  const newTagProps = {
    parentId,
    addTagCallback,
    tagPrompt: "Add",
    tags,
    title: "Add custom deck tag"
  };
  const lastTouch = new Date(deck.timeTouched);
  const center = {
    top: (
      <div className={"deck_tags_container"}>
        <TagBubble {...formatProps} />
        {deck.tags?.map((tag: string) => {
          const tagProps = {
            parentId,
            tag,
            editTagCallback,
            deleteTagCallback
          };
          return <TagBubble key={tag} {...tagProps} />;
        })}
        <NewTag {...newTagProps} />
      </div>
    ),
    bottom: (
      <div
        className={"list_deck_winrate"}
        style={{ marginLeft: "18px", marginRight: "auto", lineHeight: "18px" }}
      >
        <i style={{ opacity: 0.6 }}>updated/played:</i>{" "}
        <RelativeTime datetime={lastTouch.toISOString()} />
      </div>
    )
  };

  // RIGHT SECTION
  const missingCards = deck.common + deck.uncommon + deck.rare + deck.mythic;
  let right: ListItemSection;
  if (missingCards > 0) {
    // Deck crafting cost
    const ownedWildcards: Record<string, number> = {
      common: pd.economy.wcCommon,
      uncommon: pd.economy.wcUncommon,
      rare: pd.economy.wcRare,
      mythic: pd.economy.wcMythic
    };
    right = (
      <>
        {CARD_RARITIES.filter(rarity => rarity !== "land").map(rarity => {
          const cardRarity = rarity.toLowerCase();
          const missing =
            ((deck as unknown) as Record<string, number>)[cardRarity] ?? 0;
          if (missing > 0) {
            return (
              <div
                key={rarity}
                className={"wc_explore_cost wc_" + cardRarity}
                title={_.capitalize(cardRarity) + " wildcards needed"}
                style={{
                  flexDirection: "row",
                  marginRight: "16px"
                }}
              >
                {(ownedWildcards[cardRarity] > 0
                  ? ownedWildcards[cardRarity] + "/"
                  : "") + missing}
              </div>
            );
          }
        })}
        <div
          className={"bo_explore_cost"}
          title={"Boosters needed (estimated)"}
        >
          {deck.boosterCost}
        </div>
      </>
    );
  } else if (deck.total > 0) {
    // Winrate Stats
    let interval, tooltip;
    if (deck.total >= 20) {
      // sample Size is large enough to use Wald Interval
      interval = formatPercent(deck.interval);
      tooltip = formatWinrateInterval(
        formatPercent(deck.winrateLow),
        formatPercent(deck.winrateHigh)
      );
    } else {
      // sample size is too small (garbage results)
      interval = "???";
      tooltip = "play at least 20 matches to estimate actual winrate";
    }
    right = {
      top: (
        <div className={"list_deck_winrate"} title={tooltip}>
          {deck.wins}:{deck.losses} (
          <span className={getWinrateClass(deck.winrate) + "_bright"}>
            {formatPercent(deck.winrate)}
          </span>{" "}
          <i style={{ opacity: 0.6 }}>&plusmn; {interval}</i>)
        </div>
      ),
      bottom: (
        <div
          className={"list_deck_winrate"}
          style={{ opacity: 0.6 }}
          title={
            deck.lastEditTotal > 0
              ? `${formatPercent(deck.lastEditWinrate)} winrate since ${format(
                  new Date(deck.timeUpdated),
                  "Pp"
                )}`
              : "no data yet"
          }
        >
          Since last edit:{" "}
          {deck.lastEditTotal > 0 ? (
            <span className={getWinrateClass(deck.lastEditWinrate) + "_bright"}>
              {formatPercent(deck.lastEditWinrate)}
            </span>
          ) : (
            <span>--</span>
          )}
        </div>
      )
    };
  }

  const listItemProps: ListItemProps = {
    grpId,
    left,
    center,
    right,
    onClick,
    onClickDelete,
    archived: deck.archived
  };
  return <ListItem {...listItemProps} title={"show deck details"} />;
}
