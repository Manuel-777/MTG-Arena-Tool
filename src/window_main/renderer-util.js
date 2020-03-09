/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-use-before-define, @typescript-eslint/camelcase */
import { app, ipcRenderer as ipc, remote } from "electron";
import path from "path";
import Pikaday from "pikaday";
import { IPC_BACKGROUND, IPC_MAIN } from "../shared/constants";
import pd from "../shared/PlayerData";

const byId = id => document.getElementById(id);

const actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);
function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_MAIN, arg, to);
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

function showDatepicker(
  defaultDate,
  onChange = date => {},
  pickerOptions = {}
) {
  const cont = document.createElement("div");
  cont.classList.add("dialog_content");
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

export {
  actionLogDir,
  ipcSend,
  toggleArchived,
  getTagColor,
  makeResizable,
  toggleVisibility,
  showDatepicker,
  formatPercent,
  formatNumber,
  getWinrateClass,
  getEventWinLossClass,
  compareWinrates,
  compareColorWinrates,
  localTimeSince
};
