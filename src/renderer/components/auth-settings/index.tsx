import React, { useState, useCallback, useEffect } from "react";
import { remote, shell } from "electron";
import css from "./index.scss";
import indexCss from "../../index.css";
import formsCss from "../../forms.css";
import Close from "../../../assets/images/svg/close.svg";
import { animated, useSpring } from "react-spring";
import { ipcSend } from "../../ipcSend";
import { useSelector } from "react-redux";
import store, { AppState } from "../../../shared/redux/stores/rendererStore";
import showOpenLogDialog from "../../../shared/utils/showOpenLogDialog";
import { format, fromUnixTime } from "date-fns";
import Toggle from "../misc/Toggle";
import db from "../../../shared/database-wrapper";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import { constants } from "mtgatool-shared";
const { IPC_ALL, IPC_RENDERER } = constants;

function clickBetaChannel(value: boolean): void {
  reduxAction(
    store.dispatch,
    {
      type: "SET_APP_SETTINGS",
      arg: {
        betaChannel: value,
      },
    },
    IPC_ALL ^ IPC_RENDERER
  );
}

interface AuthSettingsProps<F extends Function> {
  closeCallback?: F;
}

export default function AuthSettings<F extends Function>(
  props: AuthSettingsProps<F>
): JSX.Element {
  const { closeCallback } = props;
  const appSettings = useSelector((state: AppState) => state.appsettings);
  const [open, setOpen] = useState(0);

  const handleClose = useCallback(() => {
    if (open == 1) return;
    if (closeCallback) {
      closeCallback();
    }
  }, [closeCallback, open]);

  useEffect(() => {
    // React doesnt give css time to know there was a change
    // in the properties, adding a timeout solves that.
    setTimeout(() => {
      setOpen(1);
    }, 1);
  }, []);

  // Arena log controls
  const arenaLogCallback = React.useCallback(
    (value: string): void => {
      if (value === appSettings.logUri) return;
      if (
        confirm(
          "Changing the Arena log location requires a restart, are you sure?"
        )
      ) {
        ipcSend("set_log", value);
      }
    },
    [appSettings.logUri]
  );

  const openPathDialog = useCallback(() => {
    showOpenLogDialog(appSettings.logUri).then(
      (value: Electron.OpenDialogReturnValue): void => {
        const paths = value.filePaths;
        if (paths && paths.length && paths[0]) {
          arenaLogCallback(paths[0]);
        }
      }
    );
  }, [appSettings.logUri, arenaLogCallback]);

  // Animation springs
  const springConfig = { mass: 2, tension: 1000, friction: 100 };
  const alphaSpring = useSpring({
    opacity: open ? 1 : 0,
    config: springConfig,
    onRest: () => handleClose(),
  });
  const scaleSpring = useSpring({
    transform: `scale(${open ? 1 : 0.8})`,
    config: springConfig,
  });

  return (
    <animated.div className={css.popupBackground} style={alphaSpring}>
      <animated.div
        className={css.popupDiv}
        style={scaleSpring}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <Close
          fill="var(--color-text-hover)"
          className={css.closeButton}
          onClick={(): void => setOpen(0)}
        />
        <div className={css.popupInner} style={{ color: "var(--color-back)" }}>
          <div className={css.title}>Settings</div>
          <div className={css.inputContainer}>
            <label className={css.label}>Arena Log:</label>
            <div
              style={{
                display: "flex",
                maxWidth: "80%",
                width: "-webkit-fill-available",
                justifyContent: "flex-end",
              }}
            >
              <div className={indexCss.open_button} onClick={openPathDialog} />
              <div className={formsCss.formInputContainer}>
                <input autoComplete="off" value={appSettings.logUri} />
              </div>
            </div>
          </div>
          <Toggle
            text={"Beta updates channel"}
            value={appSettings.betaChannel}
            callback={clickBetaChannel}
            margin={false}
          />
          <div className={css.about}>
            <div
              style={{ margin: "4px", textDecoration: "underline" }}
              className={css.link}
              onClick={(): void => {
                shell.openExternal("https://mtgatool.com/release-notes/");
              }}
            >
              {"Version " + remote.app.getVersion()}
            </div>
            {db.metadata ? (
              <div style={{ margin: "4px" }}>
                Metadata: v{db.metadata.version || "???"}, updated{" "}
                {db.metadata.updated
                  ? format(fromUnixTime(db.metadata.updated / 1000), "Pp")
                  : "???"}
              </div>
            ) : (
              <></>
            )}
            <button
              style={{ maxWidth: "300px", marginTop: "10px" }}
              className={formsCss.formButton}
              onClick={(): void => {
                ipcSend("updates_check", true);
              }}
            >
              Check for Updates
            </button>
          </div>
        </div>
      </animated.div>
    </animated.div>
  );
}
