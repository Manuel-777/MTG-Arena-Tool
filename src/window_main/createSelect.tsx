import mountReactComponent from "./mountReactComponent";
import { createDiv } from "../shared/dom-fns";
import React from "react";
import { ReactSelect } from "../shared/ReactSelect";

export default function createSelect(
  parent: Element,
  options: string[],
  current: string,
  callback: (option: string) => void,
  divClass: string,
  optionFormatter?: (option: string) => string | JSX.Element
): HTMLElement {
  // We create this container outside the component to ensure wherever we're rendering doens't get blanked.
  const selectContainer = createDiv(["select_container", divClass]);
  selectContainer.id = divClass;
  parent.appendChild(selectContainer);

  const props = {
    options,
    current,
    optionFormatter,
    callback
  };

  // We aren't using the mountReactComponent function here because of circular imports.
  mountReactComponent(<ReactSelect {...props} />, selectContainer);

  return selectContainer;
}
