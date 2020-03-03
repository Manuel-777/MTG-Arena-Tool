/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-use-before-define, @typescript-eslint/camelcase */
import anime from "animejs";
import { app, ipcRenderer as ipc, remote } from "electron";
import fs from "fs";
import _ from "lodash";
import path from "path";
import Pikaday from "pikaday";
import Picker from "vanilla-picker";
import { EASING_DEFAULT, IPC_BACKGROUND, IPC_MAIN } from "../shared/constants";
import {
  createDiv,
  createInput,
  createLabel,
  queryElements as $$
} from "../shared/dom-fns";
import pd from "../shared/playerData";

const { dialog } = remote;

const byId = id => document.getElementById(id);
let dialogHandler = null;
const unmountPoints = [];
// quick and dirty shared state object for main renderer process
// (for state shared across processes, use database or PlayerData)
const localState = {
  authToken: "",
  collectionTableMode: pd.settings.collectionTableMode,
  discordTag: null,
  isBoosterMathValid: true,
  lastDataIndex: 0,
  lastScrollHandler: null,
  lastScrollTop: 0,
  exploreData: null
};
const actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);
function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_MAIN, arg, to);
}

export function addNodeToUnmountReact(node) {
  unmountPoints.push(node);
}

function setLocalState(state = {}) {
  Object.assign(localState, state);
}

function getLocalState() {
  return localState;
}

function toggleArchived(id) {
  ipcSend("toggle_archived", id);
}

function getTagColor(tag) {
  return pd.tags_colors[tag] || "#FAE5D2";
}

function makeResizable(div, resizeCallback, finalCallback) {
  let mPos;
  let finalWidth;

  const resize = function(e) {
    const parent = div.parentNode;
    const dx = mPos - e.x;
    mPos = e.x;
    const newWidth = Math.max(10, parseInt(parent.style.width) + dx);
    parent.style.width = `${newWidth}px`;
    parent.style.flex = `0 0 ${newWidth}px`;
    if (resizeCallback instanceof Function) resizeCallback(newWidth);
    finalWidth = newWidth;
  };

  const saveWidth = function(width) {
    ipcSend("save_user_settings", {
      right_panel_width: width,
      skipRefresh: true
    });
  };

  div.addEventListener(
    "mousedown",
    event => {
      mPos = event.x;
      document.addEventListener("mousemove", resize, false);
    },
    false
  );

  document.addEventListener(
    "mouseup",
    () => {
      document.removeEventListener("mousemove", resize, false);
      if (finalWidth) {
        saveWidth(finalWidth);
        if (finalCallback instanceof Function) finalCallback(finalWidth);
        finalWidth = null;
      }
    },
    false
  );
}

