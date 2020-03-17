/* eslint-disable react/prop-types */
import React, { useState } from "react";

interface SliderPosition {
  text: string;
  hide: boolean;
  color: string;
}

export function sliderPosition(
  text = "",
  hide = false,
  color = "var(--color-light-50)"
): SliderPosition {
  return {
    text: text,
    hide: hide,
    color: color
  };
}

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange: (value: number) => void;
  onInput?: (value: number) => void;
  positions?: SliderPosition[];
  containerStyle?: React.CSSProperties;
}

export default function Slider(props: SliderProps): JSX.Element {
  const { onChange, onInput } = props;
  const min = props.min || 0;
  const max = props.max || 10;
  const step = props.step || 1;
  const [value, setValue] = useState(props.value);

  const stepsNumber = (max - min) / step;
  const posArray: SliderPosition[] =
    props.positions || Array(stepsNumber + 1).fill(sliderPosition());

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = parseFloat(e.currentTarget.value);
    setValue(val);
    if (onChange) {
      onChange(val);
    }
  };

  const handleOnInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = parseFloat(e.currentTarget.value);
    setValue(val);
    if (onInput) {
      onInput(val);
    }
  };

  React.useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  return (
    <div style={{ ...props.containerStyle }} className="slidecontainer">
      <input
        className="slider"
        type="range"
        value={value || 0}
        min={min}
        max={max}
        step={step}
        onChange={handleOnChange}
        onInput={handleOnInput}
      ></input>
      <div className="slider_marks_container_hor">
        {posArray.map((c: SliderPosition, i: number) => {
          return (
            <div className="slider_mark_outer" key={c.text + "-" + i}>
              <div
                className="slider_mark_hor"
                style={{ backgroundColor: c.color, opacity: c.hide ? 0 : 1 }}
              />
              {c.text !== "" ? (
                <div className="slider_mark_text">{c.text}</div>
              ) : (
                <></>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
