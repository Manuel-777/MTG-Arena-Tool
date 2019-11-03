import React, { useCallback, useState } from "react";

import {
  MANA,
  PACK_SIZES,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_MIXED,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG,
  OVERLAY_DRAFT_BREW,
  OVERLAY_DRAFT_MODES
} from "../shared/constants";
import Deck from "../shared/deck";

import Clock from "./Clock";
import ActionLog from "./ActionLog";
import DeckList from "./DeckList";

const packSizeMap: { [key: string]: number } = PACK_SIZES;
const manaColorMap: { [key: number]: string } = MANA;

export interface OverlayProps {
  actionLog: any;
  draft: any;
  index: number;
  match: any;
  playerSeat: number;
  settings: any;
  tileStyle: number;
  turnPriority: number;
  setOddsCallback: (sampleSize: number) => void;
}

export default function Overlay(props: OverlayProps): JSX.Element {
  const [draftState, setDraftState] = useState({ packN: 0, pickN: 0 });
  const {
    actionLog,
    draft,
    index,
    match,
    playerSeat,
    settings,
    tileStyle,
    turnPriority,
    setOddsCallback
  } = props;

  let visibleDeck = null;
  let cardsCount = 0;
  let mainTitle = "Overlay " + (index + 1);
  let subTitle = "";

  if (settings.mode === OVERLAY_LOG) {
    mainTitle = "Action Log";
    // TODO add subtitle with current turn number
  }

  const packSize = (draft && packSizeMap[draft.set]) || 14;

  const handleDraftPrev = useCallback((): void => {
    let { packN, pickN } = draftState;
    pickN -= 1;
    if (pickN < 0) {
      pickN = packSize;
      packN -= 1;
    }
    if (packN < 0) {
      pickN = draft.pickNumber;
      packN = draft.packNumber;
    }
    setDraftState({ packN, pickN });
  }, [draftState, draft]);

  const handleDraftNext = useCallback((): void => {
    let { packN, pickN } = draftState;
    pickN += 1;
    if (pickN > packSize) {
      pickN = 0;
      packN += 1;
    }
    if (pickN > draft.pickNumber && packN == draft.packNumber) {
      pickN = 0;
      packN = 0;
    }
    if (
      packN > draft.packNumber ||
      (pickN == draft.pickNumber && packN == draft.packNumber)
    ) {
      packN = draft.packNumber;
      pickN = draft.pickNumber;
    }
    setDraftState({ packN, pickN });
  }, [draftState, draft]);

  const { packN, pickN } = draftState;
  let pack = [];
  let pick = "";
  let isCurrent = false;
  let pickName = "";
  if (draft) {
    isCurrent = packN === draft.packNumber && pickN === draft.pickNumber;
    pickName = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
    if (isCurrent) {
      pickName += " - Current";
    }
    const key = "pack_" + packN + "pick_" + pickN;
    if (key in draft) {
      pack = draft[key].pack;
      pick = draft[key].pick;
    } else if (isCurrent) {
      pack = draft.currentPack;
      pick = "";
    }

    if (settings.mode === OVERLAY_DRAFT) {
      visibleDeck = new Deck({ name: pickName }, pack);
      cardsCount = visibleDeck.mainboard.count();
      mainTitle = visibleDeck.name;
      subTitle = "Cards Left: " + cardsCount + " cards";
    } else if (settings.mode === OVERLAY_DRAFT_BREW) {
      visibleDeck = new Deck({ name: "All Picks" }, draft.pickedCards);
      cardsCount = visibleDeck.mainboard.count();
      mainTitle = visibleDeck.name;
      subTitle = "Total Picks: " + cardsCount + " cards";
    }
  }

  let cleanName = match && match.opponent && match.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  const oppName = cleanName || "Opponent";
  let sampleSize = 1;
  if (match) {
    const cardOdds = match.playerCardsOdds;
    sampleSize = cardOdds.sampleSize || 1;
    switch (settings.mode) {
      case OVERLAY_FULL:
        visibleDeck = match.player.deck;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = visibleDeck.name;
        subTitle = "Full Deck: " + cardsCount + " cards";
        break;
      case OVERLAY_LEFT:
        visibleDeck = match.playerCardsLeft;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = visibleDeck.name;
        subTitle = "Library: " + cardsCount + " cards";
        break;
      case OVERLAY_ODDS:
      case OVERLAY_MIXED:
        visibleDeck = match.playerCardsLeft;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = visibleDeck.name;
        subTitle = `Next Draw: ${sampleSize}/${cardsCount} cards`;
        break;
      case OVERLAY_SEEN:
        visibleDeck = match.oppCards;
        cardsCount = visibleDeck.mainboard.count();
        mainTitle = "Played by " + oppName;
        subTitle = "Total Seen: " + cardsCount + " cards";
        break;
    }
  }

  return (
    <>
      {settings.title && <div className="overlay_deckname">{mainTitle}</div>}
      {settings.mode === OVERLAY_SEEN && match && (
        <div className="overlay_archetype">{match.oppArchetype}</div>
      )}
      {settings.title && visibleDeck && (
        <div className="overlay_deckcolors">
          {visibleDeck.colors.get().map((color: number) => (
            <div
              className={"mana_s20 mana_" + manaColorMap[color]}
              key={color}
            />
          ))}
        </div>
      )}
      {settings.mode === OVERLAY_LOG && (
        <ActionLog actionLog={actionLog} index={index} />
      )}
      {settings.deck && visibleDeck && (
        <DeckList
          deck={visibleDeck}
          subTitle={subTitle}
          highlightCardId={pick}
          settings={settings}
          tileStyle={tileStyle}
          cardOdds={match ? match.playerCardsOdds : {}}
          setOddsCallback={setOddsCallback}
        />
      )}
      {settings.clock && !OVERLAY_DRAFT_MODES.includes(settings.mode) && (
        <Clock
          key={"overlay_clock_" + index}
          matchBeginTime={match ? new Date(match.beginTime) : new Date()}
          oppName={match ? match.opponent.name : "Opponent"}
          playerSeat={playerSeat}
          priorityTimers={match ? match.priorityTimers : []}
          turnPriority={turnPriority}
        />
      )}
      {settings.mode === OVERLAY_DRAFT && (
        <div className="overlay_draft_container">
          <div className="draft_prev click-on" onClick={handleDraftPrev} />
          <div className="draft_title" />
          <div className="draft_next click-on" onClick={handleDraftNext} />
        </div>
      )}
    </>
  );
}
