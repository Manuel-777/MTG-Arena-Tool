import React, { useState, useCallback, useEffect } from "react";
import { shell } from "electron";
import Button from "../misc/Button";

import css from "./popups.css";
import sharedCss from "../../../shared/shared.css";
import indexCss from "../../index.css";

interface DetailedLogsProps {
  closeCallback?: () => void;
}

export default function DetailedLogs(props: DetailedLogsProps): JSX.Element {
  const { closeCallback } = props;
  const [open, setOpen] = useState(0);
  const handleClose = useCallback(
    (e) => {
      setOpen(0);
      e.stopPropagation();
      if (closeCallback) {
        closeCallback();
      }
    },
    [closeCallback]
  );

  useEffect(() => {
    // React doesnt give css time to know there was a change
    // in the properties, adding a timeout solves that.
    setTimeout(() => {
      setOpen(1);
    }, 1);
  }, []);

  return (
    <div
      className={css.popupBackground}
      style={{
        color: "var(--color-back-100)",
        opacity: open,
        backgroundColor: `rgba(0, 0, 0, ${0.5 * open})`,
      }}
      onClick={handleClose}
    >
      <div
        className={css.popupDiv}
        style={{ height: `${open * 240}px` }}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <div
          style={{ marginBottom: "26px" }}
          className={indexCss.messageSub + " " + sharedCss.red}
        >
          Detailed Logs is disabled
        </div>
        <ul>
          <li>Open Arena (the game).</li>
          <li>Go to the settings screen in Arena.</li>
          <li>Open the Account screen.</li>
          <li>Enable detailed logs.</li>
          <li>Restart Arena.</li>
        </ul>
        <div style={{ textAlign: "center" }}>
          For more information check{" "}
          <a
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={(): void => {
              shell.openExternal(
                "https://mtgatool.com/docs/installation#enable-detailed-logs"
              );
            }}
            className="link openDocsLink"
          >
            our documentation
          </a>
        </div>
        <div></div>
        <Button text="Ok" onClick={handleClose} />
      </div>
    </div>
  );
}
