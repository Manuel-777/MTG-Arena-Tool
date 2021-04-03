import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { CSSTransition } from "react-transition-group";
import db from "../shared/database-wrapper";
import { DraftRatings, DraftRatingsLola } from "./DraftRatings";
import { getCardImage } from "../shared/utils/getCardArtCrop";
import { SettingsDataApp } from "../types/settings";
import { AppState } from "../shared/redux/stores/rendererStore";
import { getEditModeClass, useEditModeOnRef } from "./overlayUtil";
import { constants, Chances } from "mtgatool-shared";

import notFound from "../assets/images/notfound.png";
import sharedCss from "../shared/shared.css";
import css from "./index.css";

const { ARENA_MODE_DRAFT, LANDS_HACK } = constants;

const manaClasses: Record<string, string> = {
  w: sharedCss.manaW,
  u: sharedCss.manaU,
  b: sharedCss.manaB,
  r: sharedCss.manaR,
  g: sharedCss.manaG,
};

function GroupedLandsDetails(props: { odds: Chances }): JSX.Element {
  const { landW, landU, landB, landR, landG } = props.odds;
  const hoverCardSize = useSelector(
    (state: AppState) => state.settings.cards_size_hover_card
  );

  const manaChanceDiv = function (value: number, color: string): JSX.Element {
    return (
      <div className={css.manaCont}>
        {value + "%"}
        <div
          className={`${sharedCss.manaS16} ${css.flexEnd} ${manaClasses[color]}`}
        />
      </div>
    );
  };
  return (
    <div
      style={{ width: 100 - 34 + hoverCardSize * 15 + "px" }}
      className={css.landsDiv}
    >
      {!!landW && manaChanceDiv(landW, "w")}
      {!!landU && manaChanceDiv(landU, "u")}
      {!!landB && manaChanceDiv(landB, "b")}
      {!!landR && manaChanceDiv(landR, "r")}
      {!!landG && manaChanceDiv(landG, "g")}
    </div>
  );
}

// This is the ratio of width/height of a magic card
const SCALAR = 0.71808510638;

interface CardDetailsWindowletProps {
  arenaState: number;
  editMode: boolean;
  handleToggleEditMode: () => void;
  odds?: Chances;
  overlayHover: { x: number; y: number };
  overlayScale: number;
  settings: SettingsDataApp;
}

/**
 * This is a display component that renders details about the specified card,
 * currently only used to show the user more info about the card they hover
 * over with the mouse. For state and control logic related to hover selection,
 * see OverlayController. (Originally adapted from legacy card-hover.js module)
 */
export default function CardDetailsWindowlet(
  props: CardDetailsWindowletProps
): JSX.Element {
  const {
    arenaState,
    handleToggleEditMode,
    editMode,
    odds,
    overlayHover,
    overlayScale,
    settings,
  } = props;
  const grpId = useSelector((state: AppState) => state.hover.grpId);
  const opacity = useSelector((state: AppState) => state.hover.opacity);
  const cardsSizeHoverCard = useSelector(
    (state: AppState) => state.settings.cards_size_hover_card
  );
  const cardQuality = useSelector(
    (state: AppState) => state.settings.cards_quality
  );
  const size = 100 + cardsSizeHoverCard * 15;
  const card = db.card(grpId);

  // TODO remove group lands hack
  const isCardGroupedLands = grpId === LANDS_HACK && odds;
  // TODO support split cards
  const imgProps = {
    alt: card?.name ?? "",
    className: css.mainHover,
    src: editMode ? notFound : getCardImage(card, cardQuality),
    style: {
      width: size + "px",
      height: size / SCALAR + "px",
      opacity: editMode ? 1 : opacity,
    },
  };
  const containerRef = useRef(null);
  useEditModeOnRef(editMode, containerRef, containerRef, overlayScale);

  return (
    <div
      className={css.overlayHoverContainer + " " + getEditModeClass(editMode)}
      id={css.overlayHover}
      ref={containerRef}
      style={{
        opacity: editMode ? "1" : undefined,
        left: overlayHover
          ? `${overlayHover.x}px`
          : `${window.innerWidth / 2 - size / 2}px`,
        top: overlayHover
          ? `${overlayHover.y}px`
          : `${window.innerHeight - size / SCALAR - 50}px`,
      }}
    >
      {editMode ? (
        <div
          onDoubleClick={handleToggleEditMode}
          title={`${settings.shortcut_editmode} or double click me
to stop editing overlay positions`}
        >
          <img {...imgProps} />
        </div>
      ) : (
        <CSSTransition
          classNames={"hover_fade"}
          in={
            !!card ||
            (isCardGroupedLands && grpId === LANDS_HACK && opacity > 0)
          }
          timeout={200}
          unmountOnExit
        >
          <div style={{ display: "flex" }}>
            {!!card && !isCardGroupedLands && <img {...imgProps} />}
            {!!card && arenaState === ARENA_MODE_DRAFT && opacity > 0 && (
              <div className={css.mainHoverRatings}>
                {card.source == 0 ? (
                  <DraftRatings card={card} />
                ) : (
                  <DraftRatingsLola card={card} />
                )}
              </div>
            )}
            {isCardGroupedLands && odds ? (
              <GroupedLandsDetails odds={odds} />
            ) : (
              <></>
            )}
          </div>
        </CSSTransition>
      )}
    </div>
  );
}
