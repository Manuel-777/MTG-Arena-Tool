import React, { useCallback } from "react";
import ReactSelect from "../shared/ReactSelect";
import { reduxAction } from "../shared/redux/sharedRedux";
import { useDispatch } from "react-redux";
import useDatePicker from "./hooks/useDatePicker";
import { constants } from "mtgatool-shared";

import indexCss from "./index.css";

const {
  DATE_ALL_TIME,
  DATE_LAST_30,
  DATE_LAST_7,
  DATE_LAST_DAY,
  DATE_SEASON,
  IPC_ALL,
  IPC_RENDERER,
} = constants;

interface DateFilterProps {
  prefixId: string;
  callback: (option: string) => void;
  className?: string;
  current?: string | Date;
}

const dateOptions = [
  DATE_ALL_TIME,
  DATE_SEASON,
  DATE_LAST_30,
  DATE_LAST_7,
  DATE_LAST_DAY,
  "Custom",
];

function customDateFormatter(filter: Date | string): string {
  if (typeof filter === "string") {
    return filter;
  }
  return `Since ${filter.toDateString()}`;
}

export default function DateFilter({
  callback,
  className,
  current,
}: DateFilterProps): JSX.Element {
  const dispatch = useDispatch();

  const closeDatePicker = useCallback(
    (from: Date) => {
      const filter = from.toISOString();
      callback(filter);
      reduxAction(
        dispatch,
        { type: "SET_SETTINGS", arg: { last_date_filter: filter } },
        IPC_ALL ^ IPC_RENDERER
      );
    },
    [callback, dispatch]
  );

  const lastWeek = new Date();
  lastWeek.setDate(new Date().getDate() - 7);
  const [, pickerDoShow, pickerElement] = useDatePicker(
    lastWeek,
    undefined,
    closeDatePicker
  );

  const dateSelectCallback = React.useCallback(
    (filter: string): void => {
      if (filter === "Custom") {
        pickerDoShow();
      } else {
        callback(filter);
        reduxAction(
          dispatch,
          { type: "SET_SETTINGS", arg: { last_date_filter: filter } },
          IPC_ALL ^ IPC_RENDERER
        );
      }
    },
    [callback, pickerDoShow, dispatch]
  );
  current = current ?? DATE_LAST_30;
  const options = [...dateOptions];
  if (!dateOptions.includes(String(current))) {
    current = customDateFormatter(current);
    options.unshift(current);
  }
  return (
    <>
      {pickerElement}
      <ReactSelect<string>
        className={`${className} ${indexCss.filter_panel_select_margin}`}
        current={String(current)}
        options={options}
        callback={dateSelectCallback}
        optionFormatter={customDateFormatter}
      />
    </>
  );
}
