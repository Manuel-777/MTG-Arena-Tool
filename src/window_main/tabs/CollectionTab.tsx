import { remote } from "electron";
import React from "react";
import { TableState } from "react-table";
import Colors from "../../shared/colors";
import { DRAFT_RANKS, IPC_ALL, IPC_RENDERER } from "../../shared/constants";
import db from "../../shared/database";
import { DbCardData } from "../../types/Metadata";
import { openScryfallCard, replaceAll } from "../../shared/util";
import CollectionTable from "../components/collection/CollectionTable";
import { CardsData } from "../components/collection/types";

import { ipcSend, getMissingCardCounts } from "../rendererUtil";
import { CardCounts } from "../components/decks/types";
import Deck from "../../shared/deck";
import { reduxAction } from "../../shared-redux/sharedRedux";
import store from "../../shared-redux/stores/rendererStore";
import { decksList } from "../../shared-store";

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

function addCardMenu(div: HTMLElement, card: DbCardData): void {
  if (!(card.set in db.sets)) return;
  const arenaCode = `1 ${card.name} (${db.sets[card.set].arenacode}) ${
    card.cid
  }`;
  div.addEventListener(
    "contextmenu",
    (e: Event) => {
      e.preventDefault();
      const menu = new Menu();
      const menuItem = new MenuItem({
        label: "Copy Arena code",
        click: (): void => {
          remote.clipboard.writeText(arenaCode);
        }
      });
      menu.append(menuItem);
      menu.popup();
    },
    false
  );
}

function getExportString(cardIds: string[]): string {
  const { export_format: exportFormat } = store.getState().settings;
  const cards = store.getState().playerdata.cards;
  // TODO teach export how to handle all the new optional columns?
  let exportString = "";
  cardIds.forEach(key => {
    let add = exportFormat + "";
    const card = db.card(key);
    if (card) {
      const name = replaceAll(card.name, "///", "//");
      const count = cards.cards[key] === 9999 ? 1 : cards.cards[key] ?? 0;
      const code = db.sets[card.set]?.code ?? "???";
      add = add
        .replace("$Name", '"' + name + '"')
        .replace("$Count", count + "")
        .replace("$SetName", card.set)
        .replace("$SetCode", code)
        .replace("$Collector", card.cid)
        .replace("$Rarity", card.rarity)
        .replace("$Type", card.type)
        .replace("$Cmc", card.cmc + "");
      exportString += add + "\r\n";
    }
  });
  return exportString;
}

function exportCards(cardIds: string[]): void {
  const exportString = getExportString(cardIds);
  ipcSend("export_csvtxt", { str: exportString, name: "cards" });
}

function saveTableState(collectionTableState: TableState<CardsData>): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { collectionTableState },
    IPC_ALL ^ IPC_RENDERER
  );
}

function saveTableMode(collectionTableMode: string): void {
  reduxAction(
    store.dispatch,
    "SET_SETTINGS",
    { collectionTableMode },
    IPC_ALL ^ IPC_RENDERER
  );
}

function getCollectionData(): CardsData[] {
  const wantedCards: CardCounts = {};
  const cards = store.getState().playerdata.cards;
  const cardsNew = store.getState().playerdata.cardsNew;
  decksList()
    .filter(deck => deck && !deck.archived)
    .forEach(deck => {
      const missing = getMissingCardCounts(new Deck(deck));
      Object.entries(missing).forEach(([grpid, count]) => {
        wantedCards[grpid] = Math.max(wantedCards[grpid] ?? 0, count);
      });
    });
  return db.cardList
    .filter(card => card.collectible)
    .map(
      (card): CardsData => {
        const owned = cards.cards[card.id] ?? 0;
        const acquired = cardsNew[card.id] ?? 0;
        const wanted = wantedCards[card.id] ?? 0;
        const colorsObj = new Colors();
        colorsObj.addFromCost(card.cost);
        const colors = colorsObj.get();
        const colorSortVal = colors.join("");
        const rankSortVal = DRAFT_RANKS[card.rank] ?? "?";
        return {
          ...card,
          owned,
          acquired,
          colors,
          colorSortVal,
          wanted,
          rankSortVal
        };
      }
    );
}

export default function CollectionTab(): JSX.Element {
  const {
    collectionTableMode,
    collectionTableState
  } = store.getState().settings;
  const data = React.useMemo(() => getCollectionData(), []);
  return (
    <div className="ux_item">
      <CollectionTable
        cachedState={collectionTableState}
        cachedTableMode={collectionTableMode}
        contextMenuCallback={addCardMenu}
        data={data}
        exportCallback={exportCards}
        openCardCallback={openScryfallCard}
        tableModeCallback={saveTableMode}
        tableStateCallback={saveTableState}
      />
    </div>
  );
}
