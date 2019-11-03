import React, { useEffect } from "react";
import format from "date-fns/format";

import db from "../shared/database";
import { queryElements } from "../shared/dom-fns";
import { addCardHover } from "../shared/card-hover";

export default function ActionLog(_props) {
  const { actionLog, index } = _props;
  const initalTime = actionLog[0] ? new Date(actionLog[0].time) : new Date();

  useEffect(() => {
    const container = queryElements(
      `#overlay_${index + 1} .overlay_decklist`
    )[0];

    const doscroll =
      Math.round(
        container.scrollHeight - container.offsetHeight - container.scrollTop
      ) < 32;
    if (doscroll) {
      container.scrollTop = container.scrollHeight;
    }

    queryElements("log-card").forEach(obj => {
      const grpId = obj.getAttribute("id");
      addCardHover(obj, db.card(grpId));
    });
    queryElements("log-ability").forEach(obj => {
      const grpId = obj.getAttribute("id");
      const abilityText = db.abilities[grpId] || "";
      obj.title = abilityText;
    });
  });

  return (
    <div key="overlay_decklist" className="overlay_decklist click-on">
      {actionLog &&
        actionLog.map((log, index) => {
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
          const _date = new Date(log.time);
          const secondsPast = Math.round((_date - initalTime) / 1000);

          return (
            <div className={"actionlog log_p" + log.seat} key={"log_" + index}>
              <div className="actionlog_time" title={format(_date, "HH:mm:ss")}>
                {secondsPast + "s"}
              </div>
              <div
                className="actionlog_text"
                dangerouslySetInnerHTML={{ __html: log.str }}
              />
            </div>
          );
        })}
    </div>
  );
}
