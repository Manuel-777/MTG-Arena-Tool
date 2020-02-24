import * as React from "react";

export interface ReactSelectProps {
  optionFormatter?: (option: string) => string | JSX.Element;
  current: string;
  callback: (option: string) => void;
  options: any[];
}

export function ReactSelect(props: ReactSelectProps): JSX.Element {
  const formatterFunc =
    typeof props.optionFormatter === "function"
      ? props.optionFormatter
      : (inString: string): string => inString;

  const [currentOption, setCurrentOption] = React.useState(props.current);
  const [optionsOpen, setOptionsOpen] = React.useState(false);

  const onClickSelect = React.useCallback(() => {
    setOptionsOpen(!optionsOpen);
  }, [optionsOpen]);

  const onClickOption = React.useCallback(
    event => {
      setCurrentOption(event.currentTarget.value);
      setOptionsOpen(!optionsOpen);
      props.callback && props.callback(event.currentTarget.value);
    },
    [optionsOpen, props]
  );

  const buttonClassNames =
    "button_reset select_button" + (optionsOpen ? " active" : "");

  return (
    <>
      <button
        key={currentOption}
        className={buttonClassNames}
        onClick={onClickSelect}
      >
        {formatterFunc(currentOption)}
      </button>
      {optionsOpen && (
        <div className={"select_options_container"}>
          {props.options
            .filter(option => option !== currentOption)
            .map(option => {
              return (
                <button
                  className={"button_reset select_option"}
                  key={option}
                  value={option}
                  onClick={onClickOption}
                >
                  {formatterFunc(option)}
                </button>
              );
            })}
        </div>
      )}
    </>
  );
}

export interface WrappedReactSelectProps extends ReactSelectProps {
  className?: string;
  style?: React.CSSProperties;
}

// This is essentially what createSelect does, but reacty.
// This should go away once createSelect goes away and is replaced by just ReactSelect.
export function WrappedReactSelect(
  props: WrappedReactSelectProps
): JSX.Element {
  const { className, style, ...other } = props;
  return (
    <div className={"select_container " + className} style={style}>
      <ReactSelect {...other} />
    </div>
  );
}
