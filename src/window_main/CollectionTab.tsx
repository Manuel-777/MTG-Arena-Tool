/* eslint-disable max-statements, complexity, @typescript-eslint/no-use-before-define */
import { remote } from "electron";
import React from "react";

import { COLORS_BRIEF } from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import { queryElements as $$, createDiv } from "../shared/dom-fns";
import { addCardHover, attachOwnerhipStars } from "../shared/cardHover";
import {
  collectionSortRarity,
  getCardImage,
  openScryfallCard,
  replaceAll
} from "../shared/util";
import { DbCardData } from "../shared/types/Metadata";

import createSelect from "./createSelect";
import mountReactComponent from "./mountReactComponent";
import { hideLoadingBars, ipcSend, resetMainContainer } from "./renderer-util";
import { openSetStats } from "./collectionStats";

// import CollectionTable from "./components/collection/CollectionTable";

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

let collectionPage = 0;
let sortingAlgorithm = "Sort by Set";
let filteredSets: any;
let filteredMana: any;

function getCollectionExport(exportFormat: string): string {
  let list = "";
  Object.keys(pd.cards.cards).forEach(key => {
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
      list += add + "\r\n";
    }
  });

  return list;
}

function collectionSortCmc(
  aId: string | number,
  bId: string | number
): -1 | 0 | 1 {
  const a = db.card(aId);
  const b = db.card(bId);
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  if (a.cmc < b.cmc) return -1;
  if (a.cmc > b.cmc) return 1;

  if (a.set < b.set) return -1;
  if (a.set > b.set) return 1;

  if (parseInt(a.cid) < parseInt(b.cid)) return -1;
  if (parseInt(a.cid) > parseInt(b.cid)) return 1;
  return 0;
}

function collectionSortSet(
  aId: string | number,
  bId: string | number
): -1 | 0 | 1 {
  const a = db.card(aId);
  const b = db.card(bId);
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  if (a.set < b.set) return -1;
  if (a.set > b.set) return 1;

  if (parseInt(a.cid) < parseInt(b.cid)) return -1;
  if (parseInt(a.cid) > parseInt(b.cid)) return 1;
  return 0;
}

