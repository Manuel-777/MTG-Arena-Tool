/* eslint-disable @typescript-eslint/camelcase */
import React, { useMemo, useCallback } from "react";
import Button from "../misc/Button";
import { ipcSend } from "../../ipcSend";
import Toggle from "../misc/Toggle";
import Slider from "../misc/Slider";
import _ from "lodash";
import ReactSelect from "../../../shared/ReactSelect";
import useColorPicker from "../../hooks/useColorPicker";
import { useSelector } from "react-redux";
import store, { AppState } from "../../../shared/redux/stores/rendererStore";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import defaultConfig from "../../../shared/defaultConfig";
import { Howl, Howler } from "howler";
import css from "./Sections.css";
import indexCss from "../../index.css";
import topNavCss from "../main/topNav.css";
import { constants } from "mtgatool-shared";
const {
  COLORS_ALL,
  OVERLAY_DRAFT,
  OVERLAY_LEFT,
  OVERLAY_LOG,
  OVERLAY_ODDS,
  OVERLAY_SEEN,
  OVERLAY_MIXED,
  OVERLAY_DRAFT_BREW,
  OVERLAY_FULL,
  OVERLAY_DRAFT_MODES,
  IPC_RENDERER,
  IPC_ALL,
} = constants;

function toggleEditMode(): void {
  ipcSend("toggle_edit_mode");
}

function backgroundColorPicker(color: string): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { overlay_back_color: color } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function setAlwaysOnTop(checked: boolean): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { overlay_ontop: checked } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function setOverview(checked: boolean): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { overlay_overview: checked } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function setSoundPriority(checked: boolean): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { sound_priority: checked } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function setCurrentOverlaySettings(current: number): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { settings_overlay_section: current } },
    IPC_ALL ^ IPC_RENDERER
  );
}

interface OverlaysTopNavProps {
  current: number;
  setCurrent: (overlay: number) => void;
}

