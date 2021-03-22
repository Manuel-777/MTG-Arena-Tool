import React, { useRef, useState } from "react";
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
} from "mtgatool-shared";

import css from "./index.css";
import sharedCss from "../shared/shared.css";
import ResizeIcon from "../assets/images/resize.svg";
import CloseIcon from "../assets/images/svg/win-close.svg";
import SettingsIcon from "../assets/images/svg/icon-settings.svg";
import CollapseIcon from "../assets/images/svg/collapse.svg";
import ExpandIcon from "../assets/images/svg/expand.svg";
import DEFAULT_BACKGROUND from "../assets/images/main-background.jpg";
import { animated, useSpring } from "react-spring";

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
  handleClickClose: () => void;
  handleClickSettings: () => void;
  handleToggleCollapse: () => void;
  handleToggleEditMode: () => void;
  index: number;
  match?: MatchData;
  settings: SettingsDataApp;
  setDraftStateCallback: (state: DraftState) => void;
  setOddsCallback: (sampleSize: number) => void;
  turnPriority: number;
}

function isOverlayDraftMode(mode: number): boolean {
  return OVERLAY_DRAFT_MODES.some((draftMode) => draftMode === mode);
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
    handleToggleCollapse,
    handleToggleEditMode,
    index,
    match,
    setDraftStateCallback,
    setOddsCallback,
    settings,
    turnPriority,
  } = props;

  const clickPos = useRef<[number, number]>([0, 0]);

  const containerRef = useRef<HTMLDivElement>(null);
  const collapsedRef = useRef<HTMLDivElement>(null);
  useEditModeOnRef(
    editMode,
    containerRef,
    collapsedRef,
    settings.overlay_scale
  );

  const [collapsed, setCollapsed] = useState(
    settings.overlays[index].collapsed
  );

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

  let elements = <></>;
  const commonProps = {
    index,
    settings: overlaySettings,
  };

  if (draft && isOverlayDraftMode(overlaySettings.mode)) {
    const props = {
      ...commonProps,
      draft,
      draftState,
      setDraftStateCallback,
    };
    elements = <DraftElements {...props} />;
  } else if (match) {
    const props = {
      ...commonProps,
      actionLog,
      match,
      setOddsCallback,
      turnPriority,
    };
    elements = <MatchElements {...props} />;
  } else {
    elements = (
      <div
        className={`${css.outerWrapper} elements_wrapper`}
        style={{ opacity: overlaySettings.alpha.toString() }}
      >
        {!!overlaySettings.title && !collapsed && (
          <div className={css.overlayDeckname}>Overlay {index + 1}</div>
        )}
      </div>
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

  const collapsedStyle = useSpring({
    transform: `scale(${collapsed ? 0 : 1})`,
    borderRadius: collapsed ? "20px" : "4px",
    config: {
      mass: 0.6,
      tension: 177,
      friction: 16,
    },
  });

  const collapsedButtonStyle = useSpring({
    transform: `scale(${collapsed ? 1 : 0})`,
  });

  const borderAlpha = Math.pow(overlaySettings.alpha_back, 2).toString();

  return (
    <div>
      <animated.div
        className={`${css.overlayContainer} ${getEditModeClass(editMode)}`}
        id={"overlay_" + (index + 1)}
        ref={containerRef}
        style={{
          border: "1px solid rgba(128, 128, 128, " + borderAlpha + ")",
          opacity: isVisible ? "1" : "0",
          visibility: isVisible ? "visible" : "hidden",
          height: overlaySettings.bounds.height + "px",
          width: overlaySettings.bounds.width + "px",
          left: overlaySettings.bounds.x + "px",
          top: overlaySettings.bounds.y + "px",
          ...(collapsedStyle as any),
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
            <ResizeIcon
              fill={`var(--color-${COLORS_ALL[index]})`}
              className={`${sharedCss.button} ${css.overlayIcon} ${css.clickOn}`}
              onClick={handleToggleEditMode}
              style={{
                marginRight: "auto",
              }}
            />
            {!props.editMode && (
              <div
                className={`${sharedCss.button} ${sharedCss.close} ${css.clickOn}`}
                onClick={(): void => {
                  handleToggleCollapse();
                  setCollapsed(!collapsed);
                }}
                style={{ margin: 0 }}
              >
                {!collapsed && (
                  <CollapseIcon style={{ margin: "auto" }} />
                )}
              </div>
            )}
            <div
              className={`${sharedCss.button} ${sharedCss.settings} ${css.clickOn}`}
              onClick={handleClickSettings}
              style={{ margin: 0 }}
            >
              <SettingsIcon
                fill="var(--color-icon)"
                style={{ margin: "auto" }}
              />
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
        {elements}
      </animated.div>
      <animated.div
        ref={collapsedRef}
        className={`${process.platform == "linux" ? css.overlayCollapsedLinux : css.overlayCollapsed} ${css.clickOn}`}
        id={"overlay_" + (index + 1)}
        style={{
          opacity: isVisible ? "1" : "0",
          visibility: isVisible ? "visible" : "hidden",
          left: overlaySettings.bounds.x + "px",
          top: overlaySettings.bounds.y + "px",
          ...(collapsedButtonStyle as any),
        }}
        onMouseDown={(e): void => {
          clickPos.current = [e.clientX, e.clientY];
        }}
        onMouseUp={(e): void => {
          if (
            Math.abs(e.clientX - clickPos.current[0]) < 5 &&
            Math.abs(e.clientY - clickPos.current[1]) < 5
          ) {
            handleToggleCollapse();
            setCollapsed(false);
          }
        }}
      >
        <div
          className={`${process.platform == "linux" ? css.overlayCollapsedButtonLinux : css.overlayCollapsedButton} ${css.clickOn}`}
          style={{
            backgroundColor: `var(--color-${COLORS_ALL[index]})`,
          }}
        >
          <ExpandIcon
            fill="black"
            style={{ width: "12px", height: "12px", margin: "auto" }}
          />
        </div>
      </animated.div>
    </div>
  );
}
