import React, { useState, useCallback, useMemo } from "react";
import DayPicker from "react-day-picker";

import pickerCss from "react-day-picker/lib/style.css";
import popupCss from "../components/popups/popups.css";
import css from "./DatePicker.scss";

// The wizardy contained in our webpack build will generate a proper
// style.css.d.ts for the default css in react-day-picker's module folder.
// Its a little of a bummer to type each class here but it works.
const pickerClasses = {
  container: css.selectable,
  day: css.dayPickerDay, // + " " + css.dayPickerDay,
  wrapper: pickerCss.dayPickerWrapper,
  interactionDisabled: pickerCss.dayPickerInteractionDisabled,
  navBar: "",
  navButtonPrev: pickerCss.dayPickerNavButtonPrev,
  navButtonNext: pickerCss.dayPickerNavButtonNext,
  navButtonInteractionDisabled: pickerCss.dayPickerInteractionDisabled,

  months: pickerCss.dayPickerMonths,
  month: pickerCss.dayPickerMonth,
  caption: pickerCss.dayPickerCaption,
  weekdays: pickerCss.dayPickerWeekdays,
  weekdaysRow: pickerCss.dayPickerWeekdaysRow,
  weekday: pickerCss.dayPickerWeekday,
  weekNumber: pickerCss.dayPickerWeekNumber,
  body: pickerCss.dayPickerBody,
  week: pickerCss.dayPickerWeek,
  footer: pickerCss.dayPickerFooter,
  todayButton: pickerCss.dayPickerTodayButton,

  today: pickerCss.dayPickerDayToday,
  selected: css.modifierSelected,
  disabled: pickerCss.dayPickerDayDisabled,
  outside: pickerCss.dayPickerDayOutside,
};

export default function useDatePicker(
  initialDateFrom: Date,
  editCallback?: (range: Date) => void,
  closeCallback?: (range: Date) => void
): [Date, () => void, JSX.Element] {
  const initState = useMemo(() => {
    return {
      from: initialDateFrom,
      to: new Date(),
    };
  }, [initialDateFrom]);

  const [range, setRange] = useState(initState);
  const [show, setShow] = useState(false);

  const handleClose = useCallback(
    (e) => {
      e.stopPropagation();
      setShow(false);
      if (closeCallback) {
        closeCallback(range.from);
      }
    },
    [closeCallback, range]
  );

  const handleDayClick = useCallback(
    (day: Date): void => {
      const r = { from: day, to: new Date() };
      setRange(r);
      if (editCallback) {
        editCallback(r.from);
      }
    },
    [editCallback]
  );

  const handleResetClick = useCallback((): void => {
    setRange(initState);
  }, [initState]);

  const modifiers = useMemo(() => {
    return {
      [css.modifierStart]: range.from,
      [css.modifierEnd]: new Date(),
    };
  }, [range]);

  const doShow = useCallback(() => {
    setShow(true);
  }, []);

  const elem = useMemo((): JSX.Element => {
    return show ? (
      <div className={popupCss.pickerBackground} onClick={handleClose}>
        <div
          className={popupCss.pickerDiv}
          style={{
            fontFamily: "var(--main-font-name)",
            textAlign: "center",
            backgroundColor: "white",
            borderRadius: "4px",
            color: "black",
          }}
          onClick={(e): void => {
            e.stopPropagation();
          }}
        >
          <div className="date-range">
            <p>
              {!range.from && "Please select the first day."}
              {range.from &&
                `Selected from ${range.from.toLocaleDateString()} to
                ${new Date().toLocaleDateString()}`}{" "}
              {range.from && range.to && (
                <button className="link" onClick={handleResetClick}>
                  Reset
                </button>
              )}
            </p>
            <DayPicker
              classNames={pickerClasses}
              numberOfMonths={2}
              selectedDays={[range.from, { from: range.from, to: new Date() }]}
              modifiers={modifiers}
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      </div>
    ) : (
      <></>
    );
  }, [modifiers, show, handleClose, handleResetClick, handleDayClick, range]);

  return [range.from, doShow, elem];
}
