import { ipcRenderer as ipc, webFrame, remote } from "electron";
import React from "react";
import ReactDOM from "react-dom";
import interact from "interactjs";
import TransparencyMouseFix from "electron-transparency-mouse-fix";
import striptags from "striptags";

import pd from "../shared/player-data";
import Deck from "../shared/deck";
import { setRenderer } from "../shared/card-hover";
import { queryElements } from "../shared/dom-fns";
import {
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
  COLORS_ALL,
  IPC_BACKGROUND,
  IPC_OVERLAY,
  IPC_MAIN,
  OVERLAY_LOG,
  OVERLAY_DRAFT_MODES
} from "../shared/constants";

import Overlay from "../overlay/Overlay";

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

setRenderer(1);

const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";

let actionLog = [];
let arenaState = ARENA_MODE_IDLE;
let editMode = false;
let currentMatch = null;
let currentDraft;
let playerSeat = 0;
let turnPriority = 0;

const byId = id => document.getElementById(id);

function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

ipc.on("set_arena_state", function(event, arg) {
  arenaState = arg;

  // Change how cards hover are drawn if we are in a draft
  setRenderer(1);
  if (arenaState == ARENA_MODE_DRAFT) {
    setRenderer(2);
  }
  settingsUpdated();
});

ipc.on("edit", () => {
  toggleEditMode();
});

function recreateOverlay(index) {
  const elementsDiv = queryElements(
    `#overlay_${index + 1} .elements_wrapper`
  )[0];
  const setOddsCallback = sampleSize => {
    ipcSend("set_odds_samplesize", sampleSize);
  };
  const props = {
    actionLog,
    draft: currentDraft,
    index,
    match: currentMatch,
    playerSeat,
    settings: pd.settings.overlays[index],
    tileStyle: parseInt(pd.settings.card_tile_style),
    turnPriority,
    setOddsCallback
  };
  ReactDOM.render(<Overlay {...props} />, elementsDiv);
}

function toggleEditMode() {
  editMode = !editMode;

  let divsList = [];
  let mainHover = queryElements(".main_hover")[0];
  mainHover.style.opacity = "1";
  divsList.push(byId("overlay_hover"));
  pd.settings.overlays.forEach((_overlay, index) => {
    if (!getVisible(_overlay)) return;
    divsList.push(byId("overlay_" + (index + 1)));
  });

  if (editMode) {
    document.body.style.backgroundColor = "rgba(0, 0, 0, 0.3)";

    divsList.forEach(overlayDiv => {
      if (!overlayDiv.classList.contains("click-on"))
        overlayDiv.classList.add("click-on");
      overlayDiv.classList.remove("click-through");
      if (!overlayDiv.classList.contains("editable"))
        overlayDiv.classList.add("editable");

      const restrictToParent = interact.modifiers.restrictRect({
        restriction: "parent"
      });
      const restrictToEdges = interact.modifiers.restrictEdges({
        outer: "parent",
        endOnly: true
      });
      const restrictMinSize = interact.modifiers.restrictSize({
        min: { width: 100, height: 100 }
      });

      interact(overlayDiv)
        .draggable({ modifiers: [restrictToParent] })
        .on("dragmove", function(event) {
          const target = event.target;
          const x = parseFloat(target.style.left) + event.dx;
          const y = parseFloat(target.style.top) + event.dy;
          target.style.left = x + "px";
          target.style.top = y + "px";
        })
        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          modifiers: [restrictToEdges, restrictMinSize],
          inertia: true
        })
        .on("resizemove", function(event) {
          const target = event.target;
          const x = parseFloat(target.style.left) + event.deltaRect.left;
          const y = parseFloat(target.style.top) + event.deltaRect.top;
          //fix for interact.js adding 4px to height/width on resize
          target.style.width = event.rect.width - 4 + "px";
          target.style.height = event.rect.height - 4 + "px";
          target.style.left = x + "px";
          target.style.top = y + "px";
        });
    });
  } else {
    mainHover.style.opacity = "0";
    divsList.forEach(_div => {
      if (!_div.classList.contains("click-through"))
        _div.classList.add("click-through");
      _div.classList.remove("click-on");
      _div.classList.remove("editable");
      interact(_div).unset();
    });

    document.body.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    saveOverlaysPosition();
  }
}

