import React, { useRef } from "react";

import {
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  COLORS_ALL,
  OVERLAY_DRAFT_MODES
} from "../shared/constants";

import {
  getEditModeClass,
  useEditModeOnRef,
  DraftData,
  DraftState,
  LogData,
  MatchData,
  SettingsData
} from "./overlayUtil";
import DraftElements from "./DraftElements";
import MatchElements from "./MatchElements";

const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";

export interface OverlayWindowletProps {
  arenaState: number;
  actionLog: LogData[];
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
  setHoverCardCallback: (card: any) => void;
  setOddsCallback: (sampleSize: number) => void;
  turnPriority: number;
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
    setHoverCardCallback,
    setOddsCallback,
    settings,
    turnPriority
  } = props;

  const containerRef = useRef(null);
  useEditModeOnRef(editMode, containerRef, settings.overlay_scale);

  const backgroundImage =
    "url(" +
    (settings.back_url && settings.back_url !== "default"
      ? settings.back_url
      : DEFAULT_BACKGROUND) +
    ")";
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
  const currentModeApplies =
    (OVERLAY_DRAFT_MODES.includes(overlaySettings.mode) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!OVERLAY_DRAFT_MODES.includes(overlaySettings.mode) &&
      arenaState === ARENA_MODE_MATCH);
  const isVisible =
    overlaySettings.show && (currentModeApplies || overlaySettings.show_always);
  const tileStyle = parseInt(settings.card_tile_style + "");
  let elements = <></>;
  const commonProps = {
    index,
    settings: overlaySettings,
    setHoverCardCallback,
    tileStyle
  };
  if (draft && OVERLAY_DRAFT_MODES.includes(overlaySettings.mode)) {
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
  return (
    <div
      className={"overlay_container " + getEditModeClass(editMode)}
      id={"overlay_" + (index + 1)}
      ref={containerRef}
      style={{
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
          className="overlay_wrapper overlay_bg_image"
          style={{
            backgroundImage,
            opacity: overlaySettings.alpha_back.toString()
          }}
        />
      </div>
      {overlaySettings.top && (
        <div className="outer_wrapper top_nav_wrapper">
          <div
            className="flex_item overlay_icon click-on"
            onClick={handleToggleEditMode}
            style={{ backgroundColor: `var(--color-${COLORS_ALL[index]})` }}
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
