import React from "react";
import Autosuggest, { InputProps } from "react-autosuggest";
import { TagCount } from "./types";

const getSuggestions = (value: string, options: TagCount[]): TagCount[] => {
  const inputValue = value.trim().toLowerCase();
  const inputLength = inputValue.length;
  return inputLength === 0
    ? []
    : options.filter(
        lang => lang.tag.toLowerCase().slice(0, inputLength) === inputValue
      );
};

const getSuggestionValue = (suggestion: TagCount): string => suggestion.tag;

const SuggestionItem = (suggestion: TagCount): JSX.Element => (
  <button
    className={"button_reset select_option"}
    style={{ padding: 0, height: "20px" }}
  >
    {suggestion.tag} ({suggestion.q})
  </button>
);

const setCellWrapperOverflow = (
  input: HTMLInputElement,
  overflow: string
): void => {
  const cellWrapper =
    input.parentElement?.parentElement?.parentElement?.parentElement
      ?.parentElement;
  if (
    cellWrapper &&
    [...((cellWrapper?.classList as unknown) as string[])].includes("inner_div")
  ) {
    cellWrapper.style.overflow = overflow;
  }
};

const onFocus = (e: React.FocusEvent<HTMLElement>): void => {
  const input = e.target as HTMLInputElement;
  input.style.minWidth = "80px";
  setCellWrapperOverflow(input, "visible");
};

const onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  const input = e.target as HTMLInputElement;
  if (e.keyCode === 13) {
    input.blur();
    e.stopPropagation();
  } else {
    setTimeout(() => {
      input.style.width = Math.min(input.value.length * 8, 180) + "px";
    }, 10);
  }
};

export default function AutosuggestInput({
  id,
  initialValue,
  placeholder,
  submitCallback,
  tags
}: {
  id: string;
  initialValue?: string;
  placeholder?: string;
  submitCallback: (value: string) => void;
  tags: TagCount[];
}): JSX.Element {
  const [value, setValue] = React.useState(initialValue ?? "");
  const [suggestions, setSuggestions] = React.useState([] as TagCount[]);
  const onChange = React.useCallback(
    (event: unknown, { newValue }: { newValue: string }): void =>
      setValue(newValue),
    []
  );
  const onSuggestionsFetchRequested = React.useCallback(
    ({ value }: { value: string }): void =>
      setSuggestions(getSuggestions(value, tags)),
    [tags]
  );
  const onSuggestionsClearRequested = React.useCallback(
    (): void => setSuggestions([]),
    []
  );
  const onSuggestionSelected = React.useCallback(
    (event, { suggestionValue, method }): void => {
      if (method === "click") {
        submitCallback(suggestionValue);
        setValue(initialValue ?? "");
      }
    },
    [initialValue, submitCallback]
  );
  const onBlur = React.useCallback(
    (
      e: React.FocusEvent<HTMLElement>,
      { highlightedSuggestion }: { highlightedSuggestion: TagCount }
    ): void => {
      const input = e.target as HTMLInputElement;
      const val = highlightedSuggestion
        ? highlightedSuggestion.tag
        : input.value;
      if (val && val !== placeholder) {
        submitCallback(val);
        setValue(initialValue ?? "");
      }
      input.value = "";
      setCellWrapperOverflow(input, "");
    },
    [initialValue, placeholder, submitCallback]
  );
  const inputProps: InputProps<TagCount> = {
    autoComplete: "off",
    onBlur,
    onChange,
    onKeyUp,
    placeholder: placeholder ?? "enter value",
    size: 1,
    value
  };
  return (
    <div onFocus={onFocus} style={{ paddingLeft: "10px" }}>
      <Autosuggest
        id={id}
        suggestions={suggestions}
        onSuggestionsFetchRequested={onSuggestionsFetchRequested}
        onSuggestionsClearRequested={onSuggestionsClearRequested}
        onSuggestionSelected={onSuggestionSelected}
        getSuggestionValue={getSuggestionValue}
        renderSuggestion={SuggestionItem}
        inputProps={inputProps}
      />
    </div>
  );
}
