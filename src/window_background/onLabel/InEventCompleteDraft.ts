import getDraftSet from "../draft/getDraftSet";
import setDraftData from "../draft/setDraftData";
import endDraft from "../draft/endDraft";

import LogEntry from "../../types/logDecoder";
import { PlayerCourse } from "../../types/event";
import convertDeckFromV3 from "../convertDeckFromV3";
import globals from "../globals";

interface Entry extends LogEntry {
  json: () => PlayerCourse;
}
export default function InEventCompleteDraft(entry: Entry): void {
  const json = entry.json();
  console.log("LABEL:  Complete draft ", json);
  if (!json) return;
  const toolId = json.Id + "-draft";

  //const draftId = json.ModuleInstanceData.DraftInfo?.DraftId || "";
  const data = {
    ...globals.currentDraft,
    ...json,
    CourseDeck: json.CourseDeck ? convertDeckFromV3(json.CourseDeck) : null
  };
  data.set = getDraftSet(json.InternalEventName) || data.set;
  data.id = toolId;
  // save final version of draft
  setDraftData(data, true);
  endDraft(data);
}
