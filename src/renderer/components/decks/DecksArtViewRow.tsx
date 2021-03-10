import React, { useState } from "react";
import { DecksTableRowProps } from "./types";
import { useSpring, animated } from "react-spring";
import ManaCost from "../misc/ManaCost";
import {
  getWinrateClass,
  get_deck_missing as getDeckMissing,
} from "../../rendererUtil";
import WildcardsCost from "../misc/WildcardsCost";
import { getCardArtCrop } from "../../../shared/utils/getCardArtCrop";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import { useDispatch } from "react-redux";
import deckTableCss from "./deckTable.css";
import DeckColorsBar from "../misc/DeckColorsBar";
import { constants, Deck, formatPercent } from "mtgatool-shared";
const { IPC_NONE } = constants;

export default function DecksArtViewRow({
  row,
  archiveCallback,
  openDeckCallback,
}: DecksTableRowProps): JSX.Element {
  const deck = row.original;
  const onRowClick = (): void => {
    openDeckCallback(deck);
  };

  const [hover, setHover] = useState(0);
  const props = useSpring({
    filter: "brightness(" + (hover ? "1.1" : "1.0") + ")",
    backgroundSize: "auto " + Math.round(hover ? 210 : 175) + "px",
    config: { mass: 5, tension: 2000, friction: 150 },
  });

  const mouseEnter = React.useCallback(() => {
    setHover(1);
  }, []);

  const mouseLeave = React.useCallback(() => {
    setHover(0);
  }, []);

  // Deck winrates
  let winrateInterval = "???";
  //let winrateTooltip = "play at least 20 matches to estimate actual winrate";
  //let winrateEditTooltip = "no data yet";
  if (deck.total > 0) {
    if (deck.total >= 20) {
      winrateInterval = formatPercent(deck.interval);
      //winrateTooltip = formatWinrateInterval(deck.winrateLow, deck.winrateHigh);
    }
    /*
    if (deck.lastEditTotal > 0) {
      winrateEditTooltip = `${formatPercent(
        deck.lastEditWinrate
      )} winrate since ${format(new Date(deck.lastUpdated || 0), "Pp")}`;
    }
    */
  }

  const lastTouch = new Date(deck.timeTouched);
  const missingWildcards = getDeckMissing(new Deck(deck));
  const totalMissing =
    missingWildcards.common +
    missingWildcards.uncommon +
    missingWildcards.rare +
    missingWildcards.mythic;

  return (
    <animated.div
      className={deckTableCss.decksTableDeckTile}
      onClick={onRowClick}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      style={
        {
          ...props,
          backgroundImage: `url(${getCardArtCrop(row.values["deckTileId"])})`,
        } as any
      }
    >
      <DeckColorsBar deck={new Deck(deck)} />
      {!!deck.custom && (
        <ArchiveArtViewButton
          archiveCallback={archiveCallback}
          dataId={deck.id || ""}
          isArchived={deck.archived || false}
        />
      )}
      <div className={deckTableCss.decksTableDeckInner}>
        <div className={deckTableCss.decksTableDeckItem}>{deck.name}</div>
        <div className={deckTableCss.decksTableDeckItem}>
          <ManaCost colors={deck.colors || []} />
        </div>
        <div className={deckTableCss.decksTableDeckItem}>
          {deck.total > 0 ? (
            <>
              {deck.wins}:{deck.losses} (
              <span className={getWinrateClass(deck.winrate, true)}>
                {formatPercent(deck.winrate)}
              </span>{" "}
              <i style={{ opacity: 0.6 }}>&plusmn; {winrateInterval}</i>)
            </>
          ) : totalMissing > 0 ? (
            <WildcardsCost deck={new Deck(deck)} shrink={true} />
          ) : (
            <span>---</span>
          )}
        </div>
        {totalMissing == 0 ? (
          <div className={deckTableCss.decksTableDeckItem}>
            <relative-time datetime={lastTouch.toISOString()}>
              {lastTouch.toString()}
            </relative-time>
          </div>
        ) : (
          <></>
        )}
      </div>
    </animated.div>
  );
}

interface ArchiveButtonProps {
  archiveCallback: (id: string) => void;
  isArchived: boolean;
  dataId: string;
}

function ArchiveArtViewButton(props: ArchiveButtonProps): JSX.Element {
  const { isArchived, archiveCallback, dataId } = props;
  const dispatcher = useDispatch();
  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      reduxAction(
        dispatcher,
        { type: "SET_ARCHIVED", arg: { id: dataId, archived: !isArchived } },
        IPC_NONE
      );
      archiveCallback(dataId);
    },
    [archiveCallback, dataId, dispatcher, isArchived]
  );

  return (
    <div
      onClick={onClick}
      className={
        isArchived
          ? deckTableCss.decksTableDeckUnarchive
          : deckTableCss.decksTableDeckArchive
      }
      title={isArchived ? "restore" : "archive (will not delete data)"}
    />
  );
}
