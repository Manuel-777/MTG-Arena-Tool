import _ from "lodash";
import nthLastIndexOf from "./nth-last-index-of";
import * as jsonText from "./jsonText";
import sha1 from "js-sha1";

const LABEL_JSON_PATTERNS = [
  /\[UnityCrossThreadLogger\](?<timestamp>.*): (?:Match to )?(?<playerId>\w*)(?: to Match)?: (?<label>.*)(?:\r\n|\n)/,
  /\[UnityCrossThreadLogger\]Received unhandled GREMessageType: (?<label>.*)(?:\r\n|\n)*/
];

const LABEL_ARROW_JSON_PATTERN = /\[UnityCrossThreadLogger\](?<arrow>[<=]=[=>]) (?<label>.*?) /;

const ALL_PATTERNS = [...LABEL_JSON_PATTERNS, LABEL_ARROW_JSON_PATTERN];

const maxLinesOfAnyPattern = Math.max(
  ...ALL_PATTERNS.map(regex => occurrences(regex.source, /\\n/g))
);

const logEntryPattern = new RegExp(
  `(${ALL_PATTERNS.map(re => re.source.replace(/\(\?<\w*>/g, "(")).join("|")})`,
  "g"
);

function unleakString(s) {
  return (" " + s).substr(1);
}

export default function ArenaLogDecoder() {
  let buffer = "";
  let bufferDiscarded = 0;
  return { append };

  function append(newText, callback) {
    logEntryPattern.lastIndex = 0;

    buffer = buffer.length ? buffer.concat(newText) : newText;
    let bufferUsed = false;
    let match;
    while ((match = logEntryPattern.exec(buffer))) {
      const position = bufferDiscarded + match.index;
      const [type, length, entry] = parseLogEntry(
        buffer,
        match[0],
        match.index,
        position
      );
      switch (type) {
        case "invalid":
          bufferUsed = match.index + length;
          break;
        case "partial":
          bufferUsed = match.index;
          break;
        case "full":
          bufferUsed = match.index + length;
          callback({
            ...entry,
            position
          });
          break;
      }
    }

    if (bufferUsed === false) {
      const i = nthLastIndexOf(buffer, "\n", maxLinesOfAnyPattern);
      bufferUsed = i === -1 ? 0 : i;
    }

    if (bufferUsed > 0) {
      bufferDiscarded += bufferUsed;
      buffer = unleakString(buffer.substr(bufferUsed));
    }

    unleakRegExp();
  }
}

function parseLogEntry(text, matchText, position, absPosition) {
  let rematches;

  if ((rematches = matchText.match(LABEL_ARROW_JSON_PATTERN))) {
    const jsonStart = position + matchText.length;
    if (jsonStart >= text.length) {
      return ["partial"];
    }
    if (!jsonText.starts(text, jsonStart)) {
      return ["invalid", matchText.length];
    }

    const jsonLen = jsonText.length(text, jsonStart);
    if (jsonLen === -1) {
      return ["partial"];
    }

    let textAfterJson = text.substr(jsonStart + jsonLen, 2);
    if (textAfterJson !== "\r\n") {
      textAfterJson = text.substr(jsonStart + jsonLen, 1);
      if (textAfterJson !== "\n") {
        return ["partial"];
      }
    }

    const jsonString = text.substr(jsonStart, jsonLen);
    return [
      "full",
      matchText.length + jsonLen + textAfterJson.length,
      {
        type: "label_arrow_json",
        ..._.mapValues(rematches.groups, unleakString),
        hash: sha1(jsonString + absPosition),
        json: () => {
          try {
            // console.log(jsonString, jsonStart, jsonLen);
            const json = JSON.parse(jsonString);
            return (
              json.payload || (json.request && JSON.parse(json.request)) || json
            );
          } catch (e) {
            console.log(e, {
              input: rematches.input,
              string: jsonString
            });
          }
        }
      }
    ];
  }

  for (let pattern of LABEL_JSON_PATTERNS) {
    rematches = matchText.match(pattern);
    if (!rematches) continue;

    const jsonStart = position + matchText.length;
    if (jsonStart >= text.length) {
      return ["partial"];
    }
    if (!jsonText.starts(text, jsonStart)) {
      return ["invalid", matchText.length];
    }

    const jsonLen = jsonText.length(text, jsonStart);
    if (jsonLen === -1) {
      return ["partial"];
    }

    let textAfterJson = text.substr(jsonStart + jsonLen, 2);
    if (textAfterJson !== "\r\n") {
      textAfterJson = text.substr(jsonStart + jsonLen, 1);
      if (textAfterJson !== "\n") {
        return ["partial"];
      }
    }

    const jsonString = text.substr(jsonStart, jsonLen);
    return [
      "full",
      matchText.length + jsonLen + textAfterJson.length,
      {
        type: "label_json",
        ..._.mapValues(rematches.groups, unleakString),
        hash: sha1(jsonString + absPosition),
        text: jsonString,
        json: () => {
          try {
            // console.log(jsonString, jsonStart, jsonLen);
            const json = JSON.parse(jsonString);
            return (
              json.payload || (json.request && JSON.parse(json.request)) || json
            );
          } catch (e) {
            console.log(e, {
              input: rematches.input,
              string: jsonString
            });
          }
        }
      }
    ];
  }

  // we should never get here. instead, we should
  // have returned a 'partial' or 'invalid' result
  throw new Error("Could not parse an entry");
}

function occurrences(text, re) {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

// The global RegExp object has a lastMatch property that holds references to
// strings -- even our very large ones. This fn can be called to release those.
function unleakRegExp() {
  /\s*/g.exec("");
}
