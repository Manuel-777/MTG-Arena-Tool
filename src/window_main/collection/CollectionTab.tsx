import { remote } from "electron";
import React from "react";
import { TableState } from "react-table";
import { addCardHover } from "../../shared/cardHover";
import Colors from "../../shared/colors";
import { DRAFT_RANKS } from "../../shared/constants";
import db from "../../shared/database";
import { createDiv } from "../../shared/dom-fns";
import pd from "../../shared/player-data";
import { DbCardData } from "../../shared/types/Metadata";
import {
  getMissingCardCounts,
  openScryfallCard,
  replaceAll
} from "../../shared/util";
import CollectionTable from "../components/collection/CollectionTable";
import { CardsData } from "../components/collection/types";
import mountReactComponent from "../mountReactComponent";
import {
  hideLoadingBars,
  ipcSend,
  makeResizable,
  resetMainContainer
} from "../renderer-util";
import {
  CollectionStats,
  createInventoryStats,
  getCollectionStats
} from "./collectionStats";

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
        .replace("$Count", count)
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
  const wantedCards: { [key: string]: number } = {};
  pd.deckList
    .filter(deck => deck && !deck.archived)
    .forEach(deck => {
      const missing = getMissingCardCounts(deck);
      Object.entries(missing).forEach(([grpid, count]) => {
        wantedCards[grpid] = Math.max(wantedCards[grpid] ?? 0, count);
      });
    });
  return db.cardList
    .filter(card => card.collectible && card.rarity !== "land")
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

function updateStatsPanel(
  container: HTMLElement,
  stats: CollectionStats
): void {
  container.innerHTML = "";
  const drag = createDiv(["dragger"]);
  container.appendChild(drag);
  makeResizable(drag);
  createInventoryStats(container, stats.complete, openCollectionTab);
}

export function CollectionTab(): JSX.Element {
  const {
    collectionTableMode,
    collectionTableState,
    right_panel_width: panelWidth
  } = pd.settings;
  const data = React.useMemo(() => getCollectionData(), []);

  const sidePanelWidth = panelWidth + "px";
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const filterDataCallback = React.useCallback(
    (data: CardsData[]): void => {
      if (rightPanelRef?.current) {
        const cardIds = data.map(card => card.id);
        const stats = getCollectionStats(cardIds);
        updateStatsPanel(rightPanelRef.current, stats);
      }
    },
    [rightPanelRef]
  );
  return (
    <>
      <div className={"wrapper_column"}>
        <CollectionTable
          cachedState={collectionTableState}
          cachedTableMode={collectionTableMode}
          cardHoverCallback={addCardHover}
          contextMenuCallback={addCardMenu}
          data={data}
          exportCallback={exportCards}
          filterDataCallback={filterDataCallback}
          openCardCallback={openScryfallCard}
          tableModeCallback={saveTableMode}
          tableStateCallback={saveTableState}
        />
      </div>
      <div
        ref={rightPanelRef}
        className={"wrapper_column sidebar_column_l"}
        style={{
          width: sidePanelWidth,
          flex: `0 0 ${sidePanelWidth}`
        }}
      ></div>
    </>
  );
}

export function openCollectionTab(): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer() as HTMLElement;
  mainDiv.classList.add("flex_item");
  mountReactComponent(<CollectionTab />, mainDiv);
}
