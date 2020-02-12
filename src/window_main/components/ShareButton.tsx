import React from "react";
import pd from "../../shared/player-data";
import { createShareDialog } from "../createShareButton";
import { draftShareLink, deckShareLink, logShareLink } from "../renderer-util";

interface ShareButtonProps {
  type: "draft" | "deck" | "actionlog";
  data: any;
}

export default function ShareButton({
  type,
  data
}: ShareButtonProps): JSX.Element {
  const click = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (type == "draft") {
      createShareDialog(shareExpire =>
        draftShareLink(data.id, data, shareExpire)
      );
    } else if (type == "deck") {
      createShareDialog(shareExpire => deckShareLink(data, shareExpire));
    } else if (type == "actionlog") {
      createShareDialog(shareExpire => logShareLink(data, shareExpire));
    }
  };

  return !pd.offline ? (
    <div onClick={click} className="list_log_share"></div>
  ) : (
    <div
      title="You need to be logged in to share!"
      className="list_log_cant_share"
    ></div>
  );
}
