/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Button from "../Button";
import { ipcSend, showColorpicker } from "../../renderer-util";
import pd from "../../../shared/player-data";
import Checkbox from "../Checkbox";
import Slider from "../Slider";
import _ from "lodash";
import {
  COLORS_ALL,
  OVERLAY_DRAFT,
  OVERLAY_LEFT,
  OVERLAY_LOG,
  OVERLAY_ODDS,
  OVERLAY_SEEN,
  OVERLAY_MIXED,
  OVERLAY_DRAFT_BREW,
  OVERLAY_FULL,
  OVERLAY_DRAFT_MODES
} from "../../../shared/constants";
import { ReactSelect } from "../../../shared/ReactSelect";

function toggleEditMode(): void {
  ipcSend("toggle_edit_mode");
}

function backgroundColorPicker(color: string): void {
  ipcSend("save_user_settings", { overlay_back_color: color });
}

// taken from Display.ts
// the difference is this one does not use tag as a
// prop and has a reusable callback.
// Should probably add ../../hooks directory for these?
function useColorpicker(
  containerRef: React.MutableRefObject<HTMLElement | null>,
  backgroundColor: string,
  editCallback: (color: string) => void,
  pickerOptions?: any
): (e: React.MouseEvent) => void {
  return (e): void => {
    e.stopPropagation();
    showColorpicker(
      backgroundColor,
      (color: { rgbString: string }) => {
        const container = containerRef.current;
        if (container) {
          container.style.backgroundColor = color.rgbString;
        }
      },
      (color: { rgbString: string }) => editCallback(color.rgbString),
      () => {
        const container = containerRef.current;
        if (container) {
          container.style.backgroundColor = backgroundColor;
        }
      },
      pickerOptions || {}
    );
  };
}

function setAlwaysOnTop(checked: boolean): void {
  ipcSend("save_user_settings", {
    overlay_ontop: checked
  });
}

function setSoundPriority(checked: boolean): void {
  ipcSend("save_user_settings", {
    sound_priority: checked
  });
}

interface OverlaysTopNavProps {
  current: number;
  setCurrent: React.Dispatch<React.SetStateAction<number>>;
}

function OverlaysTopNav(props: OverlaysTopNavProps): JSX.Element {
  const overlays = [0, 1, 2, 3, 4];
  return (
    <div className="top_nav_icons">
      {overlays.map((id: number) => {
        return (
          <div
            onClick={(): void => {
              props.setCurrent(id);
            }}
            key={id}
            style={{ maxWidth: "160px", display: "flex" }}
            className={
              "overlay_settings_nav top_nav_item" +
              (props.current == id ? " item_selected" : "")
            }
          >
            <div
              style={{
                backgroundColor: `var(--color-${COLORS_ALL[id]})`,
                flexShrink: 0
              }}
              className="overlay_icon"
            ></div>
            <div className="overlay_label">{"Overlay " + (id + 1)}</div>
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

function alphaFromTransparency(transparency: number): number {
  return 1 - transparency / 100;
}

function transparencyFromAlpha(alpha: number): number {
  return Math.round((1 - alpha) * 100);
}

interface SectionProps {
  settings: any;
  current: number;
}

function OverlaySettingsSection(props: SectionProps): JSX.Element {
  const { current, settings } = props;

  const [overlayAlpha, setOverlayAlpha] = React.useState(
    settings ? settings.alpha : 0
  );

  const overlayAlphaDebouce = React.useCallback(
    _.debounce((value: number) => {
      const { Howl, Howler } = require("howler");
      const sound = new Howl({ src: ["../sounds/blip.mp3"] });
      Howler.volume(value);
      sound.play();

      ipcSend("save_user_settings", {
        sound_priority_volume: value
      });
    }, 1000),
    []
  );

  const overlayAlphaHandler = (value: number): void => {
    setOverlayAlpha(value);
    overlayAlphaDebouce(value);
  };

  function setOverlayMode(filter: string): void {
    ipcSend("save_overlay_settings", {
      current,
      mode: modeOptions.indexOf(filter)
    });
  }

  function overlayShowAlways(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      show_always: val
    });
  }

  function overlayShowTop(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      top: val
    });
  }

  function overlayShowTitle(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      title: val
    });
  }

  function overlayShowDeck(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      deck: val
    });
  }

  function overlayShowSideboard(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      sideboard: val
    });
  }

  function overlayShowLands(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      lands: val
    });
  }

  function overlayShowClock(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      clock: val
    });
  }

  function overlayShowOdds(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      draw_odds: val
    });
  }

  function overlayShowHoverCards(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      cards_overlay: val
    });
  }

  function overlayShowTypeCounts(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      type_counts: val
    });
  }

  function overlayShowManaCurve(val: boolean): void {
    ipcSend("save_overlay_settings", {
      current,
      mana_curve: val
    });
  }

  return settings ? (
    <>
      <label className="but_container_label">
        Mode:
        <ReactSelect
          style={{ width: "180px", marginLeft: "32px" }}
          options={modeOptions}
          current={modeOptions[settings.mode]}
          callback={setOverlayMode}
        />
      </label>
      <div className="settings_note">
        <p>
          <i>{modeHelp[settings.mode]}</i>
        </p>
      </div>
      <Checkbox
        text={"Always show overlay"}
        value={settings.show_always}
        callback={overlayShowAlways}
      />
      <div className="settings_note" style={{ paddingLeft: "35px" }}>
        <p>
          <i>
            Displays the overlay regardless of Arena match or draft status
            (&quotEnable Overlay&quot must also be checked). To adjust overlay
            position, click on its colored icon in the top left to toggle edit
            mode.
          </i>
        </p>
      </div>
      <Checkbox
        text={"Show top bar"}
        value={settings.top}
        callback={overlayShowTop}
      />
      <Checkbox
        text={"Show title"}
        value={settings.title}
        callback={overlayShowTitle}
        disabled={settings.mode === OVERLAY_DRAFT}
      />
      <Checkbox
        text={"Show deck/lists"}
        value={settings.deck}
        callback={overlayShowDeck}
        disabled={settings.mode === OVERLAY_DRAFT}
      />
      <Checkbox
        text={"Show sideboard"}
        value={settings.sideboard}
        callback={overlayShowSideboard}
        disabled={
          ![OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
            settings.mode
          )
        }
      />
      <Checkbox
        text={"Compact lands"}
        value={settings.lands}
        callback={overlayShowLands}
        disabled={
          ![OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
            settings.mode
          )
        }
      />
      <Checkbox
        text={"Show clock"}
        value={settings.clock}
        callback={overlayShowClock}
        disabled={OVERLAY_DRAFT_MODES.includes(settings.mode)}
      />
      <Checkbox
        text={"Show odds"}
        value={settings.draw_odds}
        callback={overlayShowOdds}
        disabled={[
          OVERLAY_FULL,
          OVERLAY_LEFT,
          OVERLAY_SEEN,
          OVERLAY_DRAFT,
          OVERLAY_LOG,
          OVERLAY_DRAFT_BREW
        ].includes(settings.mode)}
      />
      <Checkbox
        text={"Show hover cards"}
        value={settings.cards_overlay}
        callback={overlayShowHoverCards}
      />
      <Checkbox
        text={"Show type counts"}
        value={settings.type_counts}
        callback={overlayShowTypeCounts}
        disabled={[OVERLAY_LOG, OVERLAY_DRAFT].includes(settings.mode)}
      />
      <Checkbox
        text={"Show mana curve"}
        value={settings.mana_curve}
        callback={overlayShowManaCurve}
        disabled={[OVERLAY_LOG, OVERLAY_DRAFT].includes(settings.mode)}
      />
      <div className="slidecontainer_settings">
        <label style={{ width: "400px" }} className="card_size_container">
          {`Elements transparency: ${alphaFromTransparency(overlayAlpha)}%`}
        </label>
        <Slider
          min={0}
          max={100}
          step={5}
          value={alphaFromTransparency(settings.alpha)}
          onInput={overlayAlphaHandler}
        />
      </div>
    </>
  ) : (
    <></>
  );
}

