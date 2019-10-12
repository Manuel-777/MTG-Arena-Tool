// Mostly an alias to document.querySelectorAll but
// allows second argument to specify an alternative parent
// Also returns an array.
// Usage:
// queryElements(".classname").forEach(el => do_something(el))
// queryElements("#elementId")
// queryElements("#elementId", otherElement)
function queryElements(selectors, parentNode = document) {
  return [...parentNode.querySelectorAll(selectors)];
}

function queryElementsByClass(selectors, parentNode = document) {
  return [...parentNode.getElementsByClassName(selectors)];
}

function createElement(type, classNames = [], innerHTML = "", attrs = {}) {
  // Utility function. Create a <type> element with specified class names and content
  const el = document.createElement(type);
  classNames.forEach(className => el.classList.add(className));
  el.innerHTML = innerHTML;
  Object.assign(el, attrs);
  return el;
}

function createDiv(classNames, innerHTML, attrs = {}) {
  return createElement("div", classNames, innerHTML, attrs);
}

function createImg(classNames, innerHTML, attrs = {}) {
  return createElement("img", classNames, innerHTML, attrs);
}

function createInput(classNames, innerHTML, attrs = {}) {
  return createElement("input", classNames, innerHTML, attrs);
}

function createLabel(classNames, innerHTML, attrs = {}) {
  return createElement("label", classNames, innerHTML, attrs);
}

export { queryElements, queryElementsByClass, createElement, createDiv, createImg, createInput, createLabel, createSpan };
function createSpan(classNames, innerHTML, attrs = {}) {
  return createElement("span", classNames, innerHTML, attrs);
}
