import React from "react";
import { showColorpicker } from "../renderer-util";

export default function useColorpicker(
  containerRef: React.MutableRefObject<HTMLElement | null>,
  backgroundColor: string,
  editCallback: (color: string) => void,
  pickerOptions?: any
): (e: React.MouseEvent) => void {
  return (e): void => {
    e.stopPropagation();
    showColorpicker(
      backgroundColor,
      (color: { rgbaString: string }) => {
        const container = containerRef.current;
        if (container) {
          container.style.backgroundColor = color.rgbaString;
        }
      },
      (color: { rgbaString: string }) => editCallback(color.rgbaString),
      () => {
        const container = containerRef.current;
        if (container) {
          container.style.backgroundColor = backgroundColor;
        }
      },
      pickerOptions || {}
    );
  };
}
