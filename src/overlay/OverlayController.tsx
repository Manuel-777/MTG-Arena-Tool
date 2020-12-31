import { ipcRenderer as ipc, webFrame } from "electron";
import React, { useCallback, useEffect, useState } from "react";
import { Howl, Howler } from "howler";
import { useSelector, useDispatch } from "react-redux";
import {
  constants,
  Deck,
  MatchData,
  InternalDraftv2,
  OverlaySettingsData,
} from "mtgatool-shared";
import { reduxAction } from "../shared/redux/sharedRedux";
import reloadTheme from "../shared/utils/reloadTheme";
import { AppState } from "../shared/redux/stores/overlayStore";
import CardDetailsWindowlet from "./CardDetailsWindowlet";
import OverlayWindowlet from "./OverlayWindowlet";
import Overview from "./overview";

import css from "./index.css";
import blipSound from "../assets/sounds/blip.mp3";

const {
  ARENA_MODE_IDLE,
  IPC_BACKGROUND,
  IPC_RENDERER,
  IPC_OVERLAY,
  IPC_MAIN,
  IPC_ALL,
} = constants;

const sound = new Howl({ src: [blipSound] });

const byId = (id: string): HTMLElement | null => document.getElementById(id);

function ipcSend(method: string, arg?: unknown, to = IPC_BACKGROUND): void {
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

const forceInt = (val: string | null): number =>
  Math.round(parseFloat(val || ""));

function setOddsCallback(sampleSize: number): void {
  ipcSend("set_odds_samplesize", sampleSize);
}

/**
 * This is the React control component at the root of the overlay process.
 * It should handle all of the IPC traffic with other processes and manage all
 * of the data-related state for the overlays.
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
  const [actionLog, setActionLog] = useState<string>("");
  const [arenaState, setArenaState] = useState(ARENA_MODE_IDLE);
  const [editMode, setEditMode] = useState(false);
  const [match, setMatch] = useState<undefined | MatchData>(undefined);
  const [draft, setDraft] = useState<undefined | InternalDraftv2>(undefined);
  const [draftState, setDraftState] = useState({ packN: 0, pickN: 0 });
  const [turnPriority, setTurnPriority] = useState(1);
  const settings = useSelector((state: AppState) => state.settings);
  const [lastBeep, setLastBeep] = useState(Date.now());
  const [matchEnd, setMatchEnd] = useState<any | null>(null);
  const isOverviewOpen = useSelector(
    (state: AppState) => state.overlay.isOverviewOpen
  );
  const dispatcher = useDispatch();

  const {
    overlay_scale: overlayScale,
    overlayHover,
    overlays,
    sound_priority: soundPriority,
    sound_priority_volume: soundPriorityVolume,
  } = settings;

  useEffect(() => {
    webFrame.setZoomFactor(overlayScale / 100);
  }, [overlayScale]);

  useEffect(() => {
    document.body.style.backgroundColor = editMode
      ? "rgba(0, 0, 0, 0.3)"
      : "rgba(0, 0, 0, 0)"; // Not all graphics setups can handle full transparency
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
  const handleSetEditMode = (_event: unknown, _editMode: boolean): void => {
    // Expand the overlay windows
    const collapsed = false;
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
            width: overlay.collapsed ? overlay.bounds.width : forceInt(overlayDiv.style.width),
            height: overlay.collapsed ? overlay.bounds.height: forceInt(overlayDiv.style.height),
            x: forceInt(overlayDiv.style.left),
            y: forceInt(overlayDiv.style.top),
          };
        } 
        return { ...overlay, bounds, collapsed };
      }
    );
    // Save current windowlet dimensions before we leave edit mode
    if (editMode && !_editMode) {      
      // Compute current dimensions of hover card windowlet in DOM
      const hoverDiv = byId(css.overlayHover);
      const newOverlayHover =
        (hoverDiv && {
          x: forceInt(hoverDiv.style.left),
          y: forceInt(hoverDiv.style.top),
        }) ||
        overlayHover;

      reduxAction(
        dispatcher,
        {
          type: "SET_SETTINGS",
          arg: { overlays: newOverlays, overlayHover: newOverlayHover },
        },
        IPC_ALL ^ IPC_OVERLAY
      );
    } else {      
      reduxAction(
        dispatcher,
        { type: "SET_SETTINGS", arg: { overlays: newOverlays } },
        IPC_ALL ^ IPC_OVERLAY
      );
    }
    setEditMode(_editMode);
  };  

  const handleActionLog = useCallback((_event: unknown, arg: string): void => {
    setActionLog(arg);
  }, []);

  const handleSetArenaState = useCallback(
    (_event: unknown, arenaState: number): void => {
      setArenaState(arenaState);
    },
    []
  );

  const handleSetCollapsed = (_event: unknown, index: number): void => {
    const collapsed = !overlays[index].collapsed
    const newOverlays = [...overlays];
    newOverlays[index] = {
      ...overlays[index], // old overlay
      collapsed, // new setting
    };
    
    reduxAction(
      dispatcher,
      { type: "SET_SETTINGS", arg: { overlays: newOverlays } },
      IPC_ALL ^ IPC_OVERLAY
    );
  };

  // Note: no useCallback because of dependency on deep overlays state
  const handleClose = (
    _event: unknown,
    arg: { action: boolean | -1; index: number }
  ): void => {
    const { action, index } = arg;
    // -1 to toggle, else set
    const show = action === -1 ? !overlays[index].show : action;
    const newOverlays = [...overlays];
    newOverlays[index] = {
      ...overlays[index], // old overlay
      show, // new setting
    };

    reduxAction(
      dispatcher,
      { type: "SET_SETTINGS", arg: { overlays: newOverlays } },
      IPC_ALL ^ IPC_OVERLAY
    );
  };

  const handleSetDraftCards = useCallback(
    (_event: unknown, draft: InternalDraftv2): void => {
      setDraft(draft);
      setDraftState({ packN: draft.currentPack, pickN: draft.currentPick });
    },
    []
  );

  const handleSetMatch = useCallback((_event: unknown, arg: string): void => {
    const newMatch = JSON.parse(arg);
    newMatch.oppCards = new Deck(newMatch.oppCards);
    newMatch.playerCardsLeft = new Deck(newMatch.playerCardsLeft);
    newMatch.player.deck = new Deck(newMatch.player.deck);
    newMatch.player.originalDeck = new Deck(newMatch.player.originalDeck);
    setMatch(newMatch);
  }, []);

  const handleSetTurn = useCallback(
    (
      _event: unknown,
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

  const handleMatchEnd = useCallback(
    (_event: unknown, arg: string) => {
      const matchData = JSON.parse(arg);
      setMatchEnd(matchData);
      reduxAction(
        dispatcher,
        { type: "SET_OVERVIEW_OPEN", arg: true },
        IPC_MAIN
      );
    },
    [dispatcher]
  );

  const handleReloadTheme = useCallback((_event: unknown, arg: string) => {
    reloadTheme(arg);
  }, []);

  const clearMatchEnd = useCallback(() => {
    reduxAction(
      dispatcher,
      { type: "SET_OVERVIEW_OPEN", arg: false },
      IPC_MAIN
    );
  }, [dispatcher]);

  // register all IPC listeners
  useEffect(() => {
    ipc.on("action_log", handleActionLog);
    ipc.on("set_edit_mode", handleSetEditMode);
    ipc.on("set_collapsed", handleSetCollapsed);
    ipc.on("close", handleClose);
    ipc.on("set_arena_state", handleSetArenaState);
    ipc.on("set_draft", handleSetDraftCards);
    ipc.on("set_match", handleSetMatch);
    ipc.on("set_turn", handleSetTurn);
    ipc.on("match_end", handleMatchEnd);
    ipc.on("reload_theme", handleReloadTheme);

    return (): void => {
      // unregister all IPC listeners
      ipc.removeListener("action_log", handleActionLog);
      ipc.removeListener("set_edit_mode", handleSetEditMode);
      ipc.removeListener("set_collapsed", handleSetCollapsed);
      ipc.removeListener("close", handleClose);
      ipc.removeListener("set_arena_state", handleSetArenaState);
      ipc.removeListener("set_draft", handleSetDraftCards);
      ipc.removeListener("set_match", handleSetMatch);
      ipc.removeListener("set_turn", handleSetTurn);
      ipc.removeListener("match_end", handleMatchEnd);
      ipc.removeListener("reload_theme", handleReloadTheme);
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
    setOddsCallback,
    turnPriority,
  };

  const cardDetailsProps = {
    arenaState,
    editMode,
    handleToggleEditMode,
    odds: match ? match.playerCardsOdds : undefined,
    overlayHover,
    overlayScale,
    settings,
  };

  return (
    <div className={css.overlayMasterWrapper}>
      {!!overlays &&
        overlays.map((_overlaySettings: OverlaySettingsData, index: number) => {
          const overlayProps = {
            handleToggleCollapse: (): void => {
              handleSetCollapsed(null, index);
            },
            handleClickSettings: (): void => {
              ipcSend("renderer_show");
              ipcSend(
                "force_open_overlay_settings",
                index,
                IPC_RENDERER | IPC_MAIN
              );
            },
            handleClickClose: (): void => {
              handleClose(null, { action: -1, index });
            },
            index,
            ...commonProps,
          };
          return (
            <OverlayWindowlet
              key={"overlay_windowlet_" + index}
              {...overlayProps}
            />
          );
        })}
      {isOverviewOpen && matchEnd ? (
        <Overview closeCallback={clearMatchEnd} matchData={matchEnd} />
      ) : (
        <></>
      )}
      <CardDetailsWindowlet {...cardDetailsProps} />
    </div>
  );
}
