import React from "react";
import { AppState } from "../../app/appState";
import { useSelector } from "react-redux";

export default function BackgroundImage(): JSX.Element {
  const backgroundImage = useSelector(
    (state: AppState) => state.backgroundImage
  );

  return (
    <div
      className="main_wrapper main_bg_image"
      style={{ backgroundImage: backgroundImage }}
    ></div>
  );
}
