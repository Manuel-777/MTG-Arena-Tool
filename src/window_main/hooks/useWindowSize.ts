import { useState, useEffect, useCallback } from "react";

interface Size {
  width: number | undefined;
  height: number | undefined;
}

export default function useWindowSize(): Size {
  const isClient = typeof window === "object";

  const getSize = useCallback(() => {
    return {
      width: isClient ? window.innerWidth : undefined,
      height: isClient ? window.innerHeight : undefined
    };
  }, [isClient]);

  const [windowSize, setWindowSize] = useState(getSize);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    function handleResize(): void {
      setWindowSize(getSize());
    }

    window.addEventListener("resize", handleResize);
    return (): void => window.removeEventListener("resize", handleResize);
  }, [getSize, isClient]);

  return windowSize;
}