function saveOverlaysPosition() {
  // Update each overlay with the new dimensions
  const overlays = [...pd.settings.overlays];
  const forceInt = num => Math.round(parseFloat(num));

  overlays.forEach((_overlay, index) => {
    const overlayDiv = byId("overlay_" + (index + 1));
    const bounds = {
      width: forceInt(overlayDiv.style.width),
      height: forceInt(overlayDiv.style.height),
      x: forceInt(overlayDiv.style.left),
      y: forceInt(overlayDiv.style.top)
    };
    const newOverlay = {
      ...overlays[index], // old overlay
      bounds // new setting
    };
    overlays[index] = newOverlay;
  });

  const hoverDiv = byId("overlay_hover");
  let overlayHover = {
    x: forceInt(hoverDiv.style.left),
    y: forceInt(hoverDiv.style.top)
  };
  ipcSend("save_user_settings", { overlays, overlayHover, skip_refresh: true });
}

ipc.on("close", (event, arg) => {
  close(arg.action, arg.index);
});

ipc.on("action_log", function(event, arg) {
  arg.str = striptags(arg.str, ["log-card", "log-ability"]);

  actionLog.push(arg);
  if (arg.seat == -99) {
    actionLog = [];
  }
  actionLog.sort(compare_logs);
  //console.log(arg.seat, arg.str);
  pd.settings.overlays.forEach((_overlay, index) => {
    if (_overlay.mode !== OVERLAY_LOG) return;
    recreateOverlay(index);
  });
});

ipc.on("settings_updated", settingsUpdated);

function settingsUpdated() {
  // mid-match Arena updates can make edit-mode difficult
  // temporarily allow the overlays to go stale during editing
  // (should be okay since ending edit-mode causes a refresh)
  if (editMode) return;

  // console.log(window.innerWidth, window.innerHeight);
  let hoverContainer = byId("overlay_hover");
  if (pd.settings.overlayHover) {
    hoverContainer.style.left = `${pd.settings.overlayHover.x}px`;
    hoverContainer.style.top = `${pd.settings.overlayHover.y}px`;
  } else {
    hoverContainer.style.left = `${window.innerWidth / 2 -
      pd.cardsSizeHoverCard / 2}px`;
    hoverContainer.style.top = `${window.innerHeight -
      pd.cardsSizeHoverCard / 0.71808510638 -
      50}px`;
  }

  webFrame.setZoomFactor(pd.settings.overlay_scale / 100);
  pd.settings.overlays.forEach((_overlay, index) => {
    const overlayDiv = byId("overlay_" + (index + 1));
    overlayDiv.style.height = _overlay.bounds.height + "px";
    overlayDiv.style.width = _overlay.bounds.width + "px";
    overlayDiv.style.left = _overlay.bounds.x + "px";
    overlayDiv.style.top = _overlay.bounds.y + "px";

    if (getVisible(_overlay)) {
      overlayDiv.style.opacity = "1";
      overlayDiv.style.visibility = "visible";
    } else {
      overlayDiv.style.opacity = "0";
      overlayDiv.style.visibility = "hidden";
    }

    change_background(index, pd.settings.back_url);

    const bgImageDom = `#overlay_${index + 1} .overlay_bg_image`;
    const elementsDom = `#overlay_${index + 1} .elements_wrapper`;
    const mainHoverDom = ".main_hover";

    queryElements(bgImageDom)[0].style.opacity = _overlay.alpha_back.toString();
    queryElements(elementsDom)[0].style.opacity = _overlay.alpha.toString();

    queryElements(mainHoverDom)[0].style.width = pd.cardsSizeHoverCard + "px";
    queryElements(mainHoverDom)[0].style.height =
      pd.cardsSizeHoverCard / 0.71808510638 + "px";

    recreateOverlay(index);
  });
}

function getVisible(settings) {
  if (!settings) return false;

  const currentModeApplies =
    (OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_MATCH);

  return settings.show && (currentModeApplies || settings.show_always);
}

ipc.on("set_draft_cards", (event, draft) => {
  currentDraft = draft;
  pd.settings.overlays.forEach((_overlay, index) => {
    if (!OVERLAY_DRAFT_MODES.includes(_overlay.mode)) return;
    recreateOverlay(index);
  });
});

