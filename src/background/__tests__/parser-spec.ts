/* eslint-env jest */
import { actions } from "../../shared/redux/actions";
import {} from "../index";
import arenaLogWatcher from "../arena-log-watcher";
import globals from "../globals";
import path from "path";
import { playerDb, appDb } from "../../shared/db/LocalDatabase";
import globalStore from "../../shared/store";

const testLogPath = path.join(
  __dirname,
  "..",
  "..",
  "assets",
  "tests",
  "match-test.log"
);

playerDb.init("ABC123", "TesterMan#123456");
appDb.init("test-application");

function doStart(): Promise<void> {
  return new Promise((resolve, reject) => {
    globals.logReadStart = new Date(2020, 1, 1, 0, 0, 0, 0);
    arenaLogWatcher.start({
      path: testLogPath,
      chunkSize: 268435440,
      onLogEntry: arenaLogWatcher.onLogEntryFound,
      onError: (_err: any) => reject(),
      onFinish: resolve,
    });
  });
}

let startTime = 0;
let endTime = 0;
beforeAll(async () => {
  startTime = new Date().getTime();
  await doStart();
  endTime = new Date().getTime();
});

describe("parser", () => {
  it("parses in a reasonable time", () => {
    const time = endTime - startTime;
    // Ran on my PC multiple times with ranges of 170 - 300ms
    expect(time).toBeLessThan(800);
  });

  it("parses a match consistently", () => {
    globalStore.currentMatch.beginTime = new Date("2020-07-30T17:17:34.719Z");
    expect(globalStore.currentMatch).toMatchSnapshot();
  });

  it("parses decks", () => {
    expect(globalStore.decks).toMatchSnapshot();
  });

  it("parses matches", () => {
    expect(globalStore.matches).toMatchSnapshot();
  });

  it("parses events", () => {
    expect(globalStore.events).toMatchSnapshot();
  });

  it("matches redux store", () => {
    globals.store.dispatch(actions["SET_CARDS_TIME"](1596131827815));
    expect(globals.store.getState().deckChanges).toMatchSnapshot();
    expect(globals.store.getState().decks).toMatchSnapshot();
    expect(globals.store.getState().drafts).toMatchSnapshot();
    expect(globals.store.getState().economy).toMatchSnapshot();
    expect(globals.store.getState().events).toMatchSnapshot();
    expect(globals.store.getState().matches).toMatchSnapshot();
    expect(globals.store.getState().playerdata).toMatchSnapshot();
    expect(globals.store.getState().renderer).toMatchSnapshot();
    expect(globals.store.getState().seasonal).toMatchSnapshot();
  });
});
