import { CardObject, InternalDeck, v2cardsList } from "../../types/Deck";
import convertDeckFromV3 from "../convertDeckFromV3";
import db from "../../shared/database";
import LogEntry from "../../types/logDecoder";
import { playerDb } from "../../shared/db/LocalDatabase";
import playerData from "../../shared/PlayerData";
import { setData } from "../backgroundUtil";
import { ArenaV3Deck } from "../../types/Deck";
import { getDeck } from "../../shared-store";
import { IPC_RENDERER } from "../../shared/constants";
import { reduxAction } from "../../shared-redux/sharedRedux";
import globals from "../globals";

interface Entry extends LogEntry {
  json: () => ArenaV3Deck;
}

interface Changes {
  id: string;
  deckId: string;
  date: Date;
  changesMain: CardObject[];
  changesSide: CardObject[];
  previousMain: v2cardsList;
  previousSide: v2cardsList;
}

interface TempCardObject extends CardObject {
  existed?: boolean;
}

// REVIEW Deck.UpdateDeckV3 in the logs
export default function InDeckUpdateDeckV3(entry: Entry): void {
  const json = entry.json();
  if (!json) return;

  const entryDeck = convertDeckFromV3(json);
  const _deck = getDeck(json.id) as InternalDeck;

  const changeId = entry.hash;
  const deltaDeck: Changes = {
    id: changeId,
    deckId: _deck.id || "",
    date: new Date(json.lastUpdated),
    changesMain: [],
    changesSide: [],
    previousMain: _deck.mainDeck,
    previousSide: _deck.sideboard
  };

  // Check Mainboard
  _deck.mainDeck.forEach((card: CardObject) => {
    const cardObj = db.card(card.id);
    if (cardObj !== undefined) {
      let diff = 0 - card.quantity;
      entryDeck.mainDeck.forEach((cardB: TempCardObject) => {
        const cardObjB = db.card(cardB.id);
        if (cardObjB !== undefined) {
          if (cardObj.name === cardObjB.name) {
            cardB.existed = true;
            diff = cardB.quantity - card.quantity;
          }
        }
      });

      if (diff !== 0) {
        deltaDeck.changesMain.push({ id: card.id, quantity: diff });
      }
    }
  });

  entryDeck.mainDeck.forEach((card: TempCardObject) => {
    if (card.existed === undefined) {
      deltaDeck.changesMain.push({ id: card.id, quantity: card.quantity });
    }
  });

  // Check sideboard
  _deck.sideboard.forEach((card: CardObject) => {
    const cardObj = db.card(card.id);
    if (cardObj !== undefined) {
      let diff = 0 - card.quantity;
      entryDeck.sideboard.forEach((cardB: TempCardObject) => {
        const cardObjB = db.card(cardB.id);
        if (cardObjB !== undefined) {
          if (cardObj.name === cardObjB.name) {
            cardB.existed = true;
            diff = cardB.quantity - card.quantity;
          }
        }
      });

      if (diff !== 0) {
        deltaDeck.changesSide.push({ id: card.id, quantity: diff });
      }
    }
  });

  entryDeck.sideboard.forEach((card: TempCardObject) => {
    if (card.existed === undefined) {
      deltaDeck.changesSide.push({ id: card.id, quantity: card.quantity });
    }
  });

  const foundNewDeckChange =
    !playerData.deckChangeExists(changeId) &&
    (deltaDeck.changesMain.length || deltaDeck.changesSide.length);

  if (foundNewDeckChange) {
    playerDb.upsert("deck_changes", changeId, deltaDeck);
    const deckChanges = { ...playerData.deck_changes, [changeId]: deltaDeck };
    const deckChangesIndex = [...playerData.deck_changes_index];
    if (!deckChangesIndex.includes(changeId)) {
      deckChangesIndex.push(changeId);
    }
    playerDb.upsert("", "deck_changes_index", deckChangesIndex);
    setData({
      deck_changes: deckChanges,
      deck_changes_index: deckChangesIndex
    });
  }

  const deckData = { ..._deck, ...entryDeck, id: entryDeck.id ?? "" };
  reduxAction(globals.store.dispatch, "SET_DECK", deckData, IPC_RENDERER);
}
