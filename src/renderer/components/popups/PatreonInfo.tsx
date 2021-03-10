import React, { useState, useCallback, useEffect } from "react";
import { shell } from "electron";

import css from "./popups.css";
import indexCss from "../../index.css";

interface DialogProps {
  closeCallback?: () => void;
}

export default function PatreonInfo(props: DialogProps): JSX.Element {
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
        opacity: open * 2,
        backgroundColor: `rgba(0, 0, 0, ${0.5 * open})`,
      }}
      onClick={handleClose}
    >
      <div
        className={css.popupDivNopadding}
        style={{
          height: `${open * 340}px`,
          width: `${open * 520}px`,
          overflow: "initial",
        }}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <div className={css.patreonInfoPopTop}>
          <div
            style={{ color: "var(--color-text-hover)" }}
            className={indexCss.messageSub}
          >
            You discovered a Patreon exclusive feature!
          </div>
        </div>
        <div className={css.patreonInfoPopBottom}>
          <div className={css.patreonInfoText}>
            Synchronize your data across multiple devices
          </div>
          <div className={css.patreonInfoText}>
            Access global cards winrate statistics
          </div>
          <div className={css.patreonInfoText}>Get priority Support</div>
          <div className={css.patreonInfoText}>
            Help us develop new amazing features!
          </div>
          <div className={css.patreonDescText}>
            See our patreon page to learn more about upcoming and planned
            features:
          </div>
          <div
            className={css.patreonLinkThin}
            title="Open on browser"
            onClick={(): void => {
              shell.openExternal("https://www.patreon.com/mtgatool");
            }}
          />
        </div>
      </div>
    </div>
  );
}
