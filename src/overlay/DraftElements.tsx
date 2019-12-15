import React, { useCallback } from "react";

import {
  MANA,
  OVERLAY_DRAFT,
  OVERLAY_DRAFT_BREW,
  PACK_SIZES
} from "../shared/constants";
import Deck from "../shared/deck";

import { DraftData, DraftState, OverlaySettingsData } from "./overlayUtil";
import DeckList from "./DeckList";
import { DbCardData } from "../shared/types/Metadata";

const packSizeMap: { [key: string]: number } = PACK_SIZES;
const manaColorMap: { [key: number]: string } = MANA;

export interface DraftElementsProps {
  draft: DraftData;
  draftState: DraftState;
  index: number;
  settings: OverlaySettingsData;
  setDraftStateCallback: (state: DraftState) => void;
  setHoverCardCallback: (card?: DbCardData) => void;
  tileStyle: number;
}

/**
 * This is a display component that renders most of the contents of an overlay
 * window set in one of the draft-related modes.
 */
export default function DraftElements(props: DraftElementsProps): JSX.Element {
  const {
    draft,
    draftState,
    index,
    setDraftStateCallback,
    setHoverCardCallback,
    settings,
    tileStyle
  } = props;
  const packSize = packSizeMap[draft.set] || 14;

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
    setDraftStateCallback({ packN, pickN });
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
    setDraftStateCallback({ packN, pickN });
  }, [draftState, draft]);

  const { packN, pickN } = draftState;
  const isCurrent = packN === draft.packNumber && pickN === draft.pickNumber;
  let visibleDeck = null;
  let cardsCount = 0;
  let mainTitle = "Overlay " + (index + 1);
  let subTitle = "";
  let pack = [];
  let pick = "";
  let pickName = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
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
    cardsCount = visibleDeck.getMainboard().count();
    mainTitle = visibleDeck.getName();
    subTitle = "Cards Left: " + cardsCount + " cards";
  } else if (settings.mode === OVERLAY_DRAFT_BREW) {
    visibleDeck = new Deck({ name: "All Picks" }, draft.pickedCards);
    cardsCount = visibleDeck.getMainboard().count();
    mainTitle = visibleDeck.getName();
    subTitle = "Total Picks: " + cardsCount + " cards";
  }

  return (
    <div
      className="outer_wrapper elements_wrapper"
      style={{ opacity: settings.alpha.toString() }}
    >
      {!!settings.title && (
        <div className="overlay_deckname">
          {mainTitle}
          {settings.mode === OVERLAY_DRAFT && (
            <div
              className="overlay_draft_container"
              style={settings.top ? { top: "32px" } : undefined}
            >
              <div className="draft_prev click-on" onClick={handleDraftPrev} />
              <div className="draft_title" />
              <div className="draft_next click-on" onClick={handleDraftNext} />
            </div>
          )}
        </div>
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
      {!!visibleDeck && (
        <DeckList
          deck={visibleDeck}
          subTitle={subTitle}
          highlightCardId={pick}
          setHoverCardCallback={setHoverCardCallback}
          settings={settings}
          tileStyle={tileStyle}
        />
      )}
    </div>
  );
}
