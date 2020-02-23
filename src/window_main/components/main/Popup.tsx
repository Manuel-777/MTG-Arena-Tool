import React from "react";
import { timestamp } from "../../../shared/util";

interface PopupProps {
  text: string;
  time: number;
}

export default function Popup(props: PopupProps): JSX.Element {
  const [opacity, setOpacity] = React.useState(0);

  React.useEffect(() => {
    const diff = props.time - timestamp();
    if (diff > 0) {
      setOpacity(1);
      setTimeout(() => {
        setOpacity(0);
      }, diff);
    }
    /* else {
      setOpacity(0);
    }*/
  }, [props]);

  return (
    <div style={{ opacity: opacity }} className="popup">
      {props.text}
    </div>
  );
}
