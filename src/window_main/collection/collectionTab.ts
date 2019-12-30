import { remote } from "electron";

import db from "../../shared/database";
import pd from "../../shared/player-data";
import { queryElements as $$, createDiv } from "../../shared/dom-fns";
import { DbCardData } from "../../shared/types/Metadata";

import {
  hideLoadingBars,
  makeResizable,
  resetMainContainer,
  ipcSend
} from "../renderer-util";
import { createCardsTable } from "./cardsTable";
import {
  getDisplayMode,
  getFilteredCardIds,
  renderCollectionFilters,
  sortCardIds
} from "./collectionFilters";
import { replaceAll } from "../../shared/util";
import {
  createInventoryStats,
  getCollectionStats,
  CollectionStats,
  renderSetStats,
  createWantedStats
} from "./collectionStats";
import createHeatMap from "./completionHeatMap";

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

function renderCardsTable(
  container: HTMLElement,
  cardIds: (string | number)[]
): void {
  const keysSorted = [...cardIds];
  sortCardIds(keysSorted);
  createCardsTable(container, keysSorted, addCardMenu);
}

function renderHeatMaps(container: HTMLElement, stats: CollectionStats): void {
  const chartContainer = createDiv(["main_stats", "sub_stats"]);
  db.sortedSetCodes.forEach(set => {
    const cardData = stats[set].cards;
    if (cardData.length > 0) {
      createHeatMap(chartContainer, cardData, set);
    }
  });
  container.appendChild(chartContainer);
}

function renderSetView(container: HTMLElement, stats: CollectionStats): void {
  const setContainer = createDiv(["main_stats", "sub_stats"]);
  db.sortedSetCodes.forEach(set => {
    // If the set has a collationId, it means boosters for it exists
    if (!db.sets[set]?.collation) {
      return; // skip non-booster sets
    }
    const setStats = stats[set];
    const cardData = setStats.cards;
    if (cardData.length > 0) {
      const rs = renderSetStats(setStats, set, set);
      setContainer.appendChild(rs);
      createWantedStats(setContainer, setStats);
    }
  });
  container.appendChild(setContainer);
}

function getExportString(exportFormat: string): string {
  const cardIds = getFilteredCardIds();
  const keysSorted = [...cardIds];
  sortCardIds(keysSorted);
  let exportString = "";
  keysSorted.forEach(key => {
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

function exportCards(): void {
  const list = getExportString(pd.settings.export_format);
  ipcSend("export_csvtxt", { str: list, name: "cards" });
}

function updateCollectionTab(): void {
  const wrapL = $$(".wrapper_column.main_column")[0];
  if (!wrapL) {
    return;
  }
  wrapL.style.overflow = "hidden";
  setTimeout(() => {
    wrapL.removeAttribute("style");
  }, 1000);
  const filterDiv = $$(".inventory_filters")[0];
  if (filterDiv) {
    filterDiv.style.height = "0px";
    filterDiv.style.opacity = 0;
  }
  const inventoryDiv = $$(".inventory")[0];
  if (!inventoryDiv) {
    return;
  }
  inventoryDiv.innerHTML = "";
  const statsDiv = $$(".inventory_stats")[0];
  if (!statsDiv) {
    return;
  }
  statsDiv.innerHTML = "";

  const cardIds = getFilteredCardIds();
  const stats = getCollectionStats(cardIds);
  const displayMode = getDisplayMode();
  switch (displayMode) {
    default:
    case "Card View":
      renderCardsTable(inventoryDiv, cardIds);
      break;
    case "Chart View":
      renderHeatMaps(inventoryDiv, stats);
      break;
    case "Set View":
      renderSetView(inventoryDiv, stats);
      break;
  }
  createInventoryStats(statsDiv, stats.complete, updateCollectionTab);
}

export function openCollectionTab(): void {
  hideLoadingBars();
  const mainDiv = resetMainContainer();
  if (!mainDiv) {
    return;
  }
  mainDiv.classList.add("flex_item");

  const wrapL = createDiv(["wrapper_column", "main_column"]);
  mainDiv.appendChild(wrapL);
  renderCollectionFilters(wrapL, updateCollectionTab, exportCards);
  const div = createDiv(["inventory"]);
  wrapL.appendChild(div);

  const wrapR = createDiv(["wrapper_column", "sidebar_column_l"]);
  wrapR.style.width = pd.settings.right_panel_width + "px";
  wrapR.style.flex = `0 0 ${wrapR.style.width}`;
  const drag = createDiv(["dragger"]);
  wrapR.appendChild(drag);
  makeResizable(drag);
  const detailDiv = createDiv(["inventory_stats"]);
  wrapR.appendChild(detailDiv);
  mainDiv.appendChild(wrapR);

  updateCollectionTab();
}
