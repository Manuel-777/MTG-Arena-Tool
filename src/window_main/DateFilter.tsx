import React from "react";
import {
  DATE_ALL_TIME,
  DATE_LAST_30,
  DATE_LAST_DAY,
  DATE_SEASON
} from "../shared/constants";
import ReactSelect from "../shared/ReactSelect";
import { ipcSend, showDatepicker } from "./rendererUtil";

export interface DateFilterProps {
  prefixId: string;
  callback: (option: string) => void;
  className?: string;
  current?: string | Date;
}

const dateOptions = [
  DATE_ALL_TIME,
  DATE_SEASON,
  DATE_LAST_30,
  DATE_LAST_DAY,
  "Custom"
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
  prefixId
}: DateFilterProps): JSX.Element {
  const dateSelectCallback = React.useCallback(
    (filter: string): void => {
      if (filter === "Custom") {
        const lastWeek = new Date();
        lastWeek.setDate(new Date().getDate() - 7);
        showDatepicker(lastWeek, (date: Date) => {
          const filter = date.toISOString();
          callback(filter);
          ipcSend("save_user_settings", { last_date_filter: filter });
        });
      } else {
        callback(filter);
        ipcSend("save_user_settings", {
          last_date_filter: filter,
          skipRefresh: true
        });
      }
    },
    [callback]
  );
  current = current ?? DATE_LAST_30;
  const options = [...dateOptions];
  if (!dateOptions.includes(String(current))) {
    current = customDateFormatter(current);
    options.unshift(current);
  }
  return (
    <div className={className + " dateCont"}>
      <ReactSelect
        className={"filter_panel_select_margin " + prefixId + "_query_date"}
        current={String(current)}
        options={options}
        callback={dateSelectCallback}
        optionFormatter={customDateFormatter}
      />
    </div>
  );
}
