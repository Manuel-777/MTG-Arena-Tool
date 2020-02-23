import React from "react";
import { AppState } from "../../app/ContextProvider";

interface BackgroundImageProps {
  appContext: AppState;
}

export default function BackgroundImage(
  props: BackgroundImageProps
): JSX.Element {
  const { appContext } = props;
  return (
    <div
      className="main_wrapper main_bg_image"
      style={{ backgroundImage: appContext.backgroundImage }}
    ></div>
  );
}
