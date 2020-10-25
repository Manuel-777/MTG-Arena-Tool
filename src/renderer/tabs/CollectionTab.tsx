import { remote } from "electron";
import React from "react";
import { TableState } from "react-table";
import { constants, Colors, Deck, DbCardData } from "mtgatool-shared";
import db from "../../shared/database-wrapper";
import replaceAll from "../../shared/utils/replaceAll";
import CollectionTable from "../components/collection/CollectionTable";
import { CardsData } from "../components/collection/types";

import {
  getMissingCardCounts,
  getCardFormats,
  getCardBanned,
  getCardSuspended,
  getCardIsCraftable,
  getCardInBoosters,
} from "../rendererUtil";
import { ipcSend } from "../ipcSend";
import { CardCounts } from "../components/decks/types";
import { reduxAction } from "../../shared/redux/sharedRedux";
import store, { AppState } from "../../shared/redux/stores/rendererStore";
import { decksList } from "../../shared/store";
import { useSelector } from "react-redux";

import appCss from "../app/app.css";
import { PlayerData } from "../../shared/redux/slices/playerDataSlice";
import { getRarityFilterVal } from "../components/collection/filters";
import {
  FACE_ADVENTURE,
  FACE_DFC_BACK,
  FACE_MODAL_BACK,
  FACE_SPLIT,
} from "mtgatool-shared/dist/shared/constants";

const { DRAFT_RANKS, IPC_ALL, IPC_RENDERER, DRAFT_RANKS_LOLA } = constants;

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
        },
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
  cardIds.forEach((key) => {
    let add = exportFormat + "";
    const card = db.card(parseInt(key));
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
    { type: "SET_SETTINGS", arg: { collectionTableState } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function saveMode(collectionMode: string): void {
  reduxAction(
    store.dispatch,
    { type: "SET_SETTINGS", arg: { collectionMode } },
    IPC_ALL ^ IPC_RENDERER
  );
}

function getCollectionData(
  cards: PlayerData["cards"],
  cardsNew: PlayerData["cardsNew"]
): CardsData[] {
  const wantedCards: CardCounts = {};
  decksList()
    .filter((deck) => deck && !deck.archived)
    .forEach((deck) => {
      const missing = getMissingCardCounts(new Deck(deck));
      Object.entries(missing).forEach(([grpid, count]) => {
        wantedCards[grpid] = Math.max(wantedCards[grpid] ?? 0, count);
      });
    });
  return db.cardList
    .filter(
      (card) =>
        card.dfc !== FACE_DFC_BACK &&
        card.dfc !== FACE_ADVENTURE &&
        card.dfc !== FACE_SPLIT &&
        card.dfc !== FACE_MODAL_BACK
    )
    .map(
      (card): CardsData => {
        const dfc = db.card(card.dfcId !== true ? card.dfcId || 0 : 0);
        const dfcName = dfc?.name.toLowerCase() || "";
        const RANK_SOURCE = card.source == 0 ? DRAFT_RANKS : DRAFT_RANKS_LOLA;
        const rarityVal = getRarityFilterVal(card.rarity);
        const name = card.name.toLowerCase() + " " + dfcName;
        const type = card.type.toLowerCase();
        const artist = card.artist.toLowerCase();
        const set = card.set;
        const owned = cards.cards[card.id] ?? 0;
        const acquired = cardsNew[card.id] ?? 0;
        const wanted = wantedCards[card.id] ?? 0;
        const colorsObj = new Colors();
        colorsObj.addFromCost(card.cost);
        const colorSortVal = colorsObj.get().join("");
        const colors = colorsObj.getBits();
        const rankSortVal = RANK_SOURCE[card.rank] ?? "?";
        const setCode = db.sets[card.set]?.scryfall ?? card.set;
        const format = getCardFormats(card);
        const banned = getCardBanned(card);
        const suspended = getCardSuspended(card);
        const craftable = getCardIsCraftable(card);
        const booster = getCardInBoosters(card);
        return {
          ...card,
          name,
          type,
          artist,
          set,
          owned,
          acquired,
          colors,
          colorSortVal,
          wanted,
          rankSortVal,
          rarityVal,
          setCode,
          format,
          banned,
          suspended,
          craftable,
          booster,
        };
      }
    );
}

export default function CollectionTab(): JSX.Element {
  const { cards, cardsNew } = useSelector(
    (state: AppState) => state.playerdata
  );
  const settings = useSelector((state: AppState) => state.settings);
  const { collectionMode, collectionTableState } = settings;
  const data = React.useMemo(() => {
    return getCollectionData(cards, cardsNew);
  }, [cards, cardsNew]);

  return (
    <div className={appCss.uxItem}>
      <CollectionTable
        cachedState={collectionTableState}
        cachedTableMode={collectionMode}
        contextMenuCallback={addCardMenu}
        data={data}
        exportCallback={exportCards}
        modeCallback={saveMode}
        tableStateCallback={saveTableState}
      />
    </div>
  );
}
