import { useEffect } from "react";
import interact from "interactjs";

const restrictMinSize =
  interact.modifiers &&
  interact.modifiers.restrictSize({
    min: { width: 100, height: 100 }
  });
const cursorChecker: any = (
  action: any,
  interactable: any,
  element: any,
  interacting: boolean
): string => {
  switch (action.axis) {
    case "x":
      return "ew-resize";
    case "y":
      return "ns-resize";
    default:
      return interacting ? "grabbing" : "grab";
  }
};

export function useEditModeOnRef(
  editMode: boolean,
  containerRef: React.MutableRefObject<any>,
  uiScaleFactor: number
): void {
  const restrictDragBounds: any =
    interact.modifiers &&
    interact.modifiers.restrict({
      elementRect: { left: 0, right: 1, top: 0, bottom: 1 } as any
    });
  useEffect(() => {
    const container = containerRef.current;
    if (editMode) {
      if (container) {
        interact(container)
          .draggable({ cursorChecker, modifiers: [restrictDragBounds] })
          .on("dragmove", function(event) {
            const target = event.target;
            const x = parseFloat(target.style.left) + event.dx;
            const y = parseFloat(target.style.top) + event.dy;
            target.style.left = x + "px";
            target.style.top = y + "px";
          })
          .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            modifiers: [restrictMinSize],
            inertia: true
          } as any)
          .on("resizemove", function(event) {
            const target = event.target;
            const x = parseFloat(target.style.left) + event.deltaRect.left;
            const y = parseFloat(target.style.top) + event.deltaRect.top;
            //fix for interact.js adding 4px to height/width on resize
            target.style.width = event.rect.width - 4 + "px";
            target.style.height = event.rect.height - 4 + "px";
            target.style.left = x + "px";
            target.style.top = y + "px";
          });
        return (): void => interact(container).unset();
      }
    }
  });
}

export const getEditModeClass = (editMode: boolean): string =>
  editMode ? "click-on editable" : "click-through";
