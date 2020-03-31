/* eslint-disable @typescript-eslint/camelcase */
import differenceInDays from "date-fns/differenceInDays";
import { playerDb } from "../../shared/db/LocalDatabase";
import LogEntry from "../../types/logDecoder";
import globals from "../globals";
import { reduxAction } from "../../shared-redux/sharedRedux";
import { IPC_RENDERER, IPC_OVERLAY } from "../../shared/constants";

interface Cards {
  [grpId: string]: number;
}

interface Entry extends LogEntry {
  json: () => Cards;
}

export default function InPlayerInventoryGetPlayerCardsV3(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  reduxAction(
    globals.store.dispatch,
    "ADD_CARDS_KEYS",
    json,
    IPC_RENDERER | IPC_OVERLAY
  );

  const now = Date.now();
  const playerData = globals.store.getState().playerdata;
  let { cards_time, cards_before } = playerData.cards;
  if (cards_time) {
    // If a day has passed since last update
    if (differenceInDays(now, new Date(cards_time)) > 0) {
      cards_before = playerData.cards.cards;
      cards_time = now;
    }
  }

  const cards = {
    cards_time,
    cards_before,
    cards: json
  };

  playerDb.upsert("", "cards", cards);
}
