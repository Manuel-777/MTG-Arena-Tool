/* eslint-env jest */

const fs = require("fs");
const ArenaLogDecoder = require("../arena-log-decoder");

const text = fs.readFileSync(__dirname + "/output_log.txt", "utf-8");

const getJson = logEntry => ({
  ...logEntry,
  json: logEntry.json && logEntry.json()
});

describe("arena-log-decoder", () => {
  describe(".append", () => {
    it("returns an interator that can be used to get parsed log entries", () => {
      const decoder = new ArenaLogDecoder();
      const logEntries = [];
      decoder.append(text, logEntry => logEntries.push(logEntry));
      expect(logEntries.length).toEqual(63);
    });

    it("finds the same log entries when reading the file in arbitrary chunks", () => {
      // first, get the entries without chunking (for comparison)
      const unchunkedDecoder = new ArenaLogDecoder();
      const logEntries = [];
      unchunkedDecoder.append(text, logEntry =>
        logEntries.push(getJson(logEntry))
      );

      // next, decode the log file in chunks
      const chunkSize = 1000;
      const decoder = new ArenaLogDecoder();

      let i = 0;
      let position = 0;
      while (position < text.length) {
        const fragment = text.substr(position, chunkSize);
        decoder.append(fragment, logEntry =>
          expect(getJson(logEntry)).toEqual(logEntries[i++])
        );
        position += fragment.length;
      }
    });
  });
});
