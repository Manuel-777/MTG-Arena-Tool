const fs = require("fs");
const { promisify } = require("util");
const { StringDecoder } = require("string_decoder");
const queue = require("queue");
const ArenaLogDecoder = require("./arena-log-decoder");
const pd = require("common/player-data");

const fsAsync = {
  close: promisify(fs.close),
  open: promisify(fs.open),
  read: promisify(fs.read),
  stat: promisify(fs.stat)
};

function start({ path, chunkSize, onLogEntry, onError, onFinish }) {
  const q = queue({ concurrency: 1 });
  let position = 0;
  let stringDecoder = new StringDecoder();
  let logDecoder = new ArenaLogDecoder();

  schedule();
  const stopWatching = fsWatch(path, schedule, 250);
  return stop;

  function stop() {
    stopWatching();
    q.end();
  }

  function schedule() {
    q.push(attempt);
    q.start();
  }

  async function attempt() {
    try {
      await read();
    } catch (err) {
      onError(err);
    }
  }

  async function read() {
    const { size } = await fsAsync.stat(path);
    if (position > size) {
      // the file has been recreated, we must reset our state
      stringDecoder = new StringDecoder();
      logDecoder = new ArenaLogDecoder();
      position = 0;
    }
    while (position < size) {
      if (!pd.settings.skip_firstpass) {
        const buffer = await readChunk(
          path,
          position,
          Math.min(size - position, chunkSize)
        );
        const text = stringDecoder.write(buffer);
        logDecoder.append(text, entry => onLogEntry({ ...entry, size }));
        position += buffer.length;
      } else {
        position = size;
      }
    }
    onFinish();
  }
}

function fsWatch(path, onChanged, interval) {
  let lastSize;
  let handle;
  start();
  return stop;

  async function start() {
    lastSize = await attemptSize();
    handle = setInterval(checkFile, interval);
  }

  async function checkFile() {
    const size = await attemptSize();
    if (lastSize === size) return;
    lastSize = size;
    onChanged();
  }

  async function attemptSize() {
    try {
      const stats = await fsAsync.stat(path);
      return stats.size;
    } catch (err) {
      if (err.code === "ENOENT") return 0;
      throw err;
    }
  }

  function stop() {
    if (handle) clearInterval(handle);
  }
}

async function readChunk(path, position, length) {
  const buffer = Buffer.alloc(length);
  const fd = await fsAsync.open(path, "r");
  try {
    await fsAsync.read(fd, buffer, 0, length, position);
  } finally {
    await fsAsync.close(fd);
  }
  return buffer;
}

module.exports = { start };
