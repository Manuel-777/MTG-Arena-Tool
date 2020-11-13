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
import {TagBubble} from "../misc/TagBubble";
const { IPC_NONE } = constants;

export default function DecksArtViewRow({
  row,
  archiveCallback,
  openDeckCallback,
  editTagCallback,
}: DecksTableRowProps): JSX.Element {
  const deck = row.original;
  const deckObj = new Deck(deck);
  const parentId = deck.id ?? "";

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
  const formatProps = {
    parentId,
    tag: deck.format ?? "unknown",
    editTagCallback,
    fontStyle: "italic",
    hideCloseButton: true,
  };

  const lastTouch = new Date(deck.timeTouched);
  const missingWildcards = getDeckMissing(deckObj);
  const totalMissing =
    missingWildcards.common +
    missingWildcards.uncommon +
    missingWildcards.rare +
    missingWildcards.mythic;

  return (
    <div
      style={{position: "relative"}}
      className={deckTableCss.decksTableDeckTile}
      onClick={onRowClick}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
    >
      <animated.div
        style={{
          ...props,
          position: "absolute",
          width: "210px",
          height: "170px",
          backgroundImage: `url(${getCardArtCrop(row.values["deckTileId"])})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div style={{display: "flex", width: "100%", height: "4px"}}>
        <DeckColorsBar deck={deckObj} />
      </div>
      {!!deck.custom && (
        <ArchiveArtViewButton
          archiveCallback={archiveCallback}
          dataId={parentId}
          isArchived={deck.archived || false}
        />
      )}
      <div style={{marginLeft: "auto", marginTop: "auto"}}>
        <TagBubble {...formatProps} />
      </div>
      <div style={{zIndex: 0}} className={deckTableCss.decksTableDeckInner}>
        <div className={deckTableCss.decksTableDeckItem}>
          {deck.name}
        </div>
        <div className={deckTableCss.decksTableDeckItem}>
          <ManaCost colors={deck.colors || []} />
        </div>
        <div className={deckTableCss.decksTableDeckItem}>
          {deck.total > 0 ? (
            <>
              <span>
                {deck.wins}:{deck.losses}
              </span>
              &nbsp;
              <span>(</span>
              <span className={getWinrateClass(deck.winrate, true)}>
                {formatPercent(deck.winrate)}
              </span>
              &nbsp;
              <span style={{fontStyle: "italic", opacity: 0.6}}>
                &plusmn; {winrateInterval}
              </span>
              <span>)</span>
            </>
          ) : totalMissing > 0 ? (
            <WildcardsCost deck={deckObj} shrink={true} />
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
    </div>
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
