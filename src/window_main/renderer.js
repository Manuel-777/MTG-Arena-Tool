import { ipcRenderer as ipc, remote } from "electron";
if (!remote.app.isPackaged) {
  const { openNewGitHubIssue, debugInfo } = require("electron-util");
  const unhandled = require("electron-unhandled");
  unhandled({
    showDialog: true,
    reportButton: error => {
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
import "@github/time-elements";

import RenderApp from "./app/App";
import { openDialog, renderLogInput } from "./renderer-util";
import { createDiv } from "../shared/dom-fns";

RenderApp();

const byId = id => document.getElementById(id);

let logDialogOpen = false;
ipc.on("no_log", function(event, arg) {
  if (!logDialogOpen) {
    logDialogOpen = true;
    const cont = createDiv(["dialog_content"]);
    cont.style.width = "650px";
    renderLogInput(cont);
    openDialog(cont, () => (logDialogOpen = false));
  }
});

ipc.on("set_draft_link", function(event, arg) {
  byId("share_input").value = arg;
});

ipc.on("set_log_link", function(event, arg) {
  byId("share_input").value = arg;
});

ipc.on("set_deck_link", function(event, arg) {
  byId("share_input").value = arg;
});
