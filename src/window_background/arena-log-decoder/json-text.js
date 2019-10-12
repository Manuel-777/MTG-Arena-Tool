function starts(text, position) {
  return ["{", "["].includes(text.charAt(position));
}

function length(text, position) {
  switch (text.charAt(position)) {
    case "{":
    case "[": {
      let openedObjects = 0;
      let openedArrays = 0;
      let inString = false;
      for (let i = position; i < text.length; i++) {
        switch (text.charAt(i)) {
          case "\\":
            if (inString) i++;
            break;
          case "{":
            if (!inString) openedObjects++;
            break;
          case "}":
            if (!inString) openedObjects--;
            break;
          case "[":
            if (!inString) openedArrays++;
            break;
          case "]":
            if (!inString) openedArrays--;
            break;
          case '"':
            inString = !inString;
            break;
        }
        if (openedArrays === 0 && openedObjects === 0) {
          return i - position + 1;
        }
      }
      return -1;
    }
    default:
      throw new Error("Not valid start of JSON: " + text.substr(position, 10));
  }
}

module.exports = { starts, length };
