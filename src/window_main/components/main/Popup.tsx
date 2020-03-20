import React from "react";
import { timestamp } from "../../../shared/util";
import { AppState } from "../../../shared/redux/reducers";
import { useSelector } from "react-redux";

export default function Popup(): JSX.Element {
  const [opacity, setOpacity] = React.useState(0);
  const time = useSelector((state: AppState) => state.renderer.popup.time);
  const text = useSelector((state: AppState) => state.renderer.popup.text);
  const duration = useSelector(
    (state: AppState) => state.renderer.popup.duration
  );

  React.useEffect(() => {
    const diff = time - timestamp();
    setOpacity(1);
    if (diff > 0 && duration > 0) {
      setTimeout(() => {
        setOpacity(0);
      }, diff);
    }
  }, [time, duration]);

  return (
    <div style={{ opacity: opacity }} className="popup">
      {text}
    </div>
  );
}
