import { remote } from "electron";
import React from "react";
import { TableState } from "react-table";
import Colors from "../../shared/colors";
import { DRAFT_RANKS } from "../../shared/constants";
import db from "../../shared/database";
import pd from "../../shared/PlayerData";
import { DbCardData } from "../../types/Metadata";
import {
  getMissingCardCounts,
  openScryfallCard,
  replaceAll
} from "../../shared/util";
import CollectionTable from "../components/collection/CollectionTable";
import { CardsData } from "../components/collection/types";

import { ipcSend } from "../rendererUtil";
import { CardCounts } from "../components/decks/types";
import Deck from "../../shared/deck";

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
  const { export_format: exportFormat } = pd.settings;
  // TODO teach export how to handle all the new optional columns?
  let exportString = "";
  cardIds.forEach(key => {
    let add = exportFormat + "";
    const card = db.card(key);
    if (card) {
      const name = replaceAll(card.name, "///", "//");
      const count = pd.cards.cards[key] === 9999 ? 1 : pd.cards.cards[key] ?? 0;
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
  ipcSend("save_user_settings", { collectionTableState, skipRefresh: true });
}

function saveTableMode(collectionTableMode: string): void {
  ipcSend("save_user_settings", { collectionTableMode, skipRefresh: true });
}

function getCollectionData(): CardsData[] {
  const wantedCards: CardCounts = {};
  pd.deckList
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
        const owned = pd.cards.cards[card.id] ?? 0;
        const acquired = pd.cardsNew[card.id] ?? 0;
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
  const { collectionTableMode, collectionTableState } = pd.settings;
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
