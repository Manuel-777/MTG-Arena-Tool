import { createSlice } from "@reduxjs/toolkit";
import globalStore from "../../shared-store";
import { InternalEconomyTransaction } from "../../types/inventory";

const economySlice = createSlice({
  name: "decks",
  initialState: {
    economyIndex: [] as string[]
  },
  reducers: {
    setEconomy: (state, action): void => {
      const economy = action.payload as InternalEconomyTransaction;
      globalStore.transactions[economy.id] = { ...economy };
      if (state.economyIndex.indexOf(economy.id) === -1) {
        state.economyIndex.push(economy.id);
      }
    },
    setManyEconomy: (state, action): void => {
      const newList: string[] = [];
      action.payload.map((economy: InternalEconomyTransaction) => {
        if (state.economyIndex.indexOf(economy.id) === -1) {
          globalStore.transactions[economy.id] = economy;
          newList.push(economy.id);
        }
      });
      state.economyIndex = [...newList, ...state.economyIndex];
    }
  }
});

export default economySlice;
