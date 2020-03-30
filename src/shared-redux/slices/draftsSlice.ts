import { createSlice } from "@reduxjs/toolkit";
import globalStore from "../../shared-store";
import { InternalDraft } from "../../types/draft";

const draftsSlice = createSlice({
  name: "drafts",
  initialState: {
    draftsIndex: [] as string[]
  },
  reducers: {
    setDraft: (state, action): void => {
      const draft = action.payload as InternalDraft;
      globalStore.drafts[draft.id] = { ...draft };
      if (state.draftsIndex.indexOf(draft.id) === -1) {
        state.draftsIndex.push(draft.id);
      }
    },
    setManyDrafts: (state, action): void => {
      const newList: string[] = [];
      action.payload.map((draft: InternalDraft) => {
        if (state.draftsIndex.indexOf(draft.id) === -1) {
          globalStore.drafts[draft.id] = draft;
          newList.push(draft.id);
        }
      });
      state.draftsIndex = [...newList, ...state.draftsIndex];
    }
  }
});

export default draftsSlice;
