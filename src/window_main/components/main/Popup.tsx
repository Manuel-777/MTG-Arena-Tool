import React from "react";
import { timestamp } from "../../../shared/util";
import { AppState } from "../../app/appState";
import { useSelector } from "react-redux";

export default function Popup(): JSX.Element {
  const [opacity, setOpacity] = React.useState(0);
  const time = useSelector((state: AppState) => state.popup.time);
  const text = useSelector((state: AppState) => state.popup.text);

  React.useEffect(() => {
    const diff = time - timestamp();
    if (diff > 0) {
      setOpacity(1);
      setTimeout(() => {
        setOpacity(0);
      }, diff);
    }
    /* else {
      setOpacity(0);
    }*/
  }, [time]);

  return (
    <div style={{ opacity: opacity }} className="popup">
      {text}
    </div>
  );
}
