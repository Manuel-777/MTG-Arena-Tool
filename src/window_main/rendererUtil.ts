/* eslint-disable @typescript-eslint/no-use-before-define, @typescript-eslint/camelcase */
import { app, ipcRenderer as ipc, remote } from "electron";
import path from "path";
import Pikaday from "pikaday";
import { IPC_BACKGROUND, IPC_MAIN } from "../shared/constants";
import pd from "../shared/PlayerData";
import { WinLossGate } from "../types/event";

export const actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);

export function ipcSend(
  method: string,
  arg?: unknown,
  to = IPC_BACKGROUND
): void {
  ipc.send("ipc_switch", method, IPC_MAIN, arg, to);
}

export function toggleArchived(id: string | number): void {
  ipcSend("toggle_archived", id);
}

export function getTagColor(tag?: string): string {
  return (tag ? pd.tags_colors[tag] : undefined) ?? "#FAE5D2";
}

export function makeResizable(
  div: HTMLElement,
  resizeCallback?: (width: number) => void,
  finalCallback?: (width: number) => void
): void {
  let mPos: number;
  let finalWidth: number | undefined;

  const resize = function(e: MouseEvent): void {
    const parent = div.parentNode;
    if (parent) {
      const parEl = parent as HTMLElement;
      const dx = mPos - e.x;
      mPos = e.x;
      const newWidth = Math.max(10, parseInt(parEl.style.width) + dx);
      parEl.style.width = `${newWidth}px`;
      parEl.style.flex = `0 0 ${newWidth}px`;
      if (resizeCallback instanceof Function) resizeCallback(newWidth);
      finalWidth = newWidth;
    }
  };

  const saveWidth = function(width: number): void {
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
        finalWidth = undefined;
      }
    },
    false
  );
}

export function showDatepicker(
  defaultDate: Date | undefined,
  onChange: (date: Date) => void | undefined,
  pickerOptions = {}
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
    onSelect: (): void => {
      const value = picker.getDate();
      value && onChange && onChange(value);
    },
    setDefaultDate: defaultDate !== undefined,
    ...pickerOptions
  });
  cont.appendChild(picker.el);
}

export function formatPercent(
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

export function formatNumber(value: number, config = {}): string {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

export function getWinrateClass(wr: number): string {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

export function getEventWinLossClass(wlGate: Partial<WinLossGate>): string {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins && wlGate.CurrentLosses) {
    if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
    if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  }
  return "red";
}

interface Winrate {
  wins: number;
  losses: number;
  colors?: number[] | undefined;
}

export function compareWinrates(a: Winrate, b: Winrate): -1 | 0 | 1 {
  const _a = a.wins / a.losses;
  const _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compareColorWinrates(a, b);
}

export function compareColorWinrates(winA: Winrate, winB: Winrate): -1 | 0 | 1 {
  const a = winA.colors ?? [];
  const b = winB.colors ?? [];

  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;

  const sa = a.reduce(function(_a: number, _b: number) {
    return _a + _b;
  }, 0);
  const sb = b.reduce(function(_a: number, _b: number) {
    return _a + _b;
  }, 0);
  if (sa < sb) return -1;
  if (sa > sb) return 1;

  return 0;
}
