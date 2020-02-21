import React from "react";

export default function LoadingBar(): JSX.Element {
  return (
    <>
      <div className="loading_bar_main main_loading">
        <div className="loading_color loading_w"></div>
        <div className="loading_color loading_u"></div>
        <div className="loading_color loading_b"></div>
        <div className="loading_color loading_r"></div>
        <div className="loading_color loading_g"></div>
      </div>
    </>
  );
}
