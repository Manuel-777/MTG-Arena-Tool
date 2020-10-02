import React, { CSSProperties, useState } from "react";
import { ipcSend } from "../../ipcSend";

import css from "./TopBar.css";
import mainCss from "./main.css";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared/redux/stores/rendererStore";

import MacMinimize from "../../../assets/images/svg/mac-minimize.svg";
import MacMaximize from "../../../assets/images/svg/mac-maximize.svg";
import MacClose from "../../../assets/images/svg/mac-close.svg";

import WinMinimize from "../../../assets/images/svg/win-minimize.svg";
import WinMaximize from "../../../assets/images/svg/win-maximize.svg";
import WinClose from "../../../assets/images/svg/win-close.svg";

import Logo from "../../../assets/images/svg/logo.svg";
import Flex from "../misc/Flex";

import { constants } from "mtgatool-shared";
const { LOGIN_OK } = constants;

interface TopBarProps {
  artist: string;
  offline: boolean;
}

function clickMinimize(): void {
  ipcSend("renderer_window_minimize", 1);
}

function clickMaximize(): void {
  ipcSend("renderer_window_maximize", 1);
}

function clickClose(): void {
  ipcSend("renderer_window_close", 1);
}

export default function TopBar(props: TopBarProps): JSX.Element {
  const loginState = useSelector((state: AppState) => state.login.loginState);
  const [hoverControls, setHoverControls] = useState(false);

  const os = process.platform;

  const topButtonClass = os == "darwin" ? css.topButtonMac : css.topButton;

  const topButtonsContainerClass =
    os == "darwin" ? css.topButtonsContainerMac : css.topButtonsContainer;

  const isReverse = os == "darwin";

  const MinimizeSVG = os == "darwin" ? MacMinimize : WinMinimize;
  const MaximizeSVG = os == "darwin" ? MacMaximize : WinMaximize;
  const CloseSVG = os == "darwin" ? MacClose : WinClose;

  // Define components for simple ordering later
  const iconStyle: CSSProperties = {
    fill: os == "darwin" ? (hoverControls ? "#000000bf" : "#00000000") : "",
    margin: "auto",
  };

  const minimize = (
    <div
      onClick={clickMinimize}
      key="top-minimize"
      className={`${css.minimize} ${topButtonClass}`}
    >
      <MinimizeSVG style={iconStyle} />
    </div>
  );

  const maximize = (
    <div
      onClick={clickMaximize}
      key="top-maximize"
      className={`${css.maximize} ${topButtonClass}`}
    >
      <MaximizeSVG style={iconStyle} />
    </div>
  );

  const close = (
    <div
      onClick={clickClose}
      key="top-close"
      className={`${css.close} ${topButtonClass}`}
    >
      <CloseSVG style={iconStyle} />
    </div>
  );

  const offline = (
    <div className={mainCss.unlink} title="You are not logged-in." />
  );

  return (
    <div
      className={css.top}
      style={{ flexDirection: isReverse ? "row-reverse" : "row" }}
    >
      <Flex
        style={{
          margin: isReverse ? "auto" : "",
          flexDirection: isReverse ? "row-reverse" : "row",
        }}
      >
        <Logo fill={"#FFF"} style={{ margin: "2px 8px", opacity: 0.6 }} />
        {loginState !== LOGIN_OK ? (
          <div className={css.topArtist}>{props.artist}</div>
        ) : (
          <></>
        )}
        {props.offline && isReverse && offline}
      </Flex>
      <div
        onMouseEnter={(): void => setHoverControls(true)}
        onMouseLeave={(): void => setHoverControls(false)}
        className={topButtonsContainerClass}
      >
        {props.offline && !isReverse && offline}
        {os == "darwin"
          ? [close, minimize, maximize]
          : [minimize, maximize, close]}
      </div>
    </div>
  );
}
