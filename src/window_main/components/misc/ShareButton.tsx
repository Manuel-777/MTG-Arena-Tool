import React from "react";
import { AppState } from "../../../shared/redux/reducers";
import { useSelector, useDispatch } from "react-redux";
import { rendererSlice } from "../../../shared/redux/reducers";

interface ShareButtonProps {
  type: "draft" | "deck" | "actionlog";
  data: any;
}

export default function ShareButton({
  type,
  data
}: ShareButtonProps): JSX.Element {
  const offline = useSelector((state: AppState) => state.renderer.offline);
  const dispatcher = useDispatch();
  const click = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const { setShareDialog } = rendererSlice.actions;
    if (type == "draft") {
      const draftData = JSON.stringify(data);
      dispatcher(
        setShareDialog({
          data: draftData,
          id: data.id,
          type
        })
      );
    } else if (type == "deck") {
      const deckString = JSON.stringify(data);
      dispatcher(
        setShareDialog({
          data: deckString,
          type
        })
      );
    } else if (type == "actionlog") {
      dispatcher(
        setShareDialog({
          data: data.log,
          id: data.id,
          type
        })
      );
    }
  };

  return !offline ? (
    <div onClick={click} className="list_log_share"></div>
  ) : (
    <div
      title="You need to be logged in to share!"
      className="list_log_cant_share"
    ></div>
  );
}
