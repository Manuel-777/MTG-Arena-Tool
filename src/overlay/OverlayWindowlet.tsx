import React, { useRef } from "react";
import { SettingsDataApp } from "../types/settings";
import DraftElements from "./DraftElements";
import MatchElements from "./MatchElements";
import { getEditModeClass, useEditModeOnRef } from "./overlayUtil";
import { useSelector } from "react-redux";
import { AppState } from "../shared/redux/stores/overlayStore";
import {
  constants,
  MatchData,
  InternalDraftv2,
  DraftState,
  OverlaySettingsData,
} from "mtgatool-shared";

import css from "./index.css";
import sharedCss from "../shared/shared.css";
import ResizeIcon from "../assets/images/resize.svg";
import CloseIcon from "../assets/images/svg/win-close.svg";
import SettingsIcon from "../assets/images/svg/icon-settings.svg";
import MinimizeIcon from "../assets/images/svg/win-minimize.svg";
import DEFAULT_BACKGROUND from "../assets/images/main-background.jpg";

const {
  ARENA_MODE_DRAFT,
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  COLORS_ALL,
  OVERLAY_DRAFT_MODES,
} = constants;

interface OverlayWindowletProps {
  arenaState: number;
  actionLog: string;
  draft?: InternalDraftv2;
  draftState: DraftState;
  editMode: boolean;
  collapse: boolean;
  handleClickClose: () => void;
  handleClickSettings: () => void;
  handleToggleEditMode: () => void;
  handleToggleCollapse: () => void;
  index: number;
  match?: MatchData;
  settings: SettingsDataApp;
  setDraftStateCallback: (state: DraftState) => void;
  setOddsCallback: (sampleSize: number) => void;
  turnPriority: number;
}

function isOverlayDraftMode(mode: number): boolean {
  return OVERLAY_DRAFT_MODES.includes(mode);
}

function getOverlayApplies(mode: number, editMode: boolean, arenaState: number): boolean {
  switch (arenaState) {
    case ARENA_MODE_DRAFT:
      return isOverlayDraftMode(mode);
    case ARENA_MODE_MATCH:
      return !isOverlayDraftMode(mode);
    case ARENA_MODE_IDLE:
      return editMode;
  }
  return false;
}

function getOverlayVisible(settings: OverlaySettingsData, editMode: boolean, arenaState: number): boolean {
  if (!settings) return false;

  return settings.show && (settings.show_always || getOverlayApplies(settings.mode, editMode, arenaState));
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
    collapse,
    handleClickClose,
    handleClickSettings,
    handleToggleEditMode,
    handleToggleCollapse,
    index,
    match,
    setDraftStateCallback,
    setOddsCallback,
    settings,
    turnPriority,
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
  const isVisible = getOverlayVisible(overlaySettings, editMode, arenaState);

  let elements: JSX.Element;
  if (draft && isOverlayDraftMode(overlaySettings.mode)) {
    const props = {
      index,
      settings: overlaySettings,
      draft,
      draftState,
      setDraftStateCallback,
    };
    elements = <DraftElements {...props} />;
  } else if (match) {
    const props = {
      index,
      settings: overlaySettings,
      actionLog,
      match,
      setOddsCallback,
      turnPriority,
    };
    elements = <MatchElements {...props} />;
  } else {
    elements = (
      <>
        {!!overlaySettings.title && (
          <div className={css.overlayDeckname}>Overlay {index + 1}</div>
        )}
      </>
    );
  }

  const backgroundImage = `url(${
    settings.back_url && settings.back_url !== "default"
      ? settings.back_url
      : DEFAULT_BACKGROUND
  })`;

  const backgroundColor = settings.overlay_back_color;
  const backgroundShade = useSelector(
    (state: AppState) => state.settings.back_shadow
  );

  const bgStyle: React.CSSProperties = {
    left: "0px",
    right: "0px",
    opacity: overlaySettings.alpha_back.toString(),
  };

  // This needs its own setting, like a checkbox or something
  const solidBg: boolean =
    backgroundColor !== "rgba(0,0,0,0)" && backgroundColor !== "transparent";
  if (!solidBg) {
    bgStyle.backgroundImage = backgroundImage;
  } else {
    bgStyle.backgroundColor = backgroundColor;
  }

  const borderAlpha = Math.pow(overlaySettings.alpha_back, 2).toString();
  return (
    <div
      className={`${css.overlayContainer} ${getEditModeClass(editMode)}`}
      id={"overlay_" + (index + 1)}
      ref={containerRef}
      style={{
        border: "1px solid rgba(128, 128, 128, " + borderAlpha + ")",
        opacity: isVisible ? "1" : "0",
        visibility: isVisible ? "visible" : "hidden",
        height: (collapse && !editMode ? 32 : overlaySettings.bounds.height) + "px",
        width: overlaySettings.bounds.width + "px",
        left: overlaySettings.bounds.x + "px",
        top: overlaySettings.bounds.y + "px",
      }}
    >
      <div className={css.outerWrapper}>
        <div
          className={`${css.mainWrapper} ${solidBg ? css.afterHidden : ""}`}
          style={bgStyle}
        >
          {!solidBg && backgroundShade ? (
            <div className={sharedCss.wrapperAfter}></div>
          ) : (
            <></>
          )}
        </div>
      </div>
      {overlaySettings.top && (
        <div className={`${css.outerWrapper} ${css.topNavWrapper}`}>
          <div
            className={`${sharedCss.button} ${css.overlayIcon} ${css.clickOn}`}
            onClick={handleToggleEditMode}
            style={{ margin: 0, marginLeft: "4px" }}
          >
            <ResizeIcon fill={`var(--color-${COLORS_ALL[index]})`} style={{ marginRight: "auto" }}/>
          </div>
          <div
            className={`${sharedCss.button} ${sharedCss.settings} ${css.clickOn}`}
            onClick={handleClickSettings}
            style={{ marginRight: "auto" }}
          >
            <SettingsIcon fill="var(--color-icon)" style={{ margin: "auto" }} />
          </div>
          <div
            className={`${sharedCss.button} ${sharedCss.minimize} ${css.clickOn}`}
            onClick={handleToggleCollapse}
            style={{ margin: 0 }}
          >
            <MinimizeIcon fill="var(--color-icon)" style={{ margin: "auto" }} />
          </div>
          <div
            className={`${sharedCss.button} ${sharedCss.close} ${css.clickOn}`}
            onClick={handleClickClose}
            style={{ marginRight: "4px" }}
          >
            <CloseIcon style={{ margin: "auto" }} />
          </div>
        </div>
      )}

      <div
        className={`${css.outerWrapper} elements_wrapper`}
        style={{ opacity: overlaySettings.alpha.toString() }}
      >
        {elements}
      </div>
    </div>
  );
}
