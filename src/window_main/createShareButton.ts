import { createDiv, createInput } from "../shared/dom-fns";
import { openDialog, ipcSend } from "./renderer-util";
import createSelect from "./createSelect";

const byId = (id: string) =>
  document.querySelector<HTMLInputElement>("input#" + id);

export default function createShareButton(
  classNames: string[],
  callback: () => void
) {
  let button = createDiv(classNames);
  button.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    createShareDialog(callback);
  });
  return button;
}

function createShareDialog(callback: () => void) {
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
    ipcSend("set_clipboard", byId("share_input")!.value);
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
  callback();
}