ipc.on("set_turn", (event, arg) => {
  let { playerSeat: _we, turnPriority: _priority } = arg;
  playerSeat = _we;
  if (
    turnPriority != _priority &&
    _priority == playerSeat &&
    pd.settings.sound_priority
  ) {
    //    playBlip();
    const { Howl, Howler } = require("howler");
    const sound = new Howl({ src: ["../sounds/blip.mp3"] });
    Howler.volume(pd.settings.sound_priority_volume);
    sound.play();
  }
  //turnPhase = _phase;
  //turnStep = _step;
  //turnNumber = _number;
  //turnActive = _active;
  turnPriority = _priority;
  //turnDecision = _decision;

  pd.settings.overlays.forEach((_overlay, index) => {
    recreateOverlay(index);
  });
});

ipc.on("set_match", (event, arg) => {
  currentMatch = JSON.parse(arg);
  currentMatch.oppCards = new Deck(currentMatch.oppCards);

  const tempMain = currentMatch.playerCardsLeft.mainDeck;
  currentMatch.playerCardsLeft = new Deck(currentMatch.playerCardsLeft);
  currentMatch.playerCardsLeft.mainboard._list = tempMain;

  currentMatch.player.deck = new Deck(currentMatch.player.deck);
  currentMatch.player.originalDeck = new Deck(currentMatch.player.originalDeck);

  pd.settings.overlays.forEach((_overlay, index) => {
    if (OVERLAY_DRAFT_MODES.includes(_overlay.mode)) return;
    recreateOverlay(index);
  });
});

function change_background(index, arg = "default") {
  if (!arg) return;

  const mainWrapper = queryElements(
    `#overlay_${index + 1} .overlay_bg_image`
  )[0];
  if (arg === "default") {
    if (pd.settings.back_url && pd.settings.back_url !== "default") {
      mainWrapper.style.backgroundImage = "url(" + pd.settings.back_url + ")";
    } else {
      mainWrapper.style.backgroundImage = "url(" + DEFAULT_BACKGROUND + ")";
    }
  } else {
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", arg);
    xhr.onload = function() {
      if (xhr.status === 200) {
        mainWrapper.style.backgroundImage = "url(" + arg + ")";
      } else {
        mainWrapper.style.backgroundImage = "";
      }
    };
    xhr.send();
  }
}

function close(bool, index) {
  // -1 to toggle, else set
  let _new = bool == -1 ? !pd.settings.overlays[index].show : bool;

  const overlays = [...pd.settings.overlays];
  const newOverlay = {
    ...overlays[index], // old overlay
    show: _new // new setting
  };
  overlays[index] = newOverlay;
  ipcSend("save_user_settings", { overlays });
}

function ready(fn) {
  if (
    document.attachEvent
      ? document.readyState === "complete"
      : document.readyState !== "loading"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

ready(function() {
  document.body.style.backgroundColor = "rgba(0, 0, 0, 0)";

  queryElements(".overlay_container").forEach(node => {
    node.innerHTML = `
      <div class="outer_wrapper">
          <div class="overlay_wrapper overlay_bg_image">
          </div>
      </div>
      <div class="outer_wrapper elements_wrapper">
      </div>
      <div class="outer_wrapper top_nav_wrapper">
        <div class="flex_item overlay_icon click-on"></div>
        <div class="button settings click-on" style="margin: 0;"></div>
        <div class="button close click-on" style="margin-right: 4px;"></div>
      </div>`;
  });
  pd.settings.overlays.forEach((_overlay, index) => recreateOverlay(index));
  // Force a dom refresh
  queryElements(".overlay_container")[0].style.display = "none";
  queryElements(".overlay_container")[0].style.display = "";

  setTimeout(() => {
    pd.settings.overlays.forEach((_overlay, index) => {
      const iconSelector = `#overlay_${index + 1} .overlay_icon`;
      const iconDiv = queryElements(iconSelector)[0];
      iconDiv.style.backgroundColor = `var(--color-${COLORS_ALL[index]})`;
      iconDiv.addEventListener("click", toggleEditMode);

      const settingsSelector = `#overlay_${index + 1} .settings`;
      queryElements(settingsSelector)[0].addEventListener("click", function() {
        ipcSend("renderer_show");
        ipcSend("force_open_overlay_settings", index, IPC_MAIN);
      });

      const closeSelector = `#overlay_${index + 1} .close`;
      queryElements(closeSelector)[0].addEventListener("click", function() {
        close(-1, index);
      });
    });
  }, 500);
  setTimeout(() => {
    new TransparencyMouseFix({
      log: false,
      fixPointerEvents: "auto"
    });
  }, 1000);
});

function compare_logs(a, b) {
  if (a.time < b.time) return -1;
  if (a.time > b.time) return 1;
  return 0;
}
