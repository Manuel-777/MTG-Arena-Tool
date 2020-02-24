/* eslint-disable react/prop-types */
import React, { useState } from "react";

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange: (value: number) => void;
  onInput?: (value: number) => void;
}

export default function Slider(props: SliderProps): JSX.Element {
  const { onChange, onInput } = props;
  const min = props.min || 0;
  const max = props.max || 10;
  const step = props.step || 1;
  const [value, setValue] = useState(props.value);

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

  const stepsNumber = (max - min) / step;

  React.useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  return (
    <div className="slidecontainer">
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
        {" "
          .repeat(stepsNumber + 1)
          .split("")
          // just a hack to get an array of length N to map as marks
          .map((c: string, i: number) => {
            return <div key={i} className="slider_mark_hor" />;
          })}
      </div>
    </div>
  );
}
