import { playerDb } from "../shared/db/LocalDatabase";
import { InternalEconomyTransaction } from "../types/inventory";
import { getTransaction, transactionExists } from "../shared-store";
import globals from "./globals";
import { IPC_ALL, IPC_BACKGROUND } from "../shared/constants";
import { reduxAction } from "../shared-redux/sharedRedux";

export default function saveEconomyTransaction(
  transaction: InternalEconomyTransaction
): void {
  const id = transaction.id;
  const txnData = {
    // preserve custom fields if possible
    ...(getTransaction(id) || {}),
    ...transaction
  };

  if (!transactionExists(id)) {
    reduxAction(
      globals.store.dispatch,
      "SET_ECONOMY",
      txnData,
      IPC_ALL ^ IPC_BACKGROUND
    );
    const economyIndex = [...globals.store.getState().economy.economyIndex, id];
    playerDb.upsert("", "economy_index", economyIndex);
  }

  playerDb.upsert("", id, txnData);
  const httpApi = require("./httpApi");
  httpApi.httpSetEconomy(txnData);
}