function toggleVisibility(...ids) {
  ids.forEach(id => {
    const el = byId(id);
    if ([...el.classList].includes("hidden")) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

function openDialog(content, onClose = () => {}) {
  const wrapper = $$(".dialog_wrapper")[0];
  dialogHandler = () => {
    onClose();
    closeDialog();
  };
  wrapper.style.pointerEvents = "all";
  wrapper.addEventListener("mousedown", dialogHandler);
  anime({
    targets: ".dialog_wrapper",
    opacity: 1,
    display: "block",
    easing: EASING_DEFAULT,
    duration: 150
  });

  const dialog = $$(".dialog")[0];
  dialog.innerHTML = "";
  dialog.appendChild(content);
  const halfHeight = (content.offsetHeight || 0) / 2;
  dialog.addEventListener("mousedown", e => e.stopPropagation());
  dialog.style.width = content.offsetWidth + 32 + "px";
  // dialog.style.height = content.offsetHeight + 32 + "px";
  dialog.style.top = `calc(50% - ${halfHeight}px)`;
  anime({
    targets: ".dialog",
    opacity: 1,
    easing: EASING_DEFAULT,
    duration: 250
  });
}

function closeDialog() {
  const wrapper = $$(".dialog_wrapper")[0];
  anime({
    targets: ".dialog_wrapper",
    opacity: 0,
    display: "hidden",
    easing: EASING_DEFAULT,
    duration: 150
  });
  wrapper.style.pointerEvents = "none";
  wrapper.removeEventListener("mousedown", dialogHandler);
  dialogHandler = null;

  const dialog = $$(".dialog")[0];
  anime({
    targets: ".dialog",
    opacity: 0,
    easing: EASING_DEFAULT,
    duration: 250
  });
  setTimeout(() => (dialog.innerHTML = ""), 250);
}

function showColorpicker(
  color,
  onChange = color => {},
  onDone = color => {},
  onCancel = () => {},
  pickerOptions = {}
) {
  const cont = createDiv(["dialog_content"]);
  cont.style.width = "250px";
  // https://vanilla-picker.js.org/gen/Picker.html
  new Picker({
    alpha: false,
    color,
    parent: cont,
    popup: false,
    onChange,
    onDone: function(color) {
      onDone(color);
      closeDialog();
    },
    ...pickerOptions
  });
  openDialog(cont, () => onCancel(color));
  const pickerWrapper = $$(".picker_wrapper")[0];
  pickerWrapper.style.backgroundColor = "rgb(0,0,0,0)";
  pickerWrapper.style.boxShadow = "none";
}

function showDatepicker(
  defaultDate,
  onChange = date => {},
  pickerOptions = {}
) {
  const cont = createDiv(["dialog_content"]);
  cont.style.width = "320px";
  cont.style.heigh = "400px";
  // https://github.com/Pikaday/Pikaday
  const now = new Date();
  const picker = new Pikaday({
    defaultDate,
    maxDate: now,
    onSelect: () => onChange(picker.getDate()),
    setDefaultDate: defaultDate !== undefined,
    ...pickerOptions
  });
  cont.appendChild(picker.el);
  openDialog(cont);
}

function renderLogInput(section) {
  const logUriLabel = createLabel(["but_container_label"], "Arena Log:", {
    for: "settings_log_uri"
  });
  logUriLabel.style.width = "100%";
  logUriLabel.appendChild(createDiv(["open_button"]));
  const logUriCont = createDiv(["input_container"]);
  logUriCont.style.margin = "3px";
  logUriCont.style.width = "70%";
  const logUriInput = createInput([], "", {
    type: "text",
    id: "settings_log_uri",
    autocomplete: "off",
    placeholder: pd.settings.logUri,
    value: pd.settings.logUri
  });
  let canShowFileDialog = true;
  logUriLabel.addEventListener("click", () => {
    if (!canShowFileDialog) return;
    // ignore clicks inside actual input field
    if (document.activeElement === logUriInput) return;
    canShowFileDialog = false;
    const paths = dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: "Arena Log Location",
      defaultPath: pd.settings.logUri,
      buttonLabel: "Select",
      filters: [
        { name: "Text", extensions: ["txt", "text"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (paths && paths.length && paths[0]) {
      logUriInput.focus();
      logUriInput.value = paths[0];
      logUriInput.blur();
    }
    canShowFileDialog = true;
  });
  logUriInput.addEventListener("keyup", e => {
    if (e.keyCode === 13) logUriInput.blur();
  });
  logUriInput.addEventListener("focusout", () => {
    if (logUriInput.value === pd.settings.logUri) return;
    if (
      confirm(
        "Changing the Arena log location requires a restart, are you sure?"
      )
    ) {
      ipcSend("set_log", byId("settings_log_uri").value);
    } else {
      logUriInput.value = pd.settings.logUri;
    }
  });
  logUriCont.appendChild(logUriInput);
  logUriLabel.appendChild(logUriCont);
  section.appendChild(logUriLabel);
  section.appendChild(
    createDiv(
      ["settings_note"],
      `<p><i>This temporary text file generated by WotC contains the raw
      output from your most recent (or current) Arena session. This is the
      primary source of user data.</i></p>`
    )
  );
}

function formatPercent(value, config = { maximumSignificantDigits: 2 }) {
  return value.toLocaleString([], {
    style: "percent",
    ...config
  });
}

export function formatWinrateInterval(lower, upper) {
  return `${formatPercent(lower)} to ${formatPercent(upper)} with 95% confidence
(estimated actual winrate bounds, assuming a normal distribution)`;
}

function formatNumber(value, config = {}) {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

function getWinrateClass(wr) {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

function getEventWinLossClass(wlGate) {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
  if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  return "red";
}

function compareWinrates(a, b) {
  const _a = a.wins / a.losses;
  const _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compareColorWinrates(a, b);
}

function compareColorWinrates(a, b) {
  a = a.colors;
  b = b.colors;

  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;

  const sa = a.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  const sb = b.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  if (sa < sb) return -1;
  if (sa > sb) return 1;

  return 0;
}

function localTimeSince(date) {
  return `<relative-time datetime="${date.toISOString()}">
    ${date.toString()}
  </relative-time>`;
}

export function draftShareLink(id, draft, shareExpire) {
  const draftData = JSON.stringify(draft);
  let expire = 0;
  switch (shareExpire) {
    case "One day":
      expire = 0;
      break;
    case "One week":
      expire = 1;
      break;
    case "One month":
      expire = 2;
      break;
    case "Never":
      expire = -1;
      break;
    default:
      expire = 0;
      break;
  }
  ipcSend("request_draft_link", { expire, id, draftData });
}

export function deckShareLink(deck, shareExpire) {
  const deckString = JSON.stringify(deck);
  let expire = 0;
  switch (shareExpire) {
    case "One day":
      expire = 0;
      break;
    case "One week":
      expire = 1;
      break;
    case "One month":
      expire = 2;
      break;
    case "Never":
      expire = -1;
      break;
    default:
      expire = 0;
      break;
  }
  ipcSend("request_deck_link", { expire, deckString });
}

export function logShareLink(id, shareExpire) {
  const actionLogFile = path.join(actionLogDir, id + ".txt");
  const log = fs.readFileSync(actionLogFile).toString("base64");

  let expire = 0;
  switch (shareExpire) {
    case "One day":
      expire = 0;
      break;
    case "One week":
      expire = 1;
      break;
    case "One month":
      expire = 2;
      break;
    case "Never":
      expire = -1;
      break;
    default:
      expire = 0;
      break;
  }
  ipcSend("request_log_link", { expire, log, id });
}

export {
  actionLogDir,
  ipcSend,
  setLocalState,
  getLocalState,
  toggleArchived,
  getTagColor,
  makeResizable,
  toggleVisibility,
  openDialog,
  closeDialog,
  showColorpicker,
  showDatepicker,
  renderLogInput,
  formatPercent,
  formatNumber,
  getWinrateClass,
  getEventWinLossClass,
  compareWinrates,
  compareColorWinrates,
  localTimeSince
};
