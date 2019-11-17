import React from "react";

import {
  MANA,
  OVERLAY_LOG,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_MIXED,
  OVERLAY_SEEN
} from "../shared/constants";

import { LogData, MatchData, OverlaySettingsData } from "./overlayUtil";
import ActionLog from "./ActionLog";
import Clock from "./Clock";
import DeckList from "./DeckList";
import { DbCardData } from "../shared/types/Metadata";

const manaColorMap: { [key: number]: string } = MANA;

export interface MatchElementsProps {
  actionLog: LogData[];
  index: number;
  match: MatchData;
  setHoverCardCallback: (card?: DbCardData) => void;
  setOddsCallback: (sampleSize: number) => void;
  settings: OverlaySettingsData;
  tileStyle: number;
  turnPriority: number;
}

/**
 * This is a display component that renders most of the contents of an overlay
 * window set in one of the match-related modes.
 */
export default function MatchElements(props: MatchElementsProps): JSX.Element {
  const {
    actionLog,
    index,
    match,
    setHoverCardCallback,
    setOddsCallback,
    settings,
    tileStyle,
    turnPriority
  } = props;
  let visibleDeck = null;
  let cardsCount = 0;
  let mainTitle = "Overlay " + (index + 1);
  let subTitle = "";

  let cleanName = match.opponent && match.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  const oppName = cleanName || "Opponent";

  const cardOdds = match.playerCardsOdds;
  const sampleSize = cardOdds.sampleSize || 1;

  switch (settings.mode) {
    case OVERLAY_LOG:
      mainTitle = "Action Log";
      // TODO add subtitle with current turn number
      break;
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
  return (
    <div
      className="outer_wrapper elements_wrapper"
      style={{ opacity: settings.alpha.toString() }}
    >
      {!!settings.title && <div className="overlay_deckname">{mainTitle}</div>}
      {settings.mode === OVERLAY_SEEN && (
        <div className="overlay_archetype">{match.oppArchetype}</div>
      )}
      {!!settings.title && !!visibleDeck && (
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
        <ActionLog
          actionLog={actionLog}
          setHoverCardCallback={setHoverCardCallback}
        />
      )}
      {!!visibleDeck && (
        <DeckList
          deck={visibleDeck}
          subTitle={subTitle}
          settings={settings}
          tileStyle={tileStyle}
          setHoverCardCallback={setHoverCardCallback}
          setOddsCallback={setOddsCallback}
        />
      )}
      {!!settings.clock && (
        <Clock
          key={"overlay_clock_" + index}
          matchBeginTime={new Date(match.beginTime)}
          oppName={oppName}
          playerSeat={match.player ? match.player.seat : 1}
          priorityTimers={match.priorityTimers}
          turnPriority={turnPriority}
        />
      )}
    </div>
  );
}
