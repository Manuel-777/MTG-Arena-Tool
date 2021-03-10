import React, { useEffect } from "react";

export default function useOutsideClick(
  ref: React.MutableRefObject<HTMLDivElement | null>,
  callback: () => void
): void {
  const handleClick = (e: any): void => {
    if (ref.current && !ref.current.contains(e.target)) {
      callback();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClick);

    return (): void => {
      document.removeEventListener("mousedown", handleClick);
    };
  });
}
