import React, { useState, useCallback, ChangeEvent, useEffect } from "react";
import { remote } from "electron";
const { dialog } = remote;
import pd from "../../../shared/PlayerData";

interface OutputLogInputProps {
  closeCallback?: (log: string) => void;
}

export default function OutputLogInput(
  props: OutputLogInputProps
): JSX.Element {
  const { closeCallback } = props;
  const [log, setLog] = useState(pd.settings.logUri);
  const [open, setOpen] = useState(0);
  const handleClose = useCallback(
    e => {
      setOpen(0);
      e.stopPropagation();
      if (closeCallback) {
        closeCallback(log);
      }
    },
    [closeCallback, log]
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setLog(e.currentTarget.value);
  };

  const openPathDialog = useCallback(() => {
    const paths = dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: "Arena Log Location",
      defaultPath: pd.settings.logUri,
      buttonLabel: "Select",
      filters: [
        { name: "Text", extensions: ["txt", "text"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (paths && paths.length && paths[0]) {
      setLog(paths[0]);
    }
  }, []);

  useEffect(() => {
    // React doesnt give css time to know there was a change
    // in the properties, adding a timeout solves that.
    setTimeout(() => {
      setOpen(1);
    }, 1);
  }, []);

  return (
    <div
      className="popup-background"
      style={{ opacity: open, backgroundColor: `rgba(0, 0, 0, ${0.5 * open})` }}
      onClick={handleClose}
    >
      <div
        className="popup-div"
        style={{ height: `${open * 160}px` }}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <div style={{ marginBottom: "26px" }} className="message_sub red">
          Could not find a log
        </div>
        <label className="form-label">Output log location:</label>
        <div style={{ display: "flex" }}>
          <div className="form-input-container">
            <input
              onChange={onInputChange}
              type="text"
              autoComplete="off"
              value={log}
            />
          </div>
          <div
            className="open_button"
            style={{ margin: "auto 8px", filter: "brightness(0.3)" }}
            onClick={openPathDialog}
          />
        </div>
      </div>
    </div>
  );
}
