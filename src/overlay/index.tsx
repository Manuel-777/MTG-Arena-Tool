import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import OverlayController from "./OverlayController";

import store from "../shared/redux/stores/overlayStore";
import initializeRendererReduxIPC from "../shared/redux/initializeRendererReduxIPC";
import reloadTheme from "../shared/utils/reloadTheme";

initializeRendererReduxIPC(store);

function ready(fn: () => void): void {
  const theDocument = document as any;
  if (
    theDocument.attachEvent
      ? document.readyState === "complete"
      : document.readyState !== "loading"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

ready(function () {
  reloadTheme();
  ReactDOM.render(
    <Provider store={store}>
      <OverlayController />
    </Provider>,
    document.getElementById("container")
  );
});
