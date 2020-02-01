import React from "react";

interface InputProps {
  label: string;
  value: string;
  placeholder: string;
  autocomplete?: string;
  callback: (value: string) => void;
}

export default function Inpu(props: InputProps): JSX.Element {
  const { label, value, callback, placeholder } = props;
  const autocomplete = props.autocomplete || "off";

  return (
    <label className="but_container_label">
      {label}
      <div className="input_container">
        <input
          type="text"
          autoComplete={autocomplete}
          placeholder={placeholder}
          value={value}
        />
      </div>
    </label>
  );
}
