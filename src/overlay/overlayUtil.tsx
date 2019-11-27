import { remote } from "electron";
import { useEffect } from "react";
import interact from "interactjs";

import Deck from "../shared/deck";

export interface CardData {
  id: string;
  quantity: number;
  chance?: number;
  dfcId?: string;
}

export interface LogData {
  grpId: number;
  str: any;
  seat: number;
  time: string;
}

export interface OddsData {
  landW: number;
  landU: number;
  landB: number;
  landR: number;
  landG: number;
  [key: string]: number;
}

export interface MatchData {
  id: string;
  beginTime: number;
  oppArchetype: string;
  oppCards: Deck;
  opponent: { name: string };
  playerCardsOdds: OddsData;
  playerCardsLeft: Deck;
  player: { deck: Deck; originalDeck: Deck; seat: number };
  priorityTimers: number[];
}

export interface DraftData {
  id: string;
  pickNumber: number;
  packNumber: number;
  set: string;
  pickedCards: any;
  currentPack?: any;
  [key: string]: any;
}

export interface DraftState {
  packN: number;
  pickN: number;
}

export interface OverlaySettingsData {
  alpha: number;
  alpha_back: number;
  bounds: { width: number; height: number; x: number; y: number };
  cards_overlay: boolean;
  clock: boolean;
  draw_odds: boolean;
  deck: boolean;
  lands: boolean;
  keyboard_shortcut: boolean;
  mana_curve: boolean;
  mode: number;
  ontop: boolean;
  show: boolean;
  show_always: boolean;
  sideboard: boolean;
  title: boolean;
  top: boolean;
  type_counts: boolean;
}

export interface SettingsData {
  sound_priority: boolean;
  sound_priority_volume: number;
  cards_quality: string;
  cards_size: number;
  cards_size_hover_card: number;
  overlay_back_color: string;
  back_color: string;
  back_url: string;
  card_tile_style: number | string;
  overlay_scale: number;
  overlays: OverlaySettingsData[];
  overlayHover: { x: number; y: number };
  shortcut_editmode: string;
}

const restrictMinSize =
  interact.modifiers &&
  interact.modifiers.restrictSize({
    min: { width: 100, height: 100 }
  });
const cursorChecker: any = (
  action: any,
  interactable: any,
  element: any,
  interacting: boolean
): string => {
  switch (action.axis) {
    case "x":
      return "ew-resize";
    case "y":
      return "ns-resize";
    default:
      return interacting ? "grabbing" : "grab";
  }
};

export function useEditModeOnRef(
  editMode: boolean,
  containerRef: React.MutableRefObject<any>,
  uiScaleFactor: number
): void {
  const restrictDragBounds: any =
    interact.modifiers &&
    interact.modifiers.restrict({
      elementRect: { left: 0, right: 1, top: 0, bottom: 1 } as any
    });
  useEffect(() => {
    const container = containerRef.current;
    if (editMode) {
      if (container) {
        interact(container)
          .draggable({ cursorChecker, modifiers: [restrictDragBounds] })
          .on("dragmove", function(event) {
            const target = event.target;
            const x = parseFloat(target.style.left) + event.dx;
            const y = parseFloat(target.style.top) + event.dy;
            target.style.left = x + "px";
            target.style.top = y + "px";
          })
          .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            modifiers: [restrictMinSize],
            inertia: true
          } as any)
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
        return (): void => interact(container).unset();
      }
    }
  });
}

export const getEditModeClass = (editMode: boolean): string =>
  editMode ? "click-on editable" : "click-through";
