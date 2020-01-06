import React from "react";
import { remote } from "electron";

import { DRAFT_RANKS } from "../../shared/constants";
import db from "../../shared/database";
import pd from "../../shared/player-data";
import { createDiv } from "../../shared/dom-fns";
import { addCardHover } from "../../shared/cardHover";
import { DbCardData } from "../../shared/types/Metadata";
import Colors from "../../shared/colors";
import {
  replaceAll,
  openScryfallCard,
  getMissingCardCounts
} from "../../shared/util";

import mountReactComponent from "../mountReactComponent";
import {
  hideLoadingBars,
  makeResizable,
  resetMainContainer,
  ipcSend
} from "../renderer-util";

import CollectionTable from "../components/collection/CollectionTable";
import {
  CardsData,
  CollectionTableState
} from "../components/collection/types";

import {
  createInventoryStats,
  getCollectionStats,
  CollectionStats
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
  let exportString = "";
  cardIds.forEach(key => {
    let add = exportFormat + "";
    const card = db.card(key);
    if (card) {
      let name = card.name;
      name = replaceAll(name, "///", "//");
      add = add.replace("$Name", '"' + name + '"');

      add = add.replace(
        "$Count",
        pd.cards.cards[key] === 9999 ? 1 : pd.cards.cards[key]
      );

      add = add.replace("$SetName", card.set);
      if (card.set in db.sets)
        add = add.replace("$SetCode", db.sets[card.set].code);
      add = add.replace("$Collector", card.cid);
      add = add.replace("$Rarity", card.rarity);
      add = add.replace("$Type", card.type);
      add = add.replace("$Cmc", card.cmc + "");
      exportString += add + "\r\n";
    }
  });
  return exportString;
}

function exportCards(cardIds: string[]): void {
  const exportString = getExportString(cardIds);
  ipcSend("export_csvtxt", { str: exportString, name: "cards" });
}

function saveUserState(state: CollectionTableState): void {
  ipcSend("save_user_settings", {
    collectionTableState: state,
    collectionTableMode: state.collectionTableMode,
    skip_refresh: true
  });
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
        const boosterSortVal = card.booster ? "yes" : "no";
        const rankSortVal = DRAFT_RANKS[card.rank] ?? "?";
        return {
          ...card,
          owned,
          acquired,
          colors,
          colorSortVal,
          wanted,
          boosterSortVal,
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
  const filterCallback = React.useCallback(
    (cardIds: string[]): void => {
      const stats = getCollectionStats(cardIds);
      if (rightPanelRef?.current) {
        updateStatsPanel(rightPanelRef.current, stats);
      }
    },
    [rightPanelRef]
  );
  return (
    <>
      <div
        className={"wrapper_column"}
        style={{
          overflowX: "auto"
        }}
      >
        <CollectionTable
          data={data}
          contextMenuCallback={addCardMenu}
          cachedState={collectionTableState}
          cachedTableMode={collectionTableMode}
          tableStateCallback={saveUserState}
          filterCallback={filterCallback}
          exportCallback={exportCards}
          openCardCallback={openScryfallCard}
          cardHoverCallback={addCardHover}
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