import format from "date-fns/format";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FACE_ADVENTURE_MAIN, FACE_SPLIT_FULL } from "../shared/constants";
import db from "../shared/database";
import { openScryfallCard } from "../shared/util";
import { InternalActionLog } from "../types/log";
import { DbCardData } from "../types/Metadata";

interface LogEntryProps {
  initialTime: Date;
  log: InternalActionLog;
  setHoverCardCallback: (card?: DbCardData) => void;
}

function LogEntry(props: LogEntryProps): JSX.Element {
  const { initialTime, log, setHoverCardCallback } = props;
  const [isMouseHovering, setMouseHovering] = useState(false);
  const fullCard = db.card(log.grpId);
  let dfcCard: DbCardData | undefined;
  if (fullCard?.dfcId !== undefined) {
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
    if (_card) {
      openScryfallCard(_card);
    }
  }, [fullCard, dfcCard]);
  const displayLog = { ...log };
  displayLog.str = log.str.replace(/<log-card/gi, '<log-card class="click-on"');
  displayLog.str = log.str.replace(
    /<log-ability/gi,
    '<log-ability class="click-on"'
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
  actionLog: InternalActionLog[];
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
      {actionLog.map((log, index) => (
        <LogEntry log={log} key={"log_" + index} {...logProps} />
      ))}
    </div>
  );
}
