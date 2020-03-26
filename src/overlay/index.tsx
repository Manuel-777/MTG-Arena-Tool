import { remote } from "electron";
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import OverlayController from "../overlay/OverlayController";
import TransparencyFix from "./electron-transparency-mouse-fix";

import store from "../shared-redux/stores/overlayStore";
import { initializeRendererReduxIPC } from "../shared-redux/sharedRedux";

initializeRendererReduxIPC(store);

if (!remote.app.isPackaged) {
  const { openNewGitHubIssue, debugInfo } = require("electron-util");
  const unhandled = require("electron-unhandled");
  unhandled({
    showDialog: true,
    reportButton: (error: any) => {
      openNewGitHubIssue({
        user: "Manuel-777",
        repo: "MTG-Arena-Tool",
        body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
      });
    }
  });
  const Sentry = require("@sentry/electron");
  Sentry.init({
    dsn: "https://4ec87bda1b064120a878eada5fc0b10f@sentry.io/1778171"
  });
}

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

ready(function() {
  const wrap = document.createElement("div");
  ReactDOM.render(
    <Provider store={store}>
      <OverlayController />
    </Provider>,
    wrap
  );
  document.body.appendChild(wrap);
  setTimeout(() => {
    new TransparencyFix({
      log: false,
      fixPointerEvents: "auto"
    });
  }, 1000);
});
