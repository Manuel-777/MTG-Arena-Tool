import React from "react";

interface InputProps {
  label?: string;
  contStyle?: React.CSSProperties;
  value: string;
  placeholder: string;
  autocomplete?: string;
  callback?: (value: string) => void;
  callbackEnter?: (value: string) => void;
}

export default function Input(props: InputProps): JSX.Element {
  const {
    label,
    value,
    contStyle,
    callback,
    callbackEnter,
    placeholder
  } = props;
  const autocomplete = props.autocomplete || "off";

  const callbackHandler = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (callback) {
      callback(e.target.value);
    }
  };

  const keyUpHandler = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.keyCode == 13 && callbackEnter) {
      callbackEnter(e.currentTarget.value);
    }
  };

  const inputInner = (): JSX.Element => {
    return (
      <div style={contStyle || {}} className="input_container">
        <input
          type="text"
          onKeyUp={keyUpHandler}
          onChange={callbackHandler}
          autoComplete={autocomplete}
          placeholder={placeholder}
          value={value}
        />
      </div>
    );
  };

  return (
    <>
      {label ? (
        <label className="but_container_label">
          {label}
          {inputInner()}
        </label>
      ) : (
        inputInner()
      )}
    </>
  );
}
