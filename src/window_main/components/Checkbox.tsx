import React from "react";

interface CheckboxProps {
  text: string;
  value: boolean;
  callback: (value: boolean) => void;
  disabled?: boolean;
}

export default function Checkbox(props: CheckboxProps): JSX.Element {
  const { disabled, value, callback } = props;

  const click = (): void => {
    if (!disabled) {
      callback(!value);
    }
  };

  const disabledLabelStyle = {
    cursor: "default",
    opacity: 0.4
  };

  return (
    <label
      style={disabled ? disabledLabelStyle : {}}
      onClick={click}
      className={"check_container" + (disabled ? "" : " hover_label")}
    >
      {props.text}
      <input type="checkbox" checked={value} disabled />
      <span className="checkmark" />
    </label>
  );
}
