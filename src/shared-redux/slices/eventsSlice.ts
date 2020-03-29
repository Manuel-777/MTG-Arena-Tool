import { createSlice } from "@reduxjs/toolkit";
import globalStore from "../../shared-store";
import { InternalEvent } from "../../types/event";

const eventsSlice = createSlice({
  name: "events",
  initialState: {
    eventsIndex: [] as string[]
  },
  reducers: {
    setEvent: (state, action): void => {
      const event = action.payload as InternalEvent;
      globalStore.events[event.id] = { ...event };
      if (state.eventsIndex.indexOf(event.id) === -1) {
        state.eventsIndex.push(event.id);
      }
    },
    setManyEvents: (state, action): void => {
      const newList: string[] = [];
      action.payload.map((event: InternalEvent) => {
        if (state.eventsIndex.indexOf(event.id) === -1) {
          globalStore.events[event.id] = event;
          newList.push(event.id);
        }
      });
      state.eventsIndex = [...newList, ...state.eventsIndex];
    }
  }
});

export default eventsSlice;
