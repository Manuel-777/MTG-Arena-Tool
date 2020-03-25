import { IPC_OVERLAY } from "../../shared/constants";
import { playerDb } from "../../shared/db/LocalDatabase";
import playerData from "../../shared/PlayerData";
import { ipcSend, setData } from "../backgroundUtil";
import { InternalDraft } from "../../types/draft";
import globals from "../globals";

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
    if (!playerData.draft_index.includes(id)) {
      const draftIndex = [...playerData.draft_index, id];
      playerDb.upsert("", "draft_index", draftIndex);
      setData({ draft_index: draftIndex }, false);
    }
    // Add to db
    setData({
      [id]: data,
      cards: playerData.cards,
      cardsNew: playerData.cardsNew
    });
    playerDb.upsert("", id, data);
  } else if (persist) {
    console.log("Couldnt save draft without id:", data);
    return;
  }

  ipcSend("set_draft_cards", data, IPC_OVERLAY);
}
