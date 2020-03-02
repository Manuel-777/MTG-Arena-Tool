import React from "react";
import {
  draftShareLink,
  deckShareLink,
  logShareLink,
  openDialog,
  ipcSend
} from "../renderer-util";
import createSelect from "../createSelect";
import { AppState } from "../app/appState";
import { createDiv, createInput } from "../../shared/dom-fns";
import { useSelector } from "react-redux";

interface ShareButtonProps {
  type: "draft" | "deck" | "actionlog";
  data: any;
}

const byId = (id: string): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>("input#" + id);

// Should be replaced with actual react element
function createShareDialog(callback: (option: string) => void): void {
  const cont = createDiv(["dialog_content"]);
  cont.style.width = "500px";

  cont.append(createDiv(["share_title"], "Link for sharing:"));
  const icd = createDiv(["share_input_container"]);
  const linkInput = createInput([], "", {
    id: "share_input",
    autocomplete: "off"
  });
  linkInput.addEventListener("click", () => linkInput.select());
  icd.appendChild(linkInput);
  const but = createDiv(["button_simple"], "Copy");
  but.addEventListener("click", function() {
    ipcSend("set_clipboard", byId("share_input")?.value);
  });
  icd.appendChild(but);
  cont.appendChild(icd);

  cont.appendChild(createDiv(["share_subtitle"], "<i>Expires in: </i>"));
  createSelect(
    cont,
    ["One day", "One week", "One month", "Never"],
    "",
    callback,
    "expire_select"
  );
  openDialog(cont);
  callback("");
}

export default function ShareButton({
  type,
  data
}: ShareButtonProps): JSX.Element {
  const offline = useSelector((state: AppState) => state.offline);
  const click = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (type == "draft") {
      createShareDialog(shareExpire =>
        draftShareLink(data.id, data, shareExpire)
      );
    } else if (type == "deck") {
      createShareDialog(shareExpire => deckShareLink(data, shareExpire));
    } else if (type == "actionlog") {
      createShareDialog(shareExpire => logShareLink(data, shareExpire));
    }
  };

  return !offline ? (
    <div onClick={click} className="list_log_share"></div>
  ) : (
    <div
      title="You need to be logged in to share!"
      className="list_log_cant_share"
    ></div>
  );
}
