import { IPC_OVERLAY, IPC_RENDERER } from "../../shared/constants";
import { playerDb } from "../../shared/db/LocalDatabase";
import { ipcSend } from "../backgroundUtil";
import { InternalDraft } from "../../types/draft";
import globals from "../globals";
import { reduxAction } from "../../shared-redux/sharedRedux";

export default function setDraftData(
  data: InternalDraft,
  persist = false
): void {
  console.log("Set draft data:", data);
  globals.currentDraft = data;

  if (persist && data.id) {
    // We cant persist a draft if we dont have the final, real event ID
    // we get that ID when the draft ends and the event is created.
    const { id } = data;

    // Add to indexes
    let draftIndex = globals.store.getState().drafts.draftsIndex;
    if (!draftIndex.includes(id)) {
      draftIndex = [...draftIndex, id];
      playerDb.upsert("", "draft_index", draftIndex);
      reduxAction(
        globals.store.dispatch,
        {
          type: "SET_DRAFT",
          arg: data
        },
        "SET_DRAFT",
        data,
        IPC_RENDERER
      );
    }
    playerDb.upsert("", id, data);
  } else if (persist) {
    console.log("Couldnt save draft without id:", data);
    return;
  }

  ipcSend("set_draft_cards", data, IPC_OVERLAY);
}