export default function SectionOverlay(): JSX.Element {
  const [currentOverlay, setCurrentOverlay] = React.useState(0);
  const [overlayScale, setOverlayScale] = React.useState(
    pd.settings.overlay_scale
  );
  const [overlayVolume, setOverlayVolume] = React.useState(
    pd.settings.sound_priority_volume
  );
  const containerRef: React.MutableRefObject<HTMLInputElement | null> = React.useRef(
    null
  );
  const colorPicker = useColorpicker(
    containerRef,
    pd.settings.overlay_back_color,
    backgroundColorPicker,
    { alpha: true }
  );

  const overlayScaleDebouce = React.useCallback(
    _.debounce((value: number) => {
      ipcSend("save_user_settings", {
        overlay_scale: value
      });
    }, 1000),
    []
  );

  const overlayScaleHandler = (value: number): void => {
    setOverlayScale(value);
    overlayScaleDebouce(value);
  };

  const overlayVolumeDebouce = React.useCallback(
    _.debounce((value: number) => {
      const { Howl, Howler } = require("howler");
      const sound = new Howl({ src: ["../sounds/blip.mp3"] });
      Howler.volume(value);
      sound.play();

      ipcSend("save_user_settings", {
        sound_priority_volume: value
      });
    }, 1000),
    []
  );

  const overlayVolumeHandler = (value: number): void => {
    setOverlayVolume(value);
    overlayVolumeDebouce(value);
  };

  return (
    <>
      <Button onClick={toggleEditMode} text="Edit Overlay Positions" />

      <div className="slidecontainer_settings">
        <label style={{ width: "400px" }} className="card_size_container">
          {`UI Scale: ${overlayScale}%`}
        </label>
        <Slider
          min={10}
          max={200}
          step={10}
          value={pd.settings.overlay_scale}
          onInput={overlayScaleHandler}
        />
      </div>

      <label className="but_container_label">
        <span style={{ marginRight: "32px" }}>
          Background color <i>(0,0,0,0 to use default background)</i>:
        </span>
        <input
          onClick={colorPicker}
          ref={containerRef}
          style={{ backgroundColor: pd.settings.overlay_back_color }}
          className="color_picker"
          id="flat"
          type="text"
          value=""
        ></input>
      </label>

      <Checkbox
        text="Always on top when shown"
        value={pd.settings.overlay_ontop}
        callback={setAlwaysOnTop}
      />

      <Checkbox
        text="Sound when priority changes"
        value={pd.settings.sound_priority}
        callback={setSoundPriority}
      />

      <div className="slidecontainer_settings">
        <label style={{ width: "400px" }} className="card_size_container">
          {`Volume: ${Math.round(overlayVolume * 100)}%`}
        </label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={pd.settings.sound_priority_volume}
          onInput={overlayVolumeHandler}
        />
      </div>

      <div className="settings_note" style={{ margin: "24px 64px 0px 16px" }}>
        You can enable up to 5 independent overlay windows. Customize each
        overlay using the settings below.
      </div>

      <OverlaysTopNav current={currentOverlay} setCurrent={setCurrentOverlay} />
      <div className="overlay_section">
        {pd.settings.overlays.map((settings: any, index: number) => {
          if (index == currentOverlay) {
            return (
              <OverlaySettingsSection
                key={index}
                settings={settings}
                current={currentOverlay}
              />
            );
          }
        })}
      </div>
    </>
  );
}
