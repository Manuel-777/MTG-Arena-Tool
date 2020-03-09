import React from "react";
import { makeResizable } from "../renderer-util";

export default function ResizableDragger(): JSX.Element {
  const draggerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (draggerRef?.current) {
      makeResizable(draggerRef.current);
    }
  }, [draggerRef]);
  return <div ref={draggerRef} className={"dragger"} />;
}
