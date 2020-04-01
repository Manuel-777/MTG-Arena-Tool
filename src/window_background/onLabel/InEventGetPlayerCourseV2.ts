// PROBABLY DEPRECATED
import { playerDb } from "../../shared/db/LocalDatabase";
import Deck from "../../shared/deck";
import { InternalEvent, PlayerCourse } from "../../types/event";
import LogEntry from "../../types/logDecoder";
import addCustomDeck from "../addCustomDeck";
import globals from "../globals";
import selectDeck from "../selectDeck";
import convertDeckFromV3 from "../convertDeckFromV3";
import { eventExists, getEvent } from "../../shared-store";
import { reduxAction } from "../../shared-redux/sharedRedux";
import { IPC_RENDERER } from "../../shared/constants";

interface Entry extends LogEntry {
  json: () => PlayerCourse;
}

function saveCourse(json: InternalEvent): void {
  const id = json.id ?? json._id ?? "";
  delete json._id;
  json.id = id;
  const eventData = {
    date: globals.logTime,
    // preserve custom fields if possible
    ...(getEvent(id) || {}),
    ...json
  };

  if (!eventExists(id)) {
    reduxAction(globals.store.dispatch, "SET_EVENT", eventData, IPC_RENDERER);
    const coursesIndex = [...globals.store.getState().events.eventsIndex, id];
    playerDb.upsert("", "courses_index", coursesIndex);
  }

  playerDb.upsert("", id, eventData);
}

export default function InEventGetPlayerCourseV2(entry: Entry): void {
  const json = entry.json();
  if (!json) return;
  if (json.Id == "00000000-0000-0000-0000-000000000000") return;

  if (!json.CourseDeck) return;
  // Says v2 in the label but its actually v3 !
  const v2Deck = convertDeckFromV3(json.CourseDeck);
  const newJson: InternalEvent = {
    CourseDeck: v2Deck,
    archived: false,
    CurrentEventState: json.CurrentEventState,
    custom: false,
    InternalEventName: json.InternalEventName,
    ModuleInstanceData: json.ModuleInstanceData,
    type: "Event",
    id: json.Id,
    date: globals.logTime.getTime()
  };

  if (v2Deck) {
    const deck = new Deck(v2Deck);
    addCustomDeck(newJson.CourseDeck);
    const httpApi = require("../httpApi");
    httpApi.httpSubmitCourse(newJson);
    saveCourse(newJson);
    selectDeck(deck);
  }
}
