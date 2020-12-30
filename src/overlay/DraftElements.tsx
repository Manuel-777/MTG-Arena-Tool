import React, { useCallback } from "react";
import {
  constants,
  Deck,
  InternalDraftv2,
  DraftState,
  OverlaySettingsData,
} from "mtgatool-shared";

import DeckList from "./DeckList";

import css from "./index.css";
import ManaCost from "../renderer/components/misc/ManaCost";

const {
  OVERLAY_DRAFT,
  OVERLAY_DRAFT_BREW,
  PACK_SIZES,
  DEFAULT_PACK_SIZE,
} = constants;

const packSizeMap: { [key: string]: number } = PACK_SIZES;

interface DraftElementsProps {
  draft: InternalDraftv2;
  draftState: DraftState;
  index: number;
  settings: OverlaySettingsData;
  setDraftStateCallback: (state: DraftState) => void;
}

/**
 * This is a display component that renders most of the contents of an overlay
 * window set in one of the draft-related modes.
 */
export default function DraftElements(props: DraftElementsProps): JSX.Element {
  const { draft, draftState, index, setDraftStateCallback, settings } = props;
  const packSize = packSizeMap[draft.draftSet] || DEFAULT_PACK_SIZE;

  const handleDraftPrev = useCallback((): void => {
    let { packN, pickN } = draftState;
    pickN -= 1;
    if (pickN < 0) {
      pickN = packSize;
      packN -= 1;
    }
    if (packN < 0) {
      pickN = draft.currentPick;
      packN = draft.currentPack;
    }
    setDraftStateCallback({ packN, pickN });
  }, [draftState, draft, packSize, setDraftStateCallback]);

  const handleDraftNext = useCallback((): void => {
    let { packN, pickN } = draftState;
    pickN += 1;
    if (pickN > packSize) {
      pickN = 0;
      packN += 1;
    }
    if (pickN > draft.currentPick && packN == draft.currentPack) {
      pickN = 0;
      packN = 0;
    }
    if (
      packN > draft.currentPack ||
      (pickN == draft.currentPick && packN == draft.currentPack)
    ) {
      packN = draft.currentPack;
      pickN = draft.currentPick;
    }
    setDraftStateCallback({ packN, pickN });
  }, [draftState, draft, packSize, setDraftStateCallback]);

  const { packN, pickN } = draftState;
  const isCurrent = packN === draft.currentPack && pickN === draft.currentPick;
  let visibleDeck = null;
  let cardsCount = 0;
  let mainTitle = "Overlay " + (index + 1);
  let subTitle = "";
  let pack: number[] = [];
  let pick = 0;
  let pickName = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
  if (isCurrent) {
    pickName += " - Current";
  }

  pack = draft.packs[packN][pickN];
  pick = draft.picks[packN][pickN];
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
      className={`${css.outerWrapper} elements_wrapper`}
      style={{ opacity: settings.alpha.toString() }}
    >
      {!!settings.title && (
        <div className={css.overlayDeckname}>
          {!settings.collapsed && mainTitle}
          {settings.mode === OVERLAY_DRAFT && (
            <div
              className={css.overlayDraftContainer}
              style={settings.top ? { top: "32px" } : undefined}
            >
              <div
                className={`${css.draftPrev} ${css.clickOn}`}
                onClick={handleDraftPrev}
              />
              <div className={css.draftTitle} />
              <div
                className={`${css.draftNext} ${css.clickOn}`}
                onClick={handleDraftNext}
              />
            </div>
          )}
        </div>
      )}
      {!!settings.title && !!visibleDeck && (
        <div className={css.overlayDeckcolors}>
          <ManaCost colors={visibleDeck.colors.get()} />
        </div>
      )}
      {!!visibleDeck && (
        <DeckList
          deck={visibleDeck}
          subTitle={subTitle}
          highlightCardId={pick}
          settings={settings}
        />
      )}
    </div>
  );
}
