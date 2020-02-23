import React from "react";

interface CheckboxProps {
  text: string | JSX.Element;
  value: boolean;
  callback: (value: boolean) => void;
  disabled?: boolean;
}

export default function Checkbox(props: CheckboxProps): JSX.Element {
  const { disabled, value, callback } = props;
  const [currentValue, setCurrentValue] = React.useState(value);

  const click = (): void => {
    if (!disabled) {
      callback(!currentValue);
      setCurrentValue(!currentValue);
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
      <input type="checkbox" checked={currentValue} disabled />
      <span className="checkmark" />
    </label>
  );
}
