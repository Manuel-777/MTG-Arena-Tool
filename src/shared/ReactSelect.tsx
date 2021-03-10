import React, { useRef } from "react";
import useOutsideClick from "../renderer/hooks/useClickOutside";
import indexCss from "../renderer/index.css";
import css from "../renderer/select.scss";

interface ReactSelectProps<K> {
  optionFormatter?: (option: K | string) => string | JSX.Element;
  current: K;
  callback: (option: K) => void;
  options: K[];
  className?: string;
  style?: React.CSSProperties;
}

export default function ReactSelect<K>({
  optionFormatter,
  current,
  callback,
  options,
  className,
  style,
}: ReactSelectProps<K>): JSX.Element {
  const formatterFunc =
    typeof optionFormatter === "function"
      ? optionFormatter
      : (inString: string | K): string | K => inString;

  const containerRef = useRef<HTMLDivElement>(null);
  const [currentOption, setCurrentOption] = React.useState<K>(current);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  React.useEffect(() => setCurrentOption(current), [current]);

  const onClickSelect = React.useCallback(() => {
    setOptionsOpen(!optionsOpen);
  }, [optionsOpen]);

  const onClickOption = React.useCallback(
    (event) => {
      setCurrentOption(event.currentTarget.value);
      setOptionsOpen(false);
      callback && callback(event.currentTarget.value);
    },
    [callback]
  );

  const buttonClassNames = `${indexCss.buttonReset} ${css.selectButton} ${
    optionsOpen ? css.active : ""
  }`;

  useOutsideClick(containerRef, () => setOptionsOpen(false));

  return (
    <div
      ref={containerRef}
      className={`${css.selectContainer} ${className}`}
      style={style}
    >
      <button
        key={currentOption + "-key"}
        className={buttonClassNames}
        onClick={onClickSelect}
      >
        {formatterFunc(currentOption)}
      </button>
      {optionsOpen && (
        <div className={css.selectOptionsContainer}>
          {options.map((option) => {
            return typeof option == "string" && option.startsWith("%%") ? (
              <div className={css.selectTitle} key={option}>
                {option.replace("%%", "")}
              </div>
            ) : (
              <button
                className={`${indexCss.buttonReset} ${css.selectOption}`}
                key={option + "-key"}
                value={option + ""}
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
