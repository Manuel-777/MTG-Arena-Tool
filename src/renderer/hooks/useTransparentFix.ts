import { useCallback, useLayoutEffect, useRef } from "react";
import { remote } from "electron";
import css from "../../overlay/index.css";

// eslint-disable-next-line import/no-unused-modules
export default function useTransparentFix(debug?: boolean): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const doMouseFix = useCallback((event) => {
    const { setIgnoreMouseEvents } = remote.getCurrentWindow();

    const target = event.target as HTMLElement;
    if (debug) console.log(target.id, target.classList, event);
    if (
      target?.classList?.contains(css.clickThrough) ||
      target?.tagName == "HTML" ||
      target?.id == "root" ||
      target?.id == "container"
    ) {
      setIgnoreMouseEvents(true, { forward: true });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      setIgnoreMouseEvents(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unmount this! very importante
  useLayoutEffect(() => {
    console.warn("useLayoutEffect");
    window.addEventListener("mousemove", doMouseFix);
    return (): void => window.removeEventListener("mousemove", doMouseFix);
  }, [doMouseFix]);
}