function OverlaysTopNav(props: OverlaysTopNavProps): JSX.Element {
  const overlays = [0, 1, 2, 3, 4];
  return (
    <div className={`${css.overlay_section_selector_cont} ${topNavCss.icons}`}>
      {overlays.map((id: number) => {
        return (
          <div
            onClick={(): void => {
              setCurrentOverlaySettings(id);
              props.setCurrent(id);
            }}
            key={id}
            style={{ maxWidth: "160px", display: "flex" }}
            className={`overlay_settings_nav ${topNavCss.item} ${
              props.current == id ? " " + topNavCss.itemSelected : ""
            }`}
          >
            <div
              style={{
                backgroundColor: `var(--color-${COLORS_ALL[id]})`,
                flexShrink: 0,
              }}
              className={indexCss.overlayIcon}
            ></div>
            <div className={indexCss.overlay_label}>
              {"Overlay " + (id + 1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const modeOptions: any[] = [];
modeOptions[OVERLAY_FULL] = "Full Deck";
modeOptions[OVERLAY_LEFT] = "Library";
modeOptions[OVERLAY_ODDS] = "Next Draw";
modeOptions[OVERLAY_MIXED] = "Library and Odds";
modeOptions[OVERLAY_SEEN] = "Opponent";
modeOptions[OVERLAY_DRAFT] = "Draft Pick";
modeOptions[OVERLAY_LOG] = "Action Log";
modeOptions[OVERLAY_DRAFT_BREW] = "Draft Brew";

const modeHelp: any[] = [];
modeHelp[OVERLAY_FULL] =
  "Shows your complete deck. Usually only shown during a match.";
modeHelp[OVERLAY_LEFT] =
  "Shows your remaining library. Usually only shown during a match.";
modeHelp[OVERLAY_ODDS] =
  "Shows probabilities for your next draw. Usually only shown during a match.";
modeHelp[OVERLAY_MIXED] =
  "Shows probabilities for your next draw and your remaining library. Usually only shown during a match.";
modeHelp[OVERLAY_SEEN] =
  "Shows your Opponent's cards that you have seen. Usually only shown during a match.";
modeHelp[OVERLAY_DRAFT] =
  "Shows the cards in each draft pack/pick. Usually only shown during a draft.";
modeHelp[OVERLAY_LOG] =
  "Shows detailed play-by-play match history. Usually only shown during a match.";
modeHelp[OVERLAY_DRAFT_BREW] =
  "Shows your partially complete draft brew (all previous picks). Usually only shown during a draft.";

interface SectionProps {
  current: number;
  settings: AppState["settings"]["overlays"][0];
  show: boolean;
}

function saveOverlaySettings(current: number, value: any, key: string): void {
  const send: any = {
    index: current,
  };
  send[key] = value;
  ipcSend("save_overlay_settings", send);
}

function setOverlayMode(current: number, filter: string): void {
  ipcSend("save_overlay_settings", {
    index: current,
    mode: modeOptions.indexOf(filter),
  });
}

function OverlaySettingsSection(props: SectionProps): JSX.Element {
  const { settings, current, show } = props;
  const [overlayAlpha, setOverlayAlpha] = React.useState(0);
  const [overlayAlphaBack, setOverlayAlphaBack] = React.useState(0);
  const primaryMonitorPos = useSelector(
    (state: AppState) => state.settings.primaryMonitorPos
  );

  // Alpha
  const overlayAlphaDebouce = useMemo(() => {
    return _.debounce((value: number) => {
      saveOverlaySettings(current, value, "alpha");
    }, 1000);
  }, [current]);

  const overlayAlphaHandler = (value: number): void => {
    setOverlayAlpha(value);
    overlayAlphaDebouce(value);
  };

  // Alpha Background
  const overlayAlphaBackDebouce = useMemo(() => {
    return _.debounce((value: number) => {
      saveOverlaySettings(current, value, "alpha_back");
    }, 1000);
  }, [current]);

  const overlayAlphaBackHandler = (value: number): void => {
    setOverlayAlphaBack(value);
    overlayAlphaBackDebouce(value);
  };

  React.useEffect(() => {
    setOverlayAlpha(settings ? settings.alpha : 0);
    setOverlayAlphaBack(settings ? settings.alpha_back : 0);
  }, [settings]);

  return show ? (
    <>
      <Toggle
        text={"Enable overlay " + (current + 1)}
        value={settings.show}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "show")
        }
      />
      <div className={css.centered_setting_container}>
        <label>Mode:</label>
        <ReactSelect
          options={modeOptions}
          current={modeOptions[settings.mode]}
          callback={(filter: string): void => setOverlayMode(current, filter)}
        />
      </div>
      <div className={css.settings_note}>
        <p>
          <i>{modeHelp[settings.mode]}</i>
        </p>
      </div>
      <Toggle
        text={"Always show overlay"}
        value={settings.show_always}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "show_always")
        }
      />
      <div className={css.settings_note}>
        <p>
          <i>
            Displays the overlay regardless of Arena match or draft status
            (&quot;Enable Overlay&quot; must also be checked). To adjust overlay
            position, click on its colored icon in the top left to toggle edit
            mode.
          </i>
        </p>
      </div>
      <Toggle
        text={"Auto adjust size"}
        value={settings.autosize}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "autosize")
        }
      />
      <Toggle
        text={"Show top bar"}
        value={settings.top}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "top")
        }
      />
      <Toggle
        text={"Show title"}
        value={settings.title}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "title")
        }
        disabled={settings.mode === OVERLAY_DRAFT}
      />
      <Toggle
        text={"Show deck/lists"}
        value={settings.deck}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "deck")
        }
        disabled={settings.mode === OVERLAY_DRAFT}
      />
      <Toggle
        text={"Show sideboard"}
        value={settings.sideboard}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "sideboard")
        }
        disabled={
          ![OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
            settings.mode
          )
        }
      />
      <Toggle
        text={"Compact lands"}
        value={settings.lands}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "lands")
        }
        disabled={
          ![OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
            settings.mode
          )
        }
      />
      <Toggle
        text={"Show clock"}
        value={settings.clock}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "clock")
        }
        disabled={OVERLAY_DRAFT_MODES.includes(settings.mode)}
      />
      <Toggle
        text={"Show odds"}
        value={settings.draw_odds}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "draw_odds")
        }
        disabled={[
          OVERLAY_FULL,
          OVERLAY_LEFT,
          OVERLAY_SEEN,
          OVERLAY_DRAFT,
          OVERLAY_LOG,
          OVERLAY_DRAFT_BREW,
        ].includes(settings.mode)}
      />
      <Toggle
        text={"Show type counts"}
        value={settings.type_counts}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "type_counts")
        }
        disabled={[OVERLAY_LOG, OVERLAY_DRAFT].includes(settings.mode)}
      />
      <Toggle
        text={"Show mana curve"}
        value={settings.mana_curve}
        callback={(val: boolean): void =>
          saveOverlaySettings(current, val, "mana_curve")
        }
        disabled={[OVERLAY_LOG, OVERLAY_DRAFT].includes(settings.mode)}
      />
      <div className={css.centered_setting_container}>
        <label style={{ width: "400px" }}>
          {`Elements transparency: ${Math.round(overlayAlpha * 100)}%`}
        </label>
        <Slider
          key={current + "-overlay-alpha-slider"}
          min={0}
          max={1}
          step={0.05}
          value={overlayAlpha}
          onChange={overlayAlphaHandler}
        />
      </div>
      <div className={css.centered_setting_container}>
        <label style={{ width: "400px" }}>
          {`background transparency: ${Math.round(overlayAlphaBack * 100)}%`}
        </label>
        <Slider
          key={current + "-overlay-alpha-back-slider"}
          min={0}
          max={1}
          step={0.05}
          value={overlayAlphaBack}
          onChange={overlayAlphaBackHandler}
        />
      </div>
      <div className={css.settings_note} style={{ textAlign: "center" }}>
        Position: [{settings.bounds.x},{settings.bounds.y}]
      </div>
      <div className={css.settings_note} style={{ textAlign: "center" }}>
        <Button
          text="Reset Position"
          onClick={(): void =>
            saveOverlaySettings(
              current,
              {
                x:
                  defaultConfig.settings.overlays[current].bounds.x +
                  primaryMonitorPos.x,
                y:
                  defaultConfig.settings.overlays[current].bounds.y +
                  primaryMonitorPos.y,
              },
              "bounds"
            )
          }
        />
      </div>
    </>
  ) : (
    <></>
  );
}

