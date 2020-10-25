import React, { useState, useCallback, useEffect } from "react";
import ReactSelect from "../../../shared/ReactSelect";
import { ipcSend } from "../../ipcSend";
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../../shared/redux/stores/rendererStore";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import { constants } from "mtgatool-shared";
import css from "./popups.css";
import formsCss from "../../forms.css";
import indexCss from "../../index.css";
const { IPC_NONE } = constants;

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
    (e) => {
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
      reduxAction(dispatcher, { type: "SET_LOADING", arg: true }, IPC_NONE);
      switch (type) {
        case "draft":
          ipcSend("request_draft_link", {
            expire: shareTypeId(option),
            id,
            draftData: data,
          });
          break;
        case "deck":
          ipcSend("request_deck_link", {
            expire: shareTypeId(option),
            deckString: data,
          });
          break;
        case "actionlog":
          ipcSend("request_log_link", {
            expire: shareTypeId(option),
            log: data,
            id,
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
      className={css.popupBackground}
      style={{
        opacity: open * 2,
        backgroundColor: `rgba(0, 0, 0, ${0.5 * open})`,
      }}
      onClick={handleClose}
    >
      <div
        className={css.popupDiv}
        style={{ height: `${open * 240}px`, width: `${open * 420}px` }}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <div style={{ marginBottom: "26px" }} className={indexCss.messageSub}>
          Create new link
        </div>
        <div style={{ margin: "4px 0" }} className={formsCss.formLabel}>
          Expires after:
        </div>
        <ReactSelect
          style={{ width: "-webkit-fill-available", margin: "0 0 16px 0" }}
          options={expireOptions}
          current={"Select..."}
          callback={selectExpire}
        />
        <label className={formsCss.formLabel}>URL:</label>
        <div style={{ display: "flex" }}>
          <div className={formsCss.formInputContainer}>
            <input type="text" autoComplete="off" value={stateUrl} />
          </div>
          <div
            className={indexCss.copyButton}
            style={{ margin: "auto 8px", filter: "brightness(0.3)" }}
            onClick={doCopy}
          />
        </div>
      </div>
    </div>
  );
}
