// Mostly an alias to document.querySelectorAll but
// allows second argument to specify an alternative parent
// Also returns an array.
// Usage:
// queryElements(".classname").forEach(el => do_something(el))
// queryElements("#elementId")
// queryElements("#elementId", otherElement)
exports.queryElements = queryElements;
function queryElements(selectors, parentNode = document) {
  return [...parentNode.querySelectorAll(selectors)];
}

exports.queryElementsByClass = queryElementsByClass;
function queryElementsByClass(selectors, parentNode = document) {
  return [...parentNode.getElementsByClassName(selectors)];
}

exports.createElement = createElement;
function createElement(type, classNames = [], innerHTML = "", attrs = {}) {
  // Utility function. Create a <type> element with specified class names and content
  const el = document.createElement(type);
  classNames.forEach(className => el.classList.add(className));
  el.innerHTML = innerHTML;
  Object.assign(el, attrs);
  return el;
}

exports.createDiv = createDiv;
function createDiv(classNames, innerHTML, attrs = {}) {
  return createElement("div", classNames, innerHTML, attrs);
}

exports.createImg = createImg;
function createImg(classNames, innerHTML, attrs = {}) {
  return createElement("img", classNames, innerHTML, attrs);
}

exports.createInput = createInput;
function createInput(classNames, innerHTML, attrs = {}) {
  return createElement("input", classNames, innerHTML, attrs);
}

exports.createLabel = createLabel;
function createLabel(classNames, innerHTML, attrs = {}) {
  return createElement("label", classNames, innerHTML, attrs);
}

exports.createSpan = createSpan;
function createSpan(classNames, innerHTML, attrs = {}) {
  return createElement("span", classNames, innerHTML, attrs);
}
