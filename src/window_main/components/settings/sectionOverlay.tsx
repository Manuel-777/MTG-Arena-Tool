/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import Button from "../Button";
import { ipcSend, showColorpicker } from "../../renderer-util";
import pd from "../../../shared/player-data";
import Checkbox from "../Checkbox";
import Slider from "../Slider";
import _ from "lodash";

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

export default function SectionOverlay(): JSX.Element {
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
    </>
  );
}