export default function SectionOverlay(): JSX.Element {
  const settings = useSelector((state: AppState) => state.settings);
  const currentOverlay = settings.settings_overlay_section;
  const [currentOverlaySettings, setCurrentOverlaySettings] = React.useState(
    settings.overlays[currentOverlay]
  );
  const [overlayScale, setOverlayScale] = React.useState(
    settings.overlay_scale
  );
  const [overlayVolume, setOverlayVolume] = React.useState(
    settings.sound_priority_volume
  );
  const containerRef: React.MutableRefObject<HTMLInputElement | null> = React.useRef(
    null
  );

  const setCurrentOverlay = useCallback((overlay: number) => {
    reduxAction(
      store.dispatch,
      {
        type: "SET_SETTINGS",
        arg: { settings_overlay_section: overlay },
      },
      IPC_ALL ^ IPC_RENDERER
    );
  }, []);

  const [pickerColor, pickerDoShow, pickerElement] = useColorPicker(
    settings.overlay_back_color,
    undefined,
    backgroundColorPicker
  );

  const overlayScaleDebouce = useMemo(() => {
    return _.debounce((value: number) => {
      const oldScale = store.getState().settings.overlay_scale;
      const multiplier = oldScale / value;
      const oldOverlays = store.getState().settings.overlays;
      const newOverlays = oldOverlays.map((o) => {
        return {
          ...o,
          bounds: {
            ...o.bounds,
            x: o.bounds.x * multiplier,
            y: o.bounds.y * multiplier,
          },
        };
      });
      reduxAction(
        store.dispatch,
        {
          type: "SET_SETTINGS",
          arg: { overlay_scale: value, overlays: newOverlays },
        },
        IPC_ALL ^ IPC_RENDERER
      );
    }, 1000);
  }, []);

  const overlayScaleHandler = (value: number): void => {
    setOverlayScale(value);
    overlayScaleDebouce(value);
  };

  const overlayVolumeDebouce = useMemo(() => {
    return _.debounce((value: number) => {
      const sound = new Howl({ src: ["../sounds/blip.mp3"] });
      Howler.volume(value);
      sound.play();

      reduxAction(
        store.dispatch,
        { type: "SET_SETTINGS", arg: { sound_priority_volume: value } },
        IPC_ALL ^ IPC_RENDERER
      );
    }, 1000);
  }, []);

  const overlayVolumeHandler = (value: number): void => {
    setOverlayVolume(value);
    overlayVolumeDebouce(value);
  };

  React.useEffect(() => {
    const oSettings = settings.overlays.filter(
      (_s: any, i: number) => i == currentOverlay
    )[0];
    setCurrentOverlaySettings(oSettings);
  }, [currentOverlay, settings.overlays]);

  React.useEffect(() => {}, [currentOverlaySettings]);

  return (
    <>
      <Button onClick={toggleEditMode} text="Edit Overlay Positions" />

      <div className={css.centered_setting_container}>
        <label style={{ width: "400px" }}>{`UI Scale: ${overlayScale}%`}</label>
        <Slider
          min={10}
          max={200}
          step={10}
          value={settings.overlay_scale}
          onChange={overlayScaleHandler}
        />
      </div>

      <label className={css.centered_setting_container}>
        <span>
          Background color <i>(0,0,0,0 to use default background)</i>:
        </span>
        <input
          onClick={pickerDoShow}
          ref={containerRef}
          style={{ backgroundColor: pickerColor }}
          className={css.color_picker}
          id={css.flat}
          type="text"
          defaultValue=""
        ></input>
      </label>
      {pickerElement}

      <Toggle
        text="Always on top when shown"
        value={settings.overlay_ontop}
        callback={setAlwaysOnTop}
      />

      <Toggle
        text="Show post-match overview"
        value={settings.overlay_overview}
        callback={setOverview}
      />

      <Toggle
        text="Sound when priority changes"
        value={settings.sound_priority}
        callback={setSoundPriority}
      />

      <div className={css.centered_setting_container}>
        <label style={{ width: "400px" }}>
          {`Volume: ${Math.round(overlayVolume * 100)}%`}
        </label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={settings.sound_priority_volume}
          onChange={overlayVolumeHandler}
        />
      </div>

      <div
        className={css.settings_note}
        style={{ margin: "24px auto 0px auto", width: "fit-content" }}
      >
        You can enable up to 5 independent overlay windows. Customize each
        overlay using the settings below.
      </div>

      <OverlaysTopNav current={currentOverlay} setCurrent={setCurrentOverlay} />
      <div className={css.overlay_section}>
        {settings.overlays.map((settings: any, index: number) => {
          return (
            <OverlaySettingsSection
              show={index == currentOverlay}
              key={"overlay-settings-section-" + index}
              current={index}
              settings={settings}
            />
          );
        })}
      </div>
    </>
  );
}
