import React from "react";
import pd from "../../shared/player-data";

interface ShareButtonProps {
  type: string;
  data: any;
}

export default function ShareButton({
  type,
  data
}: ShareButtonProps): JSX.Element {
  return !pd.offline ? (
    <div className="list_log_share"></div>
  ) : (
    <div
      title="You need to be logged in to share!"
      className="list_log_cant_share"
    ></div>
  );
}
