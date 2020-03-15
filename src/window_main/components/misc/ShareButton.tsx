import React from "react";
import { AppState } from "../../../shared/redux/appState";
import { useSelector, useDispatch } from "react-redux";
import {
  dispatchAction,
  SET_SHARE_DIALOG
} from "../../../shared/redux/reducers";

interface ShareButtonProps {
  type: "draft" | "deck" | "actionlog";
  data: any;
}

export default function ShareButton({
  type,
  data
}: ShareButtonProps): JSX.Element {
  const offline = useSelector((state: AppState) => state.offline);
  const dispatcher = useDispatch();
  const click = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (type == "draft") {
      const draftData = JSON.stringify(data);
      dispatchAction(dispatcher, SET_SHARE_DIALOG, {
        data: draftData,
        id: data.id,
        type
      });
    } else if (type == "deck") {
      const deckString = JSON.stringify(data);
      dispatchAction(dispatcher, SET_SHARE_DIALOG, {
        data: deckString,
        type
      });
    } else if (type == "actionlog") {
      dispatchAction(dispatcher, SET_SHARE_DIALOG, {
        data: data.log,
        id: data.id,
        type
      });
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
