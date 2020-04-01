import React, { useRef } from "react";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { useSelector } from "react-redux";

export default function Popup(): JSX.Element {
  const [opacity, setOpacity] = React.useState(0);
  const time = useSelector((state: AppState) => state.renderer.popup.time);
  const text = useSelector((state: AppState) => state.renderer.popup.text);
  const timeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const duration = useSelector(
    (state: AppState) => state.renderer.popup.duration
  );

  React.useEffect(() => {
    setOpacity(1);
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    if (duration > 0) {
      timeout.current = setTimeout(() => {
        setOpacity(0);
      }, duration);
    }
  }, [time, duration]);

  return (
    <div style={{ opacity: opacity }} className="popup">
      {text}
    </div>
  );
}
