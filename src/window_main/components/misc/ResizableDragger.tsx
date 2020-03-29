import React from "react";
import { useDispatch } from "react-redux";
import { makeResizable } from "../../rendererUtil";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { IPC_ALL, IPC_RENDERER } from "../../../shared/constants";

export default function ResizableDragger(): JSX.Element {
  const draggerRef = React.useRef<HTMLDivElement>(null);
  const dispatcher = useDispatch();
  React.useEffect(() => {
    if (draggerRef?.current) {
      makeResizable(draggerRef.current, (newWidth: number) => {
        reduxAction(
          dispatcher,
          "SET_SETTINGS",
          { right_panel_width: newWidth },
          IPC_ALL ^ IPC_RENDERER
        );
      });
    }
  }, [dispatcher, draggerRef]);
  return <div ref={draggerRef} className={"dragger"} />;
}
