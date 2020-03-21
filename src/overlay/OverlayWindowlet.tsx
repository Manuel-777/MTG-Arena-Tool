import React, { useRef } from "react";
import {
  ARENA_MODE_DRAFT,
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  COLORS_ALL,
  OVERLAY_DRAFT_MODES
} from "../shared/constants";
import { MatchData } from "../types/currentMatch";
import { DraftData, DraftState } from "../types/draft";
import { InternalActionLog } from "../types/log";
import { SettingsData } from "../types/settings";
import DraftElements from "./DraftElements";
import MatchElements from "./MatchElements";
import { getEditModeClass, useEditModeOnRef } from "./overlayUtil";

const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";

export interface OverlayWindowletProps {
  arenaState: number;
  actionLog: InternalActionLog[];
  draft?: DraftData;
  draftState: DraftState;
  editMode: boolean;
  handleClickClose: () => void;
  handleClickSettings: () => void;
  handleToggleEditMode: () => void;
  index: number;
  match?: MatchData;
  settings: SettingsData;
  setDraftStateCallback: (state: DraftState) => void;
  setOddsCallback: (sampleSize: number) => void;
  turnPriority: number;
}

function isOverlayDraftMode(mode: number): boolean {
  return OVERLAY_DRAFT_MODES.some(draftMode => draftMode === mode);
}

/**
 * This is a display component that renders one of the numbered overlay
 * window widgets. This only renders the outer chrome display and delegates
 * most of the contents to either DraftElements or MatchElements depending
 * on the selected overlay settings.
 */
export default function OverlayWindowlet(
  props: OverlayWindowletProps
): JSX.Element {
  const {
    actionLog,
    arenaState,
    draft,
    draftState,
    editMode,
    handleClickClose,
    handleClickSettings,
    handleToggleEditMode,
    index,
    match,
    setDraftStateCallback,
    setOddsCallback,
    settings,
    turnPriority
  } = props;

  const containerRef = useRef(null);
  useEditModeOnRef(editMode, containerRef, settings.overlay_scale);

  // useEffect(() => {
  //   const xhr = new XMLHttpRequest();
  //   xhr.open("HEAD", arg);
  //   xhr.onload = function() {
  //     if (xhr.status === 200) {
  //       mainWrapper.style.backgroundImage = backgroundImage;
  //     } else {
  //       mainWrapper.style.backgroundImage = "";
  //     }
  //   };
  //   xhr.send();
  // }, [backgroundImage]);
  const overlaySettings = settings.overlays[index];
  // Note: ensure this logic matches the logic in main.getOverlayVisible
  // TODO: extract a common utility?
  const currentModeApplies =
    (isOverlayDraftMode(overlaySettings.mode) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!isOverlayDraftMode(overlaySettings.mode) &&
      arenaState === ARENA_MODE_MATCH) ||
    (editMode && arenaState === ARENA_MODE_IDLE);
  const isVisible =
    overlaySettings.show && (currentModeApplies || overlaySettings.show_always);
  const tileStyle = parseInt(settings.card_tile_style + "");
  let elements = <></>;
  const commonProps = {
    index,
    settings: overlaySettings,
    tileStyle
  };
  if (draft && isOverlayDraftMode(overlaySettings.mode)) {
    const props = {
      ...commonProps,
      draft,
      draftState,
      setDraftStateCallback
    };
    elements = <DraftElements {...props} />;
  } else if (match) {
    const props = {
      ...commonProps,
      actionLog,
      match,
      setOddsCallback,
      turnPriority
    };
    elements = <MatchElements {...props} />;
  } else {
    elements = (
      <div
        className="outer_wrapper elements_wrapper"
        style={{ opacity: overlaySettings.alpha.toString() }}
      >
        {!!overlaySettings.title && (
          <div className="overlay_deckname">Overlay {index + 1}</div>
        )}
      </div>
    );
  }

  const backgroundImage =
    "url(" +
    (settings.back_url && settings.back_url !== "default"
      ? settings.back_url
      : DEFAULT_BACKGROUND) +
    ")";

  const backgroundColor = settings.overlay_back_color;

  const bgStyle: React.CSSProperties = {
    left: "0px",
    right: "0px",
    opacity: overlaySettings.alpha_back.toString()
  };

  // This needs its own setting, like a checkbox or something
  const solidBg: boolean =
    backgroundColor !== "rgba(0,0,0,0)" && backgroundColor !== "transparent";
  if (!solidBg) {
    bgStyle.backgroundImage = backgroundImage;
  } else {
    bgStyle.backgroundColor = backgroundColor;
  }

  const borderAlpha = (overlaySettings.alpha_back * 1.5).toString();
  return (
    <div
      className={"overlay_container " + getEditModeClass(editMode)}
      id={"overlay_" + (index + 1)}
      ref={containerRef}
      style={{
        border: "1px solid rgba(128, 128, 128, " + borderAlpha + ")",
        opacity: isVisible ? "1" : "0",
        visibility: isVisible ? "visible" : "hidden",
        height: overlaySettings.bounds.height + "px",
        width: overlaySettings.bounds.width + "px",
        left: overlaySettings.bounds.x + "px",
        top: overlaySettings.bounds.y + "px"
      }}
    >
      <div className="outer_wrapper">
        <div
          className={
            "overlay_wrapper overlay_bg_image " +
            (solidBg ? "after_hidden" : "")
          }
          style={bgStyle}
        />
      </div>
      {overlaySettings.top && (
        <div className="outer_wrapper top_nav_wrapper">
          <div
            className="button overlay_icon click-on"
            onClick={handleToggleEditMode}
            style={{
              backgroundColor: `var(--color-${COLORS_ALL[index]})`,
              marginRight: "auto"
            }}
            title={settings.shortcut_editmode}
          />
          <div
            className="button settings click-on"
            onClick={handleClickSettings}
            style={{ margin: 0 }}
          />
          <div
            className="button close click-on"
            onClick={handleClickClose}
            style={{ marginRight: "4px" }}
          />
        </div>
      )}
      {elements}
    </div>
  );
}
