import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { CSSTransition } from "react-transition-group";
import { ARENA_MODE_DRAFT } from "../shared/constants";
import db from "../shared/database";
import DraftRatings from "../shared/DraftRatings";
import { getCardImage } from "../shared/util";
import { Chances } from "../types/Chances";
import { SettingsData } from "../types/settings";
import { AppState } from "../shared/redux/reducers";
import { getEditModeClass, useEditModeOnRef } from "./overlayUtil";

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
    handleToggleEditMode,
    editMode,
    odds,
    overlayHover,
    overlayScale,
    settings
  } = props;
  const grpId = useSelector((state: AppState) => state.hover.grpId);
  const opacity = useSelector((state: AppState) => state.hover.opacity);
  const cardsSizeHoverCard = useSelector((state: AppState) => state.hover.size);
  const card = db.card(grpId);

  // TODO remove group lands hack
  const isCardGroupedLands = card?.id === 100 && odds;
  // TODO support split cards
  const imgProps = {
    alt: card?.name ?? "",
    className: "main_hover",
    src: getCardImage(card),
    style: {
      width: cardsSizeHoverCard + "px",
      height: cardsSizeHoverCard / SCALAR + "px",
      opacity
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
