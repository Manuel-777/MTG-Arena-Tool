import { ipcRenderer as ipc } from "electron";
import React, { useRef, useEffect } from "react";
import useMeasure from "react-use-measure";
import ActionLog from "../shared/ActionLog";
import Clock from "./Clock";
import DeckList from "./DeckList";

import css from "./index.css";
import ManaCost from "../renderer/components/misc/ManaCost";
import { useSelector } from "react-redux";
import { AppState } from "../shared/redux/stores/backgroundStore";
import { constants, MatchData, OverlaySettingsData } from "mtgatool-shared";

const {
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_LOG,
  OVERLAY_MIXED,
  OVERLAY_ODDS,
  OVERLAY_SEEN,
  IPC_ALL,
  OVERLAY_DRAFT,
  OVERLAY_DRAFT_BREW,
} = constants;

interface MatchElementsProps {
  actionLog: string;
  index: number;
  match: MatchData;
  setOddsCallback: (sampleSize: number) => void;
  settings: OverlaySettingsData;
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
    setOddsCallback,
    settings,
    turnPriority,
  } = props;
  let visibleDeck = null;
  let cardsCount = 0;
  let mainTitle = "Overlay " + (index + 1);
  let subTitle = "";
  const [ref, bounds] = useMeasure();
  const fullSettings = useSelector((state: AppState) => state.settings);
  const scrollBottom = useRef<null | HTMLDivElement>(null);

  // Auto adjust
  let doAutoSize = false;
  if (
    settings &&
    settings.autosize &&
    settings.show &&
    settings.mode !== OVERLAY_DRAFT &&
    settings.mode !== OVERLAY_DRAFT_BREW &&
    settings.mode !== OVERLAY_LOG &&
    bounds &&
    bounds.height > 0
  ) {
    doAutoSize = true;
    if (bounds.height !== settings.bounds.height) {
      const newOverlays = [...fullSettings.overlays];
      newOverlays[index] = {
        ...fullSettings.overlays[index], // old overlay
        bounds: {
          ...settings.bounds,
          height: bounds.height,
        },
      };

      // Send to ipc, dispatching here creates an overflow.
      ipc.send(
        "redux-action",
        "SET_SETTINGS",
        JSON.stringify({ overlays: newOverlays }),
        IPC_ALL
      );
    }
  }

  useEffect(() => {
    const scrollDiv = scrollBottom?.current;
    // Autoscroll if the div is on bottom only
    if (
      scrollDiv &&
      scrollDiv.scrollTop + scrollDiv.clientHeight > scrollDiv.scrollHeight - 56
    ) {
      const scrollHeight = scrollDiv.scrollHeight;
      const height = scrollDiv.clientHeight;
      const maxScrollTop = scrollHeight - height;
      scrollDiv.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  }, [scrollBottom, actionLog]);

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
      cardsCount = visibleDeck.getMainboard().count();
      mainTitle = visibleDeck.getName();
      subTitle = "Full Deck: " + cardsCount + " cards";
      break;
    case OVERLAY_LEFT:
      visibleDeck = match.playerCardsLeft;
      cardsCount = visibleDeck.getMainboard().count();
      mainTitle = visibleDeck.getName();
      subTitle = "Library: " + cardsCount + " cards";
      break;
    case OVERLAY_ODDS:
    case OVERLAY_MIXED:
      visibleDeck = match.playerCardsLeft;
      cardsCount = visibleDeck.getMainboard().count();
      mainTitle = visibleDeck.getName();
      subTitle = `Next Draw: ${sampleSize}/${cardsCount} cards`;
      break;
    case OVERLAY_SEEN:
      visibleDeck = match.oppCards;
      cardsCount = visibleDeck.getMainboard().count();
      mainTitle = "Played by " + oppName;
      subTitle = "Total Seen: " + cardsCount + " cards";
      break;
  }
  visibleDeck?.getMainboard().removeZeros(true);
  visibleDeck?.getSideboard().removeZeros(true);
  return (
    <div
      className={`${css.outerWrapper} elements_wrapper`}
      style={{ opacity: settings.alpha.toString() }}
    >
      <div
        ref={ref}
        className={css.flexColumn}
        style={doAutoSize ? {} : { height: `inherit` }}
      >
        {!!settings.title && (
          <div className={css.overlayDeckname}>{!settings.collapsed && mainTitle}</div>
        )}
        {settings.mode === OVERLAY_SEEN && (
          <div className={css.overlayArchetype}>
            {visibleDeck?.archetype || visibleDeck?.tags.join(" ")}
          </div>
        )}
        {!!settings.title && !!visibleDeck && (
          <div className={css.overlayDeckcolors}>
            <ManaCost colors={visibleDeck.colors.get()} />
          </div>
        )}
        {settings.mode === OVERLAY_LOG && (
          <div
            ref={scrollBottom}
            className={css.clickOn}
            style={{
              overflowY: "auto",
            }}
          >
            <ActionLog logStr={actionLog} />
          </div>
        )}
        {!!visibleDeck && (
          <div className={css.clickOn} style={{ overflow: "auto" }}>
            <DeckList
              deck={visibleDeck}
              subTitle={subTitle}
              settings={settings}
              cardOdds={cardOdds}
              setOddsCallback={setOddsCallback}
            />
          </div>
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
    </div>
  );
}
