/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-use-before-define, @typescript-eslint/camelcase */
import { app, ipcRenderer as ipc, remote } from "electron";
import path from "path";
import { IPC_BACKGROUND, IPC_MAIN } from "../shared/constants";
import { WinLossGate } from "../types/event";
import pd from "../shared/PlayerData";
const Pikaday = require("pikaday");

const actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);
function ipcSend(method: string, arg: any = true, to = IPC_BACKGROUND): void {
  ipc.send("ipc_switch", method, IPC_MAIN, arg, to);
}

function toggleArchived(id: string): void {
  ipcSend("toggle_archived", id);
}

function getTagColor(tag: string): string {
  return pd.tags_colors[tag] || "#FAE5D2";
}

function makeResizable(
  div: HTMLDivElement,
  resizeCallback: (width: number) => void,
  finalCallback?: (width: number) => void
) {
  let mPos: number;
  let finalWidth: number | null;

  const resize = (e: MouseEvent) => {
    const parent = div.parentElement;
    const dx = mPos - e.x;
    mPos = e.x;
    if (parent !== null) {
      const newWidth = Math.max(10, parseInt(parent.style.width) + dx);
      parent.style.width = `${newWidth}px`;
      parent.style.flex = `0 0 ${newWidth}px`;
      if (resizeCallback instanceof Function) resizeCallback(newWidth);
      finalWidth = newWidth;
    }
  };

  const saveWidth = function(width: number) {
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

function showDatepicker(
  defaultDate: Date,
  onChange: (date: Date) => void,
  pickerOptions: any = {}
): void {
  const cont = document.createElement("div");
  cont.classList.add("dialog_content");
  cont.style.width = "320px";
  cont.style.height = "400px";
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

function formatPercent(
  value: number,
  config = { maximumSignificantDigits: 2 }
): string {
  return value.toLocaleString([], {
    style: "percent",
    ...config
  });
}

export function formatWinrateInterval(lower: number, upper: number): string {
  return `${formatPercent(lower)} to ${formatPercent(upper)} with 95% confidence
(estimated actual winrate bounds, assuming a normal distribution)`;
}

function formatNumber(value: number, config = {}): string {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

function getWinrateClass(wr: number): string {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

function getEventWinLossClass(wlGate: WinLossGate): string {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
  if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  return "red";
}

interface Winrate {
  wins: number;
  losses: number;
  colors: number[];
}

function compareWinrates(a: Winrate, b: Winrate): 1 | 0 | -1 {
  const _a = a.wins / a.losses;
  const _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compareColorWinrates(a, b);
}

function compareColorWinrates(_a: Winrate, _b: Winrate): 1 | 0 | -1 {
  const a = _a.colors;
  const b = _b.colors;

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

export {
  actionLogDir,
  ipcSend,
  toggleArchived,
  getTagColor,
  makeResizable,
  showDatepicker,
  formatPercent,
  formatNumber,
  getWinrateClass,
  getEventWinLossClass,
  compareWinrates,
  compareColorWinrates
};
