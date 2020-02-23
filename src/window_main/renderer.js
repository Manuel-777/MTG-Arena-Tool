import { ipcRenderer as ipc, remote, shell } from "electron";
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

import anime from "animejs";
import "@github/time-elements";

import { EASING_DEFAULT } from "../shared/constants";

import { createDiv, queryElements as $$ } from "../shared/dom-fns";

import {
  compare_cards,
  get_deck_colors,
  removeDuplicates
} from "../shared/util";

import { hideLoadingBars, openDialog, renderLogInput } from "./renderer-util";

import { openDeck } from "./deck-details";
import { setExploreDecks } from "./explore";

import RenderApp from "./app/App";

RenderApp();

const byId = id => document.getElementById(id);
const loggedIn = false;

ipc.on("set_explore_decks", function(event, arg) {
  setExploreDecks(arg);
});

ipc.on("open_course_deck", function(event, arg) {
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
  arg = arg.CourseDeck;
  arg.colors = get_deck_colors(arg);
  arg.mainDeck.sort(compare_cards);
  arg.sideboard.sort(compare_cards);
  // console.log(arg);

  arg.mainDeck = removeDuplicates(arg.mainDeck);
  arg.sideboard = removeDuplicates(arg.sideboard);
  openDeck(arg, null);
  hideLoadingBars();
});

let logDialogOpen = false;
ipc.on("no_log", function(event, arg) {
  if (loggedIn) {
    $$(".top_nav")[0].classList.add("hidden");
    $$(".overflow_ux")[0].classList.add("hidden");
    $$(".message_center")[0].style.display = "flex";
    $$(".message_center")[0].innerHTML =
      '<div class="message_big red">No Log Found</div><div class="message_sub_16 white">check if it exists at ' +
      arg +
      '</div><div class="message_sub_16 white">if it does, try closing MTG Arena and deleting it.</div>';
  } else if (!logDialogOpen) {
    logDialogOpen = true;
    const cont = createDiv(["dialog_content"]);
    cont.style.width = "650px";
    renderLogInput(cont);
    openDialog(cont, () => (logDialogOpen = false));
  }
});

ipc.on("set_draft_link", function(event, arg) {
  hideLoadingBars();
  byId("share_input").value = arg;
});

ipc.on("set_log_link", function(event, arg) {
  hideLoadingBars();
  byId("share_input").value = arg;
});

ipc.on("set_deck_link", function(event, arg) {
  hideLoadingBars();
  byId("share_input").value = arg;
});
