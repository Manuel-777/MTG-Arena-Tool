import React from "react";

interface InputProps {
  label?: string;
  contStyle?: React.CSSProperties;
  value: string;
  placeholder: string;
  autocomplete?: string;
  callback: (value: string) => void;
}

export default function Input(props: InputProps): JSX.Element {
  const { label, value, contStyle, callback, placeholder } = props;
  const autocomplete = props.autocomplete || "off";

  const inputInner = (): JSX.Element => {
    return (
      <div style={contStyle || {}} className="input_container">
        <input
          type="text"
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
