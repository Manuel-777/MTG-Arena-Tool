import React from "react";

interface LoadingBarProps {
  style?: React.CSSProperties;
}

export default function LoadingBar({ style }: LoadingBarProps): JSX.Element {
  return (
    <>
      <div style={{ ...style }} className="loading_bar_main main_loading">
        <div className="loading_color loading_w"></div>
        <div className="loading_color loading_u"></div>
        <div className="loading_color loading_b"></div>
        <div className="loading_color loading_r"></div>
        <div className="loading_color loading_g"></div>
      </div>
    </>
  );
}
