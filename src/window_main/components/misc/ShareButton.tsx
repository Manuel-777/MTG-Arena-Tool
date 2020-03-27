import React from "react";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { useSelector, useDispatch } from "react-redux";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { IPC_NONE } from "../../../shared/constants";

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
    if (type == "draft") {
      const draftData = JSON.stringify(data);
      reduxAction(
        dispatcher,
        "SET_SHARE_DIALOG",
        {
          data: draftData,
          id: data.id,
          type
        },
        IPC_NONE
      );
    } else if (type == "deck") {
      const deckString = JSON.stringify(data);
      reduxAction(
        dispatcher,
        "SET_SHARE_DIALOG",
        {
          data: deckString,
          type
        },
        IPC_NONE
      );
    } else if (type == "actionlog") {
      reduxAction(
        dispatcher,
        "SET_SHARE_DIALOG",
        {
          data: data.log,
          id: data.id,
          type
        },
        IPC_NONE
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
