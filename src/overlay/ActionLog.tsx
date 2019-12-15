import React, { useCallback, useEffect, useRef, useState } from "react";
import format from "date-fns/format";
import { FACE_SPLIT_FULL, FACE_ADVENTURE_MAIN } from "../shared/constants";
import db from "../shared/database";
import { openScryfallCard } from "../shared/util";

import { LogData } from "./overlayUtil";
import { DbCardData } from "../shared/types/Metadata";

interface LogEntryProps {
  initialTime: Date;
  log: LogData;
  setHoverCardCallback: (card?: DbCardData) => void;
}

function LogEntry(props: LogEntryProps): JSX.Element {
  const { initialTime, log, setHoverCardCallback } = props;
  const [isMouseHovering, setMouseHovering] = useState(false);
  const fullCard = db.card(log.grpId);
  let dfcCard: any;
  if (fullCard && fullCard.dfcId) {
    dfcCard = db.card(fullCard.dfcId);
  }
  const handleMouseEnter = useCallback((): void => {
    setMouseHovering(true);
    fullCard && setHoverCardCallback(fullCard);
  }, [fullCard, setHoverCardCallback]);
  const handleMouseLeave = useCallback((): void => {
    setMouseHovering(false);
    setHoverCardCallback();
  }, [setHoverCardCallback]);
  const handleMouseClick = useCallback((): void => {
    let _card = fullCard;
    if (
      fullCard &&
      [FACE_SPLIT_FULL, FACE_ADVENTURE_MAIN].includes(fullCard.dfc)
    ) {
      _card = dfcCard || fullCard;
    }
    openScryfallCard(_card);
  }, [fullCard, dfcCard]);
  const displayLog = { ...log };
  displayLog.str = log.str.replace(
    "<log-card",
    '<log-card class="click-on"',
    "gi"
  );
  displayLog.str = log.str.replace(
    "<log-ability",
    '<log-ability class="click-on"',
    "gi"
  );
  const date = new Date(log.time);
  const secondsPast = Math.round(
    (date.getTime() - initialTime.getTime()) / 1000
  );
  const style = isMouseHovering
    ? { backgroundColor: "rgba(65, 50, 40, 0.75)" }
    : undefined;
  const entryProps = {
    className: "actionlog log_p" + log.seat,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleMouseClick,
    style
  };
  return (
    <div {...entryProps}>
      <div className="actionlog_time" title={format(date, "HH:mm:ss")}>
        {secondsPast + "s"}
      </div>
      <div
        className="actionlog_text"
        dangerouslySetInnerHTML={{ __html: log.str }}
      />
    </div>
  );
}

export default function ActionLog(props: {
  actionLog: LogData[];
  setHoverCardCallback: (card?: DbCardData) => void;
}): JSX.Element {
  const { actionLog, setHoverCardCallback } = props;
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current as any;
    const doscroll =
      Math.round(
        container.scrollHeight - container.offsetHeight - container.scrollTop
      ) < 32;
    if (doscroll) {
      container.scrollTop = container.scrollHeight;
    }
  });
  const initialTime = actionLog[0] ? new Date(actionLog[0].time) : new Date();
  const logProps = { initialTime, setHoverCardCallback };
  return (
    <div className="overlay_decklist click-on" ref={containerRef}>
      {actionLog.map((log: LogData, index: number) => (
        <LogEntry log={log} key={"log_" + index} {...logProps} />
      ))}
    </div>
  );
}
