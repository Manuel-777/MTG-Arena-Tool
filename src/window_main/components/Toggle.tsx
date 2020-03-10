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
  const { disabled, value, callback, style, containerClassName, text } = props;
  const [currentValue, setCurrentValue] = React.useState(value);

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      if (!disabled) {
        const newValue = event.target.checked;
        callback(newValue);
        setCurrentValue(newValue);
      }
    },
    [callback, disabled]
  );

  const disabledStyle = disabled
    ? {
        cursor: "default",
        color: "var(--color-light-50)"
      }
    : {};

  React.useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  return (
    <label style={style} className={containerClassName ?? "switch-container"}>
      <div style={disabledStyle} className="switch-label">
        {text}
      </div>
      <div className="switch">
        <input type="checkbox" checked={currentValue} onChange={onChange} />
        <span style={disabledStyle} className="switchslider" />
      </div>
    </label>
  );
}