function collectionSortName(
  aId: string | number,
  bId: string | number
): -1 | 0 | 1 {
  const a = db.card(aId);
  const b = db.card(bId);
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

function getInputById(id: string): HTMLInputElement {
  return (document.getElementById(id) ?? {}) as HTMLInputElement;
}

export function openCollectionTab(): void {
  filteredSets = [];
  filteredMana = [];

  hideLoadingBars();
  const detailDiv = document.getElementById("ux_1");
  if (detailDiv) {
    detailDiv.innerHTML = "";
    detailDiv.classList.remove("flex_item");
  }
  const mainDiv = resetMainContainer();
  if (!mainDiv) {
    return;
  }

  renderCollectionFilters();
  openCollectionPage();
  // mountReactComponent(<CollectionTable data={getFilteredCardIds()} />, mainDiv);
}

function renderCollectionFilters(): void {
  const mainDiv = document.getElementById("ux_0");
  if (!mainDiv) {
    return;
  }
  const orderedSets = db.sortedSetCodes.filter(
    code => db.sets[code].collation !== -1
  );

  const div = createDiv(["inventory"]);

  const basicFilters = createDiv(["inventory_filters_basic"]);

  const fll = createDiv(["inventory_flex_half"]);
  const flr = createDiv(["inventory_flex_half"]);

  const fllt = createDiv(["inventory_flex"]);
  const fllb = createDiv(["inventory_flex"]);
  const flrt = createDiv(["inventory_flex"]);
  const flrb = createDiv(["inventory_flex"]);

  let icd = createDiv(["input_container_inventory"]);

  let label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Search";
  icd.appendChild(label);

  const input = document.createElement("input");
  input.id = "query_name";
  input.autocomplete = "off";
  input.type = "search";

  icd.appendChild(input);
  fllt.appendChild(icd);

  input.addEventListener("keydown", function(e) {
    if (e.keyCode == 13) {
      openCollectionPage();
    }
  });

  let searchButton = createDiv(["button_simple", "button_thin"], "Search");
  flrt.appendChild(searchButton);

  const advancedButton = createDiv(
    ["button_simple", "button_thin"],
    "Advanced Filters"
  );
  flrt.appendChild(advancedButton);

  searchButton.addEventListener("click", () => {
    openCollectionPage();
  });

  advancedButton.addEventListener("click", () => {
    expandFilters();
  });

  const sortby = [
    "Sort by Set",
    "Sort by Name",
    "Sort by Rarity",
    "Sort by CMC"
  ];
  createSelect(
    fllb,
    sortby,
    sortingAlgorithm,
    res => {
      sortingAlgorithm = res;
      openCollectionPage();
    },
    "query_select"
  );

  const exp = createDiv(["button_simple", "button_thin"], "Export Collection");
  fllb.appendChild(exp);

  const reset = createDiv(["button_simple", "button_thin"], "Reset");
  flrb.appendChild(reset);

  const stats = createDiv(["button_simple", "button_thin"], "Collection Stats");
  flrb.appendChild(stats);

  exp.addEventListener("click", () => {
    exportCollection();
  });

  reset.addEventListener("click", () => {
    resetFilters();
  });

  stats.addEventListener("click", () => {
    openSetStats();
  });

  fll.appendChild(fllt);
  fll.appendChild(fllb);
  flr.appendChild(flrt);
  flr.appendChild(flrb);
  basicFilters.appendChild(fll);
  basicFilters.appendChild(flr);

  // "ADVANCED" FILTERS
  const filters = createDiv(["inventory_filters"]);

  const flex = createDiv(["inventory_flex_half"]);

  icd = createDiv(["input_container_inventory"]);
  icd.style.paddingBottom = "8px";

  // Type line input
  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Type line";
  icd.appendChild(label);

  const typeInput = document.createElement("input");
  typeInput.id = "query_type";
  typeInput.autocomplete = "off";
  typeInput.type = "search";

  icd.appendChild(typeInput);
  flex.appendChild(icd);
  filters.appendChild(flex);

  const sets = createDiv(["sets_container"]);

  orderedSets.forEach(set => {
    const setbutton = createDiv(["set_filter", "set_filter_on"]);
    const svgData = db.sets[set].svg;
    setbutton.style.backgroundImage = `url(data:image/svg+xml;base64,${svgData})`;
    setbutton.title = set;

    sets.appendChild(setbutton);
    setbutton.addEventListener("click", () => {
      if (!setbutton.classList.toggle("set_filter_on")) {
        filteredSets.push(set);
      } else {
        const n = filteredSets.indexOf(set);
        if (n > -1) {
          filteredSets.splice(n, 1);
        }
      }
    });
  });
  filters.appendChild(sets);

  const manas = createDiv(["sets_container"]);
  const ms = ["w", "u", "b", "r", "g"];
  ms.forEach(function(s, i) {
    const mi = [1, 2, 3, 4, 5];
    const manabutton = createDiv(["mana_filter_search", "mana_filter_on"]);
    manabutton.style.backgroundImage = `url(../images/${s}64.png)`;

    manas.appendChild(manabutton);
    manabutton.addEventListener("click", () => {
      if (!manabutton.classList.toggle("mana_filter_on")) {
        filteredMana.push(mi[i]);
      } else {
        const n = filteredMana.indexOf(mi[i]);
        if (n > -1) {
          filteredMana.splice(n, 1);
        }
      }
    });
  });
  filters.appendChild(manas);

  const mainButtonCont = createDiv(["main_buttons_container"]);
  let cont = createDiv(["buttons_container"]);

  addCheckboxSearch(
    cont,
    '<div class="icon_search_new"></div>Newly acquired only',
    "query_new",
    false
  );
  addCheckboxSearch(
    cont,
    '<div class="icon_search_multi"></div>Require multicolored',
    "query_multicolor",
    false
  );
  addCheckboxSearch(cont, "Exclude unselected colors", "query_exclude", false);
  mainButtonCont.appendChild(cont);

  cont = createDiv(["buttons_container"]);
  addCheckboxSearch(
    cont,
    '<div class="wc_common wc_search_icon"></div>Common',
    "query_common",
    false
  );
  addCheckboxSearch(
    cont,
    '<div class="wc_uncommon wc_search_icon"></div>Uncommon',
    "query_uncommon",
    false
  );
  addCheckboxSearch(
    cont,
    '<div class="wc_rare wc_search_icon"></div>Rare',
    "query_rare",
    false
  );
  addCheckboxSearch(
    cont,
    '<div class="wc_mythic wc_search_icon"></div>Mythic Rare',
    "query_mythic",
    false
  );
  mainButtonCont.appendChild(cont);

  cont = createDiv(["buttons_container"]);
  icd = createDiv(["input_container_inventory", "auto_width"]);

  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "CMC:";
  icd.appendChild(label);

  const inputCmc = document.createElement("input");
  inputCmc.style.maxWidth = "80px";
  inputCmc.id = "query_cmc";
  inputCmc.autocomplete = "off";
  inputCmc.type = "number";

  icd.appendChild(inputCmc);
  cont.appendChild(icd);

  const checkboxCmcHigher = addCheckboxSearch(
    cont,
    "Higher than",
    "query_cmchigher",
    false,
    true
  );
  addCheckboxSearch(cont, "Equal to", "query_cmcequal", true);
  const checkboxCmcLower = addCheckboxSearch(
    cont,
    "Lower than",
    "query_cmclower",
    false,
    true
  );

  mainButtonCont.appendChild(cont);
  filters.appendChild(mainButtonCont);

  cont = createDiv(["buttons_container"]);
  icd = createDiv(["input_container_inventory", "auto_width"]);

  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Owned Qty:";
  icd.appendChild(label);

  const inputQty = document.createElement("input");
  inputQty.style.maxWidth = "80px";
  inputQty.id = "query_qty";
  inputQty.autocomplete = "off";
  inputQty.type = "number";
  inputQty.min = "0";
  inputQty.max = "4";

  icd.appendChild(inputQty);
  cont.appendChild(icd);
  const checkboxQtyHigher = addCheckboxSearch(
    cont,
    "Higher than",
    "query_qtyhigher",
    false,
    true
  );
  addCheckboxSearch(cont, "Equal to", "query_qtyequal", true);
  const checkboxQtyLower = addCheckboxSearch(
    cont,
    "Lower than",
    "query_qtylower",
    false,
    true
  );

  mainButtonCont.appendChild(cont);
  filters.appendChild(mainButtonCont);

  searchButton = createDiv(["button_simple", "button_thin"], "Search");
  searchButton.style.margin = "24px auto";
  filters.appendChild(searchButton);

  searchButton.addEventListener("click", () => {
    openCollectionPage();
  });

  mainDiv.appendChild(basicFilters);
  mainDiv.appendChild(filters);
  mainDiv.appendChild(div);

  checkboxCmcLower.addEventListener("change", () => {
    if (getInputById("query_cmclower")?.checked == true) {
      getInputById("query_cmclower").checked = false;
    }
  });

  checkboxCmcHigher.addEventListener("change", () => {
    if (getInputById("query_cmchigher")?.checked == true) {
      getInputById("query_cmclower").checked = false;
    }
  });

  checkboxQtyLower.addEventListener("change", () => {
    if (getInputById("query_qtylower").checked == true) {
      getInputById("query_qtyhigher").checked = false;
    }
  });

  checkboxQtyHigher.addEventListener("change", () => {
    if (getInputById("query_qtyhigher").checked == true) {
      getInputById("query_qtylower").checked = false;
    }
  });
}

function addCheckboxSearch(
  div: HTMLElement,
  label: any,
  iid: string,
  def: boolean,
  toggle = false
): HTMLInputElement {
  const labelCheck = document.createElement("label");
  labelCheck.classList.add("check_container");
  labelCheck.classList.add("hover_label");
  labelCheck.innerHTML = label;

  const inputCheck = document.createElement("input");
  inputCheck.type = "checkbox";
  inputCheck.id = iid;
  inputCheck.innerHTML = label;
  inputCheck.checked = def;

  const spanCheck = document.createElement("span");
  spanCheck.classList.add("checkmark");
  if (toggle) spanCheck.style.borderRadius = "100%";

  labelCheck.appendChild(inputCheck);
  labelCheck.appendChild(spanCheck);
  div.appendChild(labelCheck);

  return inputCheck;
}

function expandFilters(): void {
  const mainDiv = document.getElementById("ux_0");
  if (!mainDiv) {
    return;
  }
  mainDiv.style.overflow = "hidden";
  setTimeout(() => {
    mainDiv.removeAttribute("style");
  }, 1000);

  const div = $$(".inventory_filters")[0];
  if (div.style.opacity == 1) {
    div.style.height = "0px";
    div.style.opacity = 0;
    $$(".inventory")[0].style.display = "flex";
  } else {
    div.style.height = "calc(100% - 122px)";
    div.style.opacity = 1;
    setTimeout(function() {
      $$(".inventory")[0].style.display = "none";
    }, 200);
  }
}

function resetFilters(): void {
  filteredSets = [];
  filteredMana = [];

  $$(".set_filter").forEach((div: HTMLElement) => {
    div.classList.remove("set_filter_on");
    div.classList.add("set_filter_on");
  });
  $$(".mana_filter_search").forEach((div: HTMLElement) => {
    div.classList.remove("mana_filter_on");
    div.classList.add("mana_filter_on");
  });

  getInputById("query_name").value = "";
  getInputById("query_type").value = "";
  getInputById("query_new").checked = false;
  getInputById("query_multicolor").checked = false;
  getInputById("query_exclude").checked = false;

  getInputById("query_common").checked = false;
  getInputById("query_uncommon").checked = false;
  getInputById("query_rare").checked = false;
  getInputById("query_mythic").checked = false;

  getInputById("query_cmc").value = "";
  getInputById("query_cmclower").checked = false;
  getInputById("query_cmcequal").checked = true;
  getInputById("query_cmchigher").checked = false;

  getInputById("query_qtylower").checked = false;
  getInputById("query_qtyequal").checked = true;
  getInputById("query_qtyhigher").checked = false;

  openCollectionPage();
}

function exportCollection(): void {
  const list = getCollectionExport(pd.settings.export_format);
  ipcSend("export_csvtxt", { str: list, name: "collection" });
}

function sortCollection(alg: string): void {
  sortingAlgorithm = alg;
  openCollectionPage();
}

function renderCardsTable(): void {
  const mainDiv = document.getElementById("ux_0");
  if (!mainDiv) {
    return;
  }
  mainDiv.style.overflow = "hidden";

  let div = $$(".inventory_filters")[0];
  div.style.height = "0px";
  div.style.opacity = 0;
  $$(".inventory")[0].style.display = "flex";

  div = $$(".inventory")[0];
  div.innerHTML = "";

  const paging = createDiv(["paging_container"]);
  div.appendChild(paging);

  const list = getFilteredCardIds();
  const totalCards = list.length;

  const keysSorted = [...list];
  if (sortingAlgorithm == "Sort by Set") keysSorted.sort(collectionSortSet);
  if (sortingAlgorithm == "Sort by Name") keysSorted.sort(collectionSortName);
  if (sortingAlgorithm == "Sort by Rarity")
    keysSorted.sort(collectionSortRarity);
  if (sortingAlgorithm == "Sort by CMC") keysSorted.sort(collectionSortCmc);

  for (let n = 0; n < keysSorted.length; n++) {
    const key = keysSorted[n];

    const grpId = key;
    const card = db.card(grpId);
    if (!card || !card.images || !card.collectible) {
      continue;
    }

    const cardDiv = createDiv(["inventory_card"]);
    cardDiv.style.width = pd.cardsSize + "px";
    attachOwnerhipStars(card, cardDiv);
    cardDiv.title = card.name;

    const img = document.createElement("img");
    img.style.width = pd.cardsSize + "px";
    img.classList.add("inventory_card_img");
    img.src = getCardImage(card);

    cardDiv.appendChild(img);

    //Don't show card hover, if collection card size is over 340px
    if (!(pd.cardsSize >= 340)) {
      addCardHover(img, card);
    }

    img.addEventListener("click", () => {
      // TODO handle split cards?
      // if (db.card(grpId)?.dfc == "SplitHalf") {
      //   card = db.card(card.dfcId ?? "");
      // }
      //let newname = card.name.split(' ').join('-');
      openScryfallCard(card);
    });

    addCardMenu(img, card);

    div.appendChild(cardDiv);
  }

  const pagingBottom = createDiv(["paging_container"]);
  div.appendChild(pagingBottom);
  let but, butClone;
  if (collectionPage <= 0) {
    but = createDiv(["paging_button_disabled"], " < ");
    butClone = but.cloneNode(true);
  } else {
    but = createDiv(["paging_button"], " < ");

    but.addEventListener("click", () => {
      openCollectionPage(collectionPage - 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      openCollectionPage(collectionPage + 1);
    });
  }

  paging.appendChild(but);
  pagingBottom.appendChild(butClone);

  const totalPages = Math.ceil(totalCards / 100);
  for (let n = 0; n < totalPages; n++) {
    but = createDiv(["paging_button"], String(n + 1));
    if (collectionPage == n) {
      but.classList.add("paging_active");
    }

    const page = n;
    but.addEventListener("click", () => {
      openCollectionPage(page);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      openCollectionPage(page);
    });

    paging.append(but);
    pagingBottom.append(butClone);
  }
  if (collectionPage >= totalPages - 1) {
    but = createDiv(["paging_button_disabled"], " > ");
    butClone = but.cloneNode(true);
  } else {
    but = createDiv(["paging_button"], " > ");
    but.addEventListener("click", () => {
      openCollectionPage(collectionPage + 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      openCollectionPage(collectionPage + 1);
    });
  }
  paging.appendChild(but);
  pagingBottom.appendChild(butClone);

  setTimeout(() => {
    mainDiv.removeAttribute("style");
  }, 1000);
}

function getFilteredCardIds(): (number | string)[] {
  const cardIds: Set<number | string> = new Set();

  const filterName = getInputById("query_name")?.value.toLowerCase();
  const filterType = getInputById("query_type")?.value.toLowerCase();
  const filterNew = getInputById("query_new");
  const filterMulti = getInputById("query_multicolor");
  const filterExclude = getInputById("query_exclude");

  const filterCommon = getInputById("query_common")?.checked;
  const filterUncommon = getInputById("query_uncommon")?.checked;
  const filterRare = getInputById("query_rare")?.checked;
  const filterMythic = getInputById("query_mythic")?.checked;
  const filterAnyRarityChecked =
    filterCommon || filterUncommon || filterRare || filterMythic;

  const filterCMC = parseInt(getInputById("query_cmc")?.value);
  const filterCmcLower = getInputById("query_cmclower")?.checked;
  const filterCmcEqual = getInputById("query_cmcequal")?.checked;
  const filterCmcHigher = getInputById("query_cmchigher")?.checked;

  const filterQty = parseInt(getInputById("query_qty")?.value);
  const filterQtyLower = getInputById("query_qtylower")?.checked;
  const filterQtyEqual = getInputById("query_qtyequal")?.checked;
  const filterQtyHigher = getInputById("query_qtyhigher")?.checked;

  let list;
  if (filterQty === 0 || filterQtyLower) {
    list = db.cardIds;
  } else {
    list = Object.keys(pd.cards.cards);
  }

  cardLoop: for (let n = 0; n < list.length; n++) {
    const key = list[n];

    const grpId = key;
    const card = db.card(grpId);
    if (!card || !card.images || !card.collectible) {
      continue;
    }
    const name = card.name.toLowerCase();
    const type = card.type.toLowerCase();
    const rarity = card.rarity;
    const cost = card.cost;
    const cmc = card.cmc;
    const set = card.set;

    // Filter name
    let arr;
    arr = filterName?.split(" ");
    for (let m = 0; m < arr.length; m++) {
      if (name.indexOf(arr[m]) == -1) {
        continue cardLoop;
      }
    }

    // filter type
    arr = filterType?.split(" ");
    for (let t = 0; t < arr.length; t++) {
      if (type.indexOf(arr[t]) == -1) {
        continue cardLoop;
      }
    }

    if (filterNew?.checked && pd.cardsNew[key] === undefined) {
      continue;
    }

    if (filteredSets.length > 0) {
      if (!filteredSets.includes(set)) {
        continue;
      }
    }

    if (filterCMC) {
      if (filterCmcLower && filterCmcEqual) {
        if (cmc > filterCMC) {
          continue;
        }
      } else if (filterCmcHigher && filterCmcEqual) {
        if (cmc < filterCMC) {
          continue;
        }
      } else if (filterCmcLower && !filterCmcEqual) {
        if (cmc >= filterCMC) {
          continue;
        }
      } else if (filterCmcHigher && !filterCmcEqual) {
        if (cmc <= filterCMC) {
          continue;
        }
      } else if (!filterCmcHigher && !filterCmcLower && filterCmcEqual) {
        if (cmc != filterCMC) {
          continue;
        }
      }
    }

    if (filterQty > 0) {
      const owned = pd.cards.cards[card.id];
      if (filterQtyLower && filterQtyEqual) {
        if (owned > filterQty) {
          continue;
        }
      } else if (filterQtyHigher && filterQtyEqual) {
        if (owned < filterQty) {
          continue;
        }
      } else if (filterQtyLower && !filterQtyEqual) {
        if (owned >= filterQty) {
          continue;
        }
      } else if (filterQtyHigher && !filterQtyEqual) {
        if (owned <= filterQty) {
          continue;
        }
      } else if (!filterQtyHigher && !filterQtyLower && filterQtyEqual) {
        if (owned != filterQty) {
          continue;
        }
      }
    }

    if (rarity == "land" && filterAnyRarityChecked && !filterCommon) continue;
    if (rarity == "common" && filterAnyRarityChecked && !filterCommon) continue;
    if (rarity == "uncommon" && filterAnyRarityChecked && !filterUncommon)
      continue;
    if (rarity == "rare" && filterAnyRarityChecked && !filterRare) continue;
    if (rarity == "mythic" && filterAnyRarityChecked && !filterMythic) continue;

    if (filterExclude.checked && cost.length == 0) {
      continue;
    } else {
      const s: number[] = [];
      let generic = false;
      for (let i = 0; i < cost.length; i++) {
        const m = cost[i];
        for (let j = 0; j < COLORS_BRIEF.length; j++) {
          const code = COLORS_BRIEF[j];
          if (m.indexOf(code) !== -1) {
            if (filterExclude.checked && !filteredMana.includes(j + 1)) {
              continue cardLoop;
            }
            s[j + 1] = 1;
          }
        }
        if (parseInt(m) > 0) {
          generic = true;
        }
      }

      const ms = s.reduce((a, b) => a + b, 0);
      if (generic && ms == 0 && filterExclude.checked) {
        continue;
      }
      if (filteredMana.length > 0) {
        let su = 0;
        filteredMana.forEach(function(m: number) {
          if (s[m] == 1) {
            su++;
          }
        });
        if (su == 0) {
          continue;
        }
      }
      if (filterMulti.checked && ms < 2) {
        continue;
      }
    }
    cardIds.add(grpId);
  }

  return [...cardIds];
}

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

function openCollectionPage(page = 0): void {
  collectionPage = page;
  renderCardsTable();
}
