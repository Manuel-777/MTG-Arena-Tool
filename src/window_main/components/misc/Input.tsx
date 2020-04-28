import React from "react";

interface InputProps {
  containerClassName?: string;
  label?: React.ReactNode;
  type?: string;
  contStyle?: React.CSSProperties;
  value: string | number;
  placeholder: string;
  title?: string;
  autocomplete?: string;
  callback?: (value: string) => void;
  validate?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function InputBase(
  props: InputProps,
  ref: React.Ref<HTMLInputElement>
): JSX.Element {
  const {
    containerClassName,
    label,
    type,
    value,
    contStyle,
    callback,
    title,
    placeholder
  } = props;
  const [currentValue, setCurrentValue] = React.useState(value + "");
  const autocomplete = props.autocomplete || "off";

  const onChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (props.validate) {
        props.validate(e);
      }
      setCurrentValue(e.target.value);
    },
    []
  );
  const onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.keyCode === 13) {
      (e.target as HTMLInputElement).blur();
    }
  };
  const onBlur = React.useCallback(() => {
    if (callback) {
      callback(currentValue);
    }
  }, [callback, currentValue]);

  const inputInner = (): JSX.Element => {
    return (
      <div
        style={contStyle || {}}
        className={containerClassName || "input_container"}
      >
        <input
          ref={ref}
          type={type || "text"}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
          onChange={onChange}
          autoComplete={autocomplete}
          placeholder={placeholder}
          value={currentValue}
        />
      </div>
    );
  };

  return (
    <>
      {label ? (
        <label className="but_container_label" title={title}>
          {label}
          {inputInner()}
        </label>
      ) : (
        inputInner()
      )}
    </>
  );
}

// https://reactjs.org/docs/forwarding-refs.html
const Input = React.forwardRef(InputBase);
export default Input;
