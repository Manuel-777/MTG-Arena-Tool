import React, { useState, useCallback, useMemo } from "react";
import { ChromePicker } from "react-color";

const decimalToHex = (alpha: number): string =>
  alpha === 0
    ? ""
    : Math.round(255 * alpha)
        .toString(16)
        .padStart(2, "0");

export default function useColorPicker(
  backgroundColor: string,
  editCallback?: (color: string) => void,
  closeCallback?: (color: string) => void
): [string, () => void, JSX.Element] {
  const [color, setColor] = useState(backgroundColor);
  const [show, setShow] = useState(false);

  const handleClose = useCallback(
    e => {
      e.stopPropagation();
      setShow(false);
      if (closeCallback) {
        closeCallback(color);
      }
    },
    [closeCallback, color]
  );

  const handleOnChange = useCallback(
    (color: any) => {
      // Required hack to update the alpha slider.
      // This should be fixed in v3.0.0 if react-color:
      // https://github.com/casesandberg/react-color/issues/655
      const newHex = `${color.hex}${decimalToHex(color.rgb.a)}`;
      setColor(newHex);
      if (editCallback) {
        editCallback(newHex);
      }
    },
    [editCallback]
  );

  const doShow = useCallback(() => {
    setShow(true);
  }, []);

  const elem = useMemo((): JSX.Element => {
    return show ? (
      <div className="picker-background" onClick={handleClose}>
        <div
          className="picker-div"
          onClick={(e): void => {
            e.stopPropagation();
          }}
        >
          <ChromePicker color={color} onChange={handleOnChange} />
        </div>
      </div>
    ) : (
      <></>
    );
  }, [show, color, handleClose, handleOnChange]);

  return [color, doShow, elem];
}
