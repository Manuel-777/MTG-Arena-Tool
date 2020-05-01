import { useSpring, SpringValue } from "react-spring";
import { useDrag } from "react-use-gesture";
import { ReactEventHandlers } from "react-use-gesture/dist/types";

export default function useResize(
  initialWidth: number
): [SpringValue<number>, (...args: any[]) => ReactEventHandlers] {
  const initialSize = initialWidth;
  const [{ width }, set] = useSpring(() => ({ width: initialSize }));
  // Set the drag hook and define component movement based on gesture data
  const bind = useDrag(({ offset: [mx] }) => {
    set({ width: initialSize + -mx });
  });

  return [width, bind];
}
