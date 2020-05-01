import { useSpring, SpringValue } from "react-spring";
import { useDrag } from "react-use-gesture";
import { ReactEventHandlers } from "react-use-gesture/dist/types";
import { useState } from "react";

export default function useResize(
  initialWidth: number,
  callback?: (sz: number) => void
): [SpringValue<number>, (...args: any[]) => ReactEventHandlers] {
  const initialSize = initialWidth;
  const [isDrag, setDrag] = useState(false);
  const [{ width }, set] = useSpring(() => ({ width: initialSize }));
  // Set the drag hook and define component movement based on gesture data
  const bind = useDrag(({ dragging, offset: [mx] }) => {
    set({ width: initialSize + -mx });
    if (isDrag !== dragging && callback) {
      setDrag(dragging);
      callback(initialSize + -mx);
    }
  });

  return [width, bind];
}
