import React, { useRef } from "react";
import { CSSTransition } from "react-transition-group";

import { ARENA_MODE_DRAFT } from "../shared/constants";
import { getCardImage } from "../shared/util";
import DraftRatings from "../shared/DraftRatings";

import {
  getEditModeClass,
  useEditModeOnRef,
  SettingsData
} from "./overlayUtil";
import { DbCardData } from "../shared/types/Metadata";
import { Chances } from "../window_background/types/decks";

const NO_IMG_URL = "./images/nocard.png";

function GroupedLandsDetails(props: { odds: Chances }): JSX.Element {
  const { landW, landU, landB, landR, landG } = props.odds;
  const manaChanceDiv = function(value: number, color: string): JSX.Element {
    return (
      <div className="mana_cont">
        {value + "%"}
        <div className={"mana_s16 flex_end mana_" + color} />
      </div>
    );
  };
  return (
    <div className="lands_div">
      {!!landW && manaChanceDiv(landW, "w")}
      {!!landU && manaChanceDiv(landU, "u")}
      {!!landB && manaChanceDiv(landB, "b")}
      {!!landR && manaChanceDiv(landR, "r")}
      {!!landG && manaChanceDiv(landG, "g")}
    </div>
  );
}

const SCALAR = 0.71808510638; // ???

export interface CardDetailsWindowletProps {
  arenaState: number;
  card?: DbCardData;
  cardsSizeHoverCard: number;
  editMode: boolean;
  handleToggleEditMode: () => void;
  odds?: Chances;
  overlayHover: { x: number; y: number };
  overlayScale: number;
  settings: SettingsData;
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
    card,
    cardsSizeHoverCard,
    handleToggleEditMode,
    editMode,
    odds,
    overlayHover,
    overlayScale,
    settings
  } = props;

  // TODO remove group lands hack
  const isCardGroupedLands = card?.id === 100 && odds;
  // TODO support split cards
  let name = "";
  let images = {};
  if (card !== undefined) {
    name = card.name;
    images = card.images;
  }
  const imgProps = {
    alt: name,
    className: "main_hover",
    src: images ? getCardImage(card) : NO_IMG_URL,
    style: {
      width: cardsSizeHoverCard + "px",
      height: cardsSizeHoverCard / SCALAR + "px"
    }
  };
  const containerRef = useRef(null);
  useEditModeOnRef(editMode, containerRef, overlayScale);

  return (
    <div
      className={"overlay_hover_container " + getEditModeClass(editMode)}
      id={"overlay_hover"}
      ref={containerRef}
      style={{
        opacity: editMode ? "1" : undefined,
        left: overlayHover
          ? `${overlayHover.x}px`
          : `${window.innerWidth / 2 - cardsSizeHoverCard / 2}px`,
        top: overlayHover
          ? `${overlayHover.y}px`
          : `${window.innerHeight - cardsSizeHoverCard / SCALAR - 50}px`
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
          classNames="hover_fade"
          in={!!card}
          timeout={200}
          unmountOnExit
        >
          <div style={{ display: "flex" }}>
            {!!card && !isCardGroupedLands && <img {...imgProps} />}
            {!!card && arenaState === ARENA_MODE_DRAFT && (
              <div className="main_hover_ratings">
                <DraftRatings card={card} />
              </div>
            )}
            {isCardGroupedLands && odds && <GroupedLandsDetails odds={odds} />}
          </div>
        </CSSTransition>
      )}
    </div>
  );
}
