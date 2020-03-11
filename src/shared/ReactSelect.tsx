import React from "react";

export interface ReactSelectProps {
  optionFormatter?: (option: string) => string | JSX.Element;
  current: string;
  callback: (option: string) => void;
  options: any[];
  className?: string;
  style?: React.CSSProperties;
}

export default function ReactSelect({
  optionFormatter,
  current,
  callback,
  options,
  className,
  style
}: ReactSelectProps): JSX.Element {
  const formatterFunc =
    typeof optionFormatter === "function"
      ? optionFormatter
      : (inString: string): string => inString;

  const [currentOption, setCurrentOption] = React.useState(current);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  React.useEffect(() => setCurrentOption(current), [current]);

  const onClickSelect = React.useCallback(() => {
    setOptionsOpen(!optionsOpen);
  }, [optionsOpen]);

  const onClickOption = React.useCallback(
    event => {
      setCurrentOption(event.currentTarget.value);
      setOptionsOpen(false);
      callback && callback(event.currentTarget.value);
    },
    [callback]
  );

  const buttonClassNames =
    "button_reset select_button" + (optionsOpen ? " active" : "");

  return (
    <div className={"select_container " + className} style={style}>
      <button
        key={currentOption}
        className={buttonClassNames}
        onClick={onClickSelect}
      >
        {formatterFunc(currentOption)}
      </button>
      {optionsOpen && (
        <div className={"select_options_container"}>
          {options.map(option => {
            return typeof option == "string" && option.startsWith("%%") ? (
              <div className="select_title" key={option}>
                {option.replace("%%", "")}
              </div>
            ) : (
              <button
                className={"button_reset select_option"}
                key={option}
                value={option}
                disabled={option == currentOption}
                onClick={onClickOption}
              >
                {formatterFunc(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
