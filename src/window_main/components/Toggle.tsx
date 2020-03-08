import React from "react";

interface SwitchProps {
  text: string | JSX.Element;
  containerClassName?: string;
  value: boolean;
  callback: (value: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function Switch(props: SwitchProps): JSX.Element {
  const { disabled, value, callback, style, containerClassName } = props;
  const [currentValue, setCurrentValue] = React.useState(value);

  const click = (
    e: React.MouseEvent<HTMLDivElement | HTMLLabelElement>
  ): void => {
    e.stopPropagation();
    if (!disabled) {
      callback(!currentValue);
      setCurrentValue(!currentValue);
    }
  };

  const disabledStyle = {
    ...style,
    cursor: "default",
    color: "var(--color-light-50)"
  };

  React.useEffect(() => {
    setCurrentValue(props.value);
  }, [props.value]);

  return (
    <div
      style={{ ...style }}
      className={containerClassName || "switch-container"}
    >
      <div
        style={disabled ? disabledStyle : {}}
        className="switch-label"
        onClick={click}
      >
        {props.text}
      </div>
      <label className="switch" onClick={click}>
        <input type="checkbox" checked={currentValue} />
        <span style={disabled ? disabledStyle : {}} className="switchslider" />
      </label>
    </div>
  );
}
