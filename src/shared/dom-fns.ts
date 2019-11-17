// Mostly an alias to document.querySelectorAll but
// allows second argument to specify an alternative parent
// Also returns an array.
// Usage:
// queryElements(".classname").forEach(el => do_something(el))
// queryElements("#elementId")
// queryElements("#elementId", otherElement)
export function queryElements(selectors: string, parentNode = document): any {
  return parentNode.querySelectorAll(selectors);
}

export function queryElementsByClass(
  selectors: string,
  parentNode = document
): any {
  return parentNode.getElementsByClassName(selectors);
}

type returnableElements =
  | HTMLDivElement
  | HTMLImageElement
  | HTMLInputElement
  | HTMLLabelElement
  | HTMLSpanElement;

function createElement(
  el: returnableElements,
  classNames: string[] = [],
  innerHTML = "",
  attrs = {}
): any {
  // Adds class, InnerHTML and attrs to the given element.
  classNames.forEach(className => el.classList.add(className));
  el.innerHTML = innerHTML;
  Object.assign(el, attrs);
  return el;
}

export function createDiv(
  classNames: string[],
  innerHTML = "",
  attrs = {}
): HTMLDivElement {
  const el = document.createElement("div");
  return createElement(el, classNames, innerHTML, attrs);
}

export function createImg(
  classNames: string[],
  innerHTML = "",
  attrs = {}
): HTMLImageElement {
  const el = document.createElement("img");
  return createElement(el, classNames, innerHTML, attrs);
}

export function createInput(
  classNames: string[],
  innerHTML = "",
  attrs = {}
): HTMLInputElement {
  const el = document.createElement("input");
  return createElement(el, classNames, innerHTML, attrs);
}

export function createLabel(
  classNames: string[],
  innerHTML = "",
  attrs = {}
): HTMLLabelElement {
  const el = document.createElement("label");
  return createElement(el, classNames, innerHTML, attrs);
}

export function createSpan(
  classNames: string[],
  innerHTML = "",
  attrs = {}
): HTMLSpanElement {
  const el = document.createElement("span");
  return createElement(el, classNames, innerHTML, attrs);
}
