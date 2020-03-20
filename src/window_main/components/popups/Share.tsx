import React, { useState, useCallback, useEffect } from "react";
import ReactSelect from "../../../shared/ReactSelect";
import { ipcSend } from "../../rendererUtil";
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../../shared/redux/reducers";
import { rendererSlice } from "../../../shared/redux/reducers";

function shareTypeId(type: string): number {
  switch (type) {
    case "One day":
      return 0;
    case "One week":
      return 1;
    case "One month":
      return 2;
      break;
    case "Never":
      return -1;
    default:
      return 0;
  }
}

interface ShareProps {
  closeCallback?: (log: string) => void;
}

export default function Share(props: ShareProps): JSX.Element {
  const { closeCallback } = props;
  const dispatcher = useDispatch();
  const [stateUrl, setUrl] = useState("");
  const [open, setOpen] = useState(0);
  const { data, id, url, type } = useSelector(
    (state: AppState) => state.renderer.shareDialog
  );

  const handleClose = useCallback(
    e => {
      setOpen(0);
      e.stopPropagation();
      if (closeCallback) {
        closeCallback(url);
      }
    },
    [closeCallback, url]
  );

  const selectExpire = useCallback(
    (option: string): void => {
      const { setLoading } = rendererSlice.actions;
      dispatcher(setLoading(true));
      switch (type) {
        case "draft":
          ipcSend("request_draft_link", {
            expire: shareTypeId(option),
            id,
            draftData: data
          });
          break;
        case "deck":
          ipcSend("request_deck_link", {
            expire: shareTypeId(option),
            deckString: data
          });
          break;
        case "actionlog":
          ipcSend("request_log_link", {
            expire: shareTypeId(option),
            log: data,
            id
          });
          break;
        default:
          break;
      }
    },
    [type, data, id, dispatcher]
  );

  const doCopy = useCallback(() => {
    ipcSend("set_clipboard", url);
  }, [url]);

  const expireOptions = ["One day", "One week", "One month", "Never"];

  useEffect(() => {
    setUrl(url);
  }, [url]);

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
      style={{
        opacity: open * 2,
        backgroundColor: `rgba(0, 0, 0, ${0.5 * open})`
      }}
      onClick={handleClose}
    >
      <div
        className="popup-div"
        style={{ height: `${open * 200}px`, width: `${open * 400}px` }}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <div style={{ marginBottom: "26px" }} className="message_sub">
          Create new link
        </div>
        <div style={{ margin: "4px 0" }} className="form-label">
          Expires after:
        </div>
        <ReactSelect
          style={{ width: "-webkit-fill-available", margin: "0 0 16px 0" }}
          className={"light"}
          options={expireOptions}
          current={"Select..."}
          callback={selectExpire}
        />
        <label className="form-label">URL:</label>
        <div style={{ display: "flex" }}>
          <div className="form-input-container">
            <input type="text" autoComplete="off" value={stateUrl} />
          </div>
          <div
            className="copy_button"
            style={{ margin: "auto 8px", filter: "brightness(0.3)" }}
            onClick={doCopy}
          />
        </div>
      </div>
    </div>
  );
}
