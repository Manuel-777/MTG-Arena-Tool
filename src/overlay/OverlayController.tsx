import { ipcRenderer as ipc, webFrame } from "electron";
import React, { useEffect, useCallback, useState } from "react";
import { Howl, Howler } from "howler";
import striptags from "striptags";

import playerData from "../shared/player-data";
import Deck from "../shared/deck";
import {
  ARENA_MODE_IDLE,
  IPC_BACKGROUND,
  IPC_MAIN,
  IPC_OVERLAY
} from "../shared/constants";

import {
  DraftData,
  LogData,
  OverlaySettingsData,
  SettingsData
} from "./overlayUtil";
import { MatchData } from "../window_background/types/currentMatch";
import CardDetailsWindowlet from "./CardDetailsWindowlet";
import OverlayWindowlet from "./OverlayWindowlet";
import { DbCardData } from "../shared/types/Metadata";

const sound = new Howl({ src: ["../sounds/blip.mp3"] });

const byId = (id: string): HTMLElement | null => document.getElementById(id);

function ipcSend(method: string, arg?: unknown, to = IPC_BACKGROUND): void {
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

const forceInt = (val: string | null): number =>
  Math.round(parseFloat(val || ""));

function compareLogEntries(a: LogData, b: LogData): -1 | 0 | 1 {
  if (a.time < b.time) return -1;
  if (a.time > b.time) return 1;
  return 0;
}

function setOddsCallback(sampleSize: number): void {
  ipcSend("set_odds_samplesize", sampleSize);
}

/**
 * This is the React control component at the root of the overlay process.
 * It should handle all of the IPC traffic with other processes and manage all
 * of the data-related state for the overlays (except for player-data, which
 * still handles "set_player_data").
 *
 * Overlay React hierarchy:
 * - OverlayController (state and IPC control)
 *   - CardDetailsWindowlet (card hover)
 *   - OverlayWindowlet (x5)
 *     - DraftElements
 *       - DeckList
 *     - MatchElements
 *       - ActionLog
 *       - DeckList
 *         - SampleSizePanel
 *       - Clock
 */
export default function OverlayController(): JSX.Element {
  const [actionLog, setActionLog] = useState([] as LogData[]);
  const [arenaState, setArenaState] = useState(ARENA_MODE_IDLE);
  const [editMode, setEditMode] = useState(false);
  const [match, setMatch] = useState(undefined as undefined | MatchData);
  const [draft, setDraft] = useState(undefined as undefined | DraftData);
  const [draftState, setDraftState] = useState({ packN: 0, pickN: 0 });
  const [turnPriority, setTurnPriority] = useState(1);
  const [settings, setSettings] = useState(playerData.settings as SettingsData);
  const [lastBeep, setLastBeep] = useState(Date.now());
  const [hoverCard, setHoverCard] = useState(
    undefined as undefined | DbCardData
  );

  const {
    overlay_scale: overlayScale,
    overlayHover,
    overlays,
    sound_priority: soundPriority,
    sound_priority_volume: soundPriorityVolume
  } = settings;

  useEffect(() => {
    webFrame.setZoomFactor(overlayScale / 100);
  }, [overlayScale]);
  useEffect(() => {
    document.body.style.backgroundColor = editMode
      ? "rgba(0, 0, 0, 0.3)"
      : "rgba(0, 0, 0, 0.05)"; // Not all graphics setups can handle full transparency
  }, [editMode]);

  const handleBeep = useCallback(() => {
    if (Date.now() - lastBeep > 1000) {
      Howler.volume(soundPriorityVolume);
      sound.play();
      setLastBeep(Date.now());
    }
  }, [lastBeep, soundPriorityVolume]);

  const handleToggleEditMode = useCallback(
    () => ipcSend("toggle_edit_mode"),
    []
  );

  // Note: no useCallback because of dependency on deep overlays state
  const handleSetEditMode = (event: unknown, _editMode: boolean) => {
    // Save current windowlet dimensions before we leave edit mode
    if (editMode && !_editMode) {
      // Compute current dimensions of overlay windowlets in DOM
      const newOverlays = overlays.map(
        (overlay: OverlaySettingsData, index: number) => {
          // TODO still looking for a good way to get overlay bounds
          // using forwardRef would require merging fowarded refs
          // with the existing OverlayWindowlet useRef
          const overlayDiv = byId("overlay_" + (index + 1));
          let bounds = overlay.bounds;
          if (overlayDiv) {
            bounds = {
              width: forceInt(overlayDiv.style.width),
              height: forceInt(overlayDiv.style.height),
              x: forceInt(overlayDiv.style.left),
              y: forceInt(overlayDiv.style.top)
            };
          }
          return { ...overlay, bounds };
        }
      );
      // Compute current dimensions of hover card windowlet in DOM
      const hoverDiv = byId("overlay_hover");
      const newOverlayHover =
        (hoverDiv && {
          x: forceInt(hoverDiv.style.left),
          y: forceInt(hoverDiv.style.top)
        }) ||
        overlayHover;

      ipcSend("save_user_settings", {
        overlays: newOverlays,
        overlayHover: newOverlayHover,
        skip_refresh: true
      });
    }
    setEditMode(_editMode);
  };

  const handleActionLog = useCallback(
    (event: unknown, arg: LogData): void => {
      let newLog = [...actionLog];
      arg.str = striptags(arg.str, ["log-card", "log-ability"]);
      newLog.push(arg);
      if (arg.seat === -99) {
        newLog = [];
      }
      newLog.sort(compareLogEntries);
      setActionLog(newLog);
    },
    [actionLog]
  );

  const handleSetArenaState = useCallback(
    (event: unknown, arenaState: number): void => {
      setArenaState(arenaState);
    },
    []
  );

  // Note: no useCallback because of dependency on deep overlays state
  const handleClose = (
    event: unknown,
    arg: { action: boolean | -1; index: number }
  ): void => {
    const { action, index } = arg;
    // -1 to toggle, else set
    const show = action === -1 ? !overlays[index].show : action;
    const newOverlays = [...overlays];
    newOverlays[index] = {
      ...overlays[index], // old overlay
      show // new setting
    };
    ipcSend("save_user_settings", { overlays: newOverlays });
  };

  const handleSetDraftCards = useCallback(
    (event: unknown, draft: DraftData): void => {
      setDraft(draft);
      setDraftState({ packN: draft.packNumber, pickN: draft.pickNumber });
    },
    []
  );

  const handleSettingsUpdated = useCallback((): void => {
    setSettings({ ...playerData.settings });
  }, []);

  const handleSetMatch = useCallback((event: unknown, arg: string): void => {
    const newMatch = JSON.parse(arg);
    newMatch.oppCards = new Deck(newMatch.oppCards);
    newMatch.playerCardsLeft = new Deck(newMatch.playerCardsLeft);
    newMatch.player.deck = new Deck(newMatch.player.deck);
    newMatch.player.originalDeck = new Deck(newMatch.player.originalDeck);
    setMatch(newMatch);
  }, []);

  const handleSetTurn = useCallback(
    (
      event: unknown,
      arg: { playerSeat: number; turnPriority: number }
    ): void => {
      const { playerSeat, turnPriority: priority } = arg;
      if (soundPriority && turnPriority != priority && priority == playerSeat) {
        handleBeep();
      }
      setTurnPriority(priority);
    },
    [handleBeep, soundPriority, turnPriority]
  );

  // register all IPC listeners
  useEffect(() => {
    ipc.on("action_log", handleActionLog);
    ipc.on("set_edit_mode", handleSetEditMode);
    ipc.on("close", handleClose);
    ipc.on("set_arena_state", handleSetArenaState);
    ipc.on("set_draft_cards", handleSetDraftCards);
    ipc.on("set_match", handleSetMatch);
    ipc.on("set_player_data", handleSettingsUpdated);
    ipc.on("set_turn", handleSetTurn);

    return (): void => {
      // unregister all IPC listeners
      ipc.removeListener("action_log", handleActionLog);
      ipc.removeListener("set_edit_mode", handleSetEditMode);
      ipc.removeListener("close", handleClose);
      ipc.removeListener("set_arena_state", handleSetArenaState);
      ipc.removeListener("set_draft_cards", handleSetDraftCards);
      ipc.removeListener("set_match", handleSetMatch);
      ipc.removeListener("set_player_data", handleSettingsUpdated);
      ipc.removeListener("set_turn", handleSetTurn);
    };
  });

  const commonProps = {
    actionLog,
    arenaState,
    draft,
    draftState,
    editMode,
    handleToggleEditMode,
    match,
    settings,
    setDraftStateCallback: setDraftState,
    setHoverCardCallback: (card?: DbCardData): void => setHoverCard(card),
    setOddsCallback,
    turnPriority
  };

  const { cardsSizeHoverCard } = playerData;
  const cardDetailsProps = {
    arenaState,
    card: hoverCard,
    cardsSizeHoverCard,
    editMode,
    handleToggleEditMode,
    odds: match ? match.playerCardsOdds : undefined,
    overlayHover,
    overlayScale,
    settings
  };

  return (
    <div className="overlay_master_wrapper">
      {!!overlays &&
        overlays.map((overlaySettings: OverlaySettingsData, index: number) => {
          const overlayProps = {
            handleClickSettings: (): void => {
              ipcSend("renderer_show");
              ipcSend("force_open_overlay_settings", index, IPC_MAIN);
            },
            handleClickClose: (): void => {
              handleClose(null, { action: -1, index });
            },
            index,
            ...commonProps
          };
          return (
            <OverlayWindowlet
              key={"overlay_windowlet_" + index}
              {...overlayProps}
            />
          );
        })}
      <CardDetailsWindowlet {...cardDetailsProps} />
    </div>
  );
}
