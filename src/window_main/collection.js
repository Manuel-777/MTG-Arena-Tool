/* eslint-disable max-statements, complexity */
import { remote } from "electron";
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

import { COLORS_BRIEF } from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import { queryElements as $$, createDiv } from "../shared/dom-fns";
import createSelect from "./createSelect";
import { addCardHover, attachOwnerhipStars } from "../shared/cardHover";
import {
  collectionSortRarity,
  getCardImage,
  openScryfallCard,
  replaceAll
} from "../shared/util";
import { hideLoadingBars, ipcSend, resetMainContainer } from "./renderer-util";
import { openSetStats } from "./collectionStats";

let collectionPage = 0;
let sortingAlgorithm = "Sort by Set";
let filteredSets;
let filteredMana;

//
function get_collection_export(exportFormat) {
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
      add = add.replace("$Cmc", card.cmc);
      list += add + "\r\n";
    }
  });

  return list;
}

//
function collectionSortCmc(a, b) {
  a = db.card(a);
  b = db.card(b);
  if (parseInt(a.cmc) < parseInt(b.cmc)) return -1;
  if (parseInt(a.cmc) > parseInt(b.cmc)) return 1;

  if (a.set < b.set) return -1;
  if (a.set > b.set) return 1;

  if (parseInt(a.cid) < parseInt(b.cid)) return -1;
  if (parseInt(a.cid) > parseInt(b.cid)) return 1;
  return 0;
}

//
function collectionSortSet(a, b) {
  a = db.card(a);
  b = db.card(b);
  if (a.set < b.set) return -1;
  if (a.set > b.set) return 1;

  if (parseInt(a.cid) < parseInt(b.cid)) return -1;
  if (parseInt(a.cid) > parseInt(b.cid)) return 1;
  return 0;
}

//
function collectionSortName(a, b) {
  a = db.card(a);
  b = db.card(b);
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

//
export function openCollectionTab() {
  filteredSets = [];
  filteredMana = [];
  const orderedSets = db.sortedSetCodes.filter(
    code => db.sets[code].collation !== -1
  );

  hideLoadingBars();
  let mainDiv;
  mainDiv = document.getElementById("ux_1");
  mainDiv.innerHTML = "";
  mainDiv.classList.remove("flex_item");
  mainDiv = resetMainContainer();

  let div = createDiv(["inventory"]);

  let basicFilters = createDiv(["inventory_filters_basic"]);

  let fll = createDiv(["inventory_flex_half"]);
  let flr = createDiv(["inventory_flex_half"]);

  let fllt = createDiv(["inventory_flex"]);
  let fllb = createDiv(["inventory_flex"]);
  let flrt = createDiv(["inventory_flex"]);
  let flrb = createDiv(["inventory_flex"]);

  let icd = createDiv(["input_container_inventory"]);

  let label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Search";
  icd.appendChild(label);

  let input = document.createElement("input");
  input.id = "query_name";
  input.autocomplete = "off";
  input.type = "search";

  icd.appendChild(input);
  fllt.appendChild(icd);

  input.addEventListener("keydown", function(e) {
    if (e.keyCode == 13) {
      printCollectionPage();
    }
  });

  let searchButton = createDiv(["button_simple", "button_thin"], "Search");
  flrt.appendChild(searchButton);

  let advancedButton = createDiv(
    ["button_simple", "button_thin"],
    "Advanced Filters"
  );
  flrt.appendChild(advancedButton);

  searchButton.addEventListener("click", () => {
    printCollectionPage();
  });

  advancedButton.addEventListener("click", () => {
    expandFilters();
  });

  let sortby = ["Sort by Set", "Sort by Name", "Sort by Rarity", "Sort by CMC"];
  createSelect(
    fllb,
    sortby,
    sortingAlgorithm,
    res => {
      sortingAlgorithm = res;
      printCollectionPage();
    },
    "query_select"
  );

  let exp = createDiv(["button_simple", "button_thin"], "Export Collection");
  fllb.appendChild(exp);

  let reset = createDiv(["button_simple", "button_thin"], "Reset");
  flrb.appendChild(reset);

  let stats = createDiv(["button_simple", "button_thin"], "Collection Stats");
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
  let filters = createDiv(["inventory_filters"]);

  let flex = createDiv(["inventory_flex_half"]);

  icd = createDiv(["input_container_inventory"]);
  icd.style.paddingBottom = "8px";

  // Type line input
  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Type line";
  icd.appendChild(label);

  let typeInput = document.createElement("input");
  typeInput.id = "query_type";
  typeInput.autocomplete = "off";
  typeInput.type = "search";

  icd.appendChild(typeInput);
  flex.appendChild(icd);
  filters.appendChild(flex);

  let sets = createDiv(["sets_container"]);

  orderedSets.forEach(set => {
    let setbutton = createDiv(["set_filter", "set_filter_on"]);
    const svgData = db.sets[set].svg;
    setbutton.style.backgroundImage = `url(data:image/svg+xml;base64,${svgData})`;
    setbutton.title = set;

    sets.appendChild(setbutton);
    setbutton.addEventListener("click", () => {
      if (!setbutton.classList.toggle("set_filter_on")) {
        filteredSets.push(set);
      } else {
        let n = filteredSets.indexOf(set);
        if (n > -1) {
          filteredSets.splice(n, 1);
        }
      }
    });
  });
  filters.appendChild(sets);

  let manas = createDiv(["sets_container"]);
  let ms = ["w", "u", "b", "r", "g"];
  ms.forEach(function(s, i) {
    let mi = [1, 2, 3, 4, 5];
    let manabutton = createDiv(["mana_filter_search", "mana_filter_on"]);
    manabutton.style.backgroundImage = `url(../images/${s}64.png)`;

    manas.appendChild(manabutton);
    manabutton.addEventListener("click", () => {
      if (!manabutton.classList.toggle("mana_filter_on")) {
        filteredMana.push(mi[i]);
      } else {
        let n = filteredMana.indexOf(mi[i]);
        if (n > -1) {
          filteredMana.splice(n, 1);
        }
      }
    });
  });
  filters.appendChild(manas);

  let main_but_cont = createDiv(["main_buttons_container"]);
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
  main_but_cont.appendChild(cont);

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
  main_but_cont.appendChild(cont);

  cont = createDiv(["buttons_container"]);
  icd = createDiv(["input_container_inventory", "auto_width"]);

  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "CMC:";
  icd.appendChild(label);

  let inputCmc = document.createElement("input");
  inputCmc.style.maxWidth = "80px";
  inputCmc.id = "query_cmc";
  inputCmc.autocomplete = "off";
  inputCmc.type = "number";

  icd.appendChild(inputCmc);
  cont.appendChild(icd);

  let checkboxCmcHigher = addCheckboxSearch(
    cont,
    "Higher than",
    "query_cmchigher",
    false,
    true
  );
  addCheckboxSearch(cont, "Equal to", "query_cmcequal", true);
  let checkboxCmcLower = addCheckboxSearch(
    cont,
    "Lower than",
    "query_cmclower",
    false,
    true
  );

  main_but_cont.appendChild(cont);
  filters.appendChild(main_but_cont);

  cont = createDiv(["buttons_container"]);
  icd = createDiv(["input_container_inventory", "auto_width"]);

  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Owned Qty:";
  icd.appendChild(label);

  let inputQty = document.createElement("input");
  inputQty.style.maxWidth = "80px";
  inputQty.id = "query_qty";
  inputQty.autocomplete = "off";
  inputQty.type = "number";
  inputQty.min = "0";
  inputQty.max = "4";

  icd.appendChild(inputQty);
  cont.appendChild(icd);
  let checkboxQtyHigher = addCheckboxSearch(
    cont,
    "Higher than",
    "query_qtyhigher",
    false,
    true
  );
  addCheckboxSearch(cont, "Equal to", "query_qtyequal", true);
  let checkboxQtyLower = addCheckboxSearch(
    cont,
    "Lower than",
    "query_qtylower",
    false,
    true
  );

  main_but_cont.appendChild(cont);
  filters.appendChild(main_but_cont);

  searchButton = createDiv(["button_simple", "button_thin"], "Search");
  searchButton.style.margin = "24px auto";
  filters.appendChild(searchButton);

  searchButton.addEventListener("click", () => {
    printCollectionPage();
  });

  mainDiv.appendChild(basicFilters);
  mainDiv.appendChild(filters);
  mainDiv.appendChild(div);

  checkboxCmcLower.addEventListener("change", () => {
    if (document.getElementById("query_cmclower").checked == true) {
      document.getElementById("query_cmchigher").checked = false;
    }
  });

  checkboxCmcHigher.addEventListener("change", () => {
    if (document.getElementById("query_cmchigher").checked == true) {
      document.getElementById("query_cmclower").checked = false;
    }
  });

  checkboxQtyLower.addEventListener("change", () => {
    if (document.getElementById("query_qtylower").checked == true) {
      document.getElementById("query_qtyhigher").checked = false;
    }
  });

  checkboxQtyHigher.addEventListener("change", () => {
    if (document.getElementById("query_qtyhigher").checked == true) {
      document.getElementById("query_qtylower").checked = false;
    }
  });

  printCards();
}

//
function addCheckboxSearch(div, label, iid, def, toggle = false) {
  let labelCheck = document.createElement("label");
  labelCheck.classList.add("check_container");
  labelCheck.classList.add("hover_label");
  labelCheck.innerHTML = label;

  let inputCheck = document.createElement("input");
  inputCheck.type = "checkbox";
  inputCheck.id = iid;
  inputCheck.innerHTML = label;
  inputCheck.checked = def;

  let spanCheck = document.createElement("span");
  spanCheck.classList.add("checkmark");
  if (toggle) spanCheck.style.borderRadius = "100%";

  labelCheck.appendChild(inputCheck);
  labelCheck.appendChild(spanCheck);
  div.appendChild(labelCheck);

  return inputCheck;
}

function expandFilters() {
  let mainDiv = document.getElementById("ux_0");
  mainDiv.style.overflow = "hidden";
  setTimeout(() => {
    mainDiv.removeAttribute("style");
  }, 1000);

  let div = $$(".inventory_filters")[0];
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

function resetFilters() {
  filteredSets = [];
  filteredMana = [];

  $$(".set_filter").forEach(div => {
    div.classList.remove("set_filter_on");
    div.classList.add("set_filter_on");
  });
  $$(".mana_filter_search").forEach(div => {
    div.classList.remove("mana_filter_on");
    div.classList.add("mana_filter_on");
  });

  document.getElementById("query_name").value = "";
  document.getElementById("query_type").value = "";
  document.getElementById("query_new").checked = false;
  document.getElementById("query_multicolor").checked = false;
  document.getElementById("query_exclude").checked = false;

  document.getElementById("query_common").checked = false;
  document.getElementById("query_uncommon").checked = false;
  document.getElementById("query_rare").checked = false;
  document.getElementById("query_mythic").checked = false;

  document.getElementById("query_cmc").value = "";
  document.getElementById("query_cmclower").checked = false;
  document.getElementById("query_cmcequal").checked = true;
  document.getElementById("query_cmchigher").checked = false;

  document.getElementById("query_qtylower").checked = false;
  document.getElementById("query_qtyequal").checked = true;
  document.getElementById("query_qtyhigher").checked = false;

  printCollectionPage();
}

//
function exportCollection() {
  let list = get_collection_export(pd.settings.export_format);
  ipcSend("export_csvtxt", { str: list, name: "collection" });
}

function sortCollection(alg) {
  sortingAlgorithm = alg;
  printCollectionPage();
}

//
function printCards() {
  let mainDiv = document.getElementById("ux_0");
  mainDiv.style.overflow = "hidden";

  let div = $$(".inventory_filters")[0];
  div.style.height = "0px";
  div.style.opacity = 0;
  $$(".inventory")[0].style.display = "flex";

  div = $$(".inventory")[0];
  div.innerHTML = "";

  let paging = createDiv(["paging_container"]);
  div.appendChild(paging);

  let filterName = document.getElementById("query_name").value.toLowerCase();
  let filterType = document.getElementById("query_type").value.toLowerCase();
  let filterNew = document.getElementById("query_new");
  let filterMulti = document.getElementById("query_multicolor");
  let filterExclude = document.getElementById("query_exclude");

  let filterCommon = document.getElementById("query_common").checked;
  let filterUncommon = document.getElementById("query_uncommon").checked;
  let filterRare = document.getElementById("query_rare").checked;
  let filterMythic = document.getElementById("query_mythic").checked;
  let filterAnyRarityChecked =
    filterCommon || filterUncommon || filterRare || filterMythic;

  let filterCMC = document.getElementById("query_cmc").value;
  let filterCmcLower = document.getElementById("query_cmclower").checked;
  let filterCmcEqual = document.getElementById("query_cmcequal").checked;
  let filterCmcHigher = document.getElementById("query_cmchigher").checked;

  let filterQty = document.getElementById("query_qty").value;
  let filterQtyLower = document.getElementById("query_qtylower").checked;
  let filterQtyEqual = document.getElementById("query_qtyequal").checked;
  let filterQtyHigher = document.getElementById("query_qtyhigher").checked;

  let totalCards = 0;
  let list;
  if (filterQty == 0 || filterQtyLower) {
    list = db.cardIds;
  } else {
    list = Object.keys(pd.cards.cards);
  }

  let keysSorted = [...list];
  if (sortingAlgorithm == "Sort by Set") keysSorted.sort(collectionSortSet);
  if (sortingAlgorithm == "Sort by Name") keysSorted.sort(collectionSortName);
  if (sortingAlgorithm == "Sort by Rarity")
    keysSorted.sort(collectionSortRarity);
  if (sortingAlgorithm == "Sort by CMC") keysSorted.sort(collectionSortCmc);

  cardLoop: for (let n = 0; n < keysSorted.length; n++) {
    let key = keysSorted[n];

    let grpId = key;
    let card = db.card(grpId);
    let name = card.name.toLowerCase();
    let type = card.type.toLowerCase();
    let rarity = card.rarity;
    let cost = card.cost;
    let cmc = card.cmc;
    let set = card.set;

    if (card.images == undefined) continue;
    if (!card.collectible) continue;

    // Filter name
    let arr;
    arr = filterName.split(" ");
    for (let m = 0; m < arr.length; m++) {
      if (name.indexOf(arr[m]) == -1) {
        continue cardLoop;
      }
    }

    // filter type
    arr = filterType.split(" ");
    for (let t = 0; t < arr.length; t++) {
      if (type.indexOf(arr[t]) == -1) {
        continue cardLoop;
      }
    }

    if (filterNew.checked && pd.cardsNew[key] === undefined) {
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
      let s = [];
      let generic = false;
      for (let i = 0; i < cost.length; i++) {
        let m = cost[i];
        for (let j = 0; j < COLORS_BRIEF.length; j++) {
          let code = COLORS_BRIEF[j];
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

      let ms = s.reduce((a, b) => a + b, 0);
      if (generic && ms == 0 && filterExclude.checked) {
        continue;
      }
      if (filteredMana.length > 0) {
        let su = 0;
        filteredMana.forEach(function(m) {
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

    totalCards++;

    if (
      totalCards < collectionPage * 100 ||
      totalCards > collectionPage * 100 + 99
    ) {
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
      if (db.card(grpId).dfc == "SplitHalf") {
        card = db.card(card.dfcId);
      }
      //let newname = card.name.split(' ').join('-');
      openScryfallCard(card);
    });

    addCardMenu(img, card);

    div.appendChild(cardDiv);
  }

  let paging_bottom = createDiv(["paging_container"]);
  div.appendChild(paging_bottom);
  let but, butClone;
  if (collectionPage <= 0) {
    but = createDiv(["paging_button_disabled"], " < ");
    butClone = but.cloneNode(true);
  } else {
    but = createDiv(["paging_button"], " < ");

    but.addEventListener("click", () => {
      printCollectionPage(collectionPage - 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      printCollectionPage(collectionPage + 1);
    });
  }

  paging.appendChild(but);
  paging_bottom.appendChild(butClone);

  let totalPages = Math.ceil(totalCards / 100);
  for (let n = 0; n < totalPages; n++) {
    but = createDiv(["paging_button"], n + 1);
    if (collectionPage == n) {
      but.classList.add("paging_active");
    }

    let page = n;
    but.addEventListener("click", () => {
      printCollectionPage(page);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      printCollectionPage(page);
    });

    paging.append(but);
    paging_bottom.append(butClone);
  }
  if (collectionPage >= totalPages - 1) {
    but = createDiv(["paging_button_disabled"], " > ");
    butClone = but.cloneNode(true);
  } else {
    but = createDiv(["paging_button"], " > ");
    but.addEventListener("click", () => {
      printCollectionPage(collectionPage + 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      printCollectionPage(collectionPage + 1);
    });
  }
  paging.appendChild(but);
  paging_bottom.appendChild(butClone);

  setTimeout(() => {
    mainDiv.removeAttribute("style");
  }, 1000);
}

function addCardMenu(div, card) {
  if (!(card.set in db.sets)) return;
  let arenaCode = `1 ${card.name} (${db.sets[card.set].arenacode}) ${card.cid}`;
  div.addEventListener(
    "contextmenu",
    e => {
      e.preventDefault();
      let menu = new Menu();
      let menuItem = new MenuItem({
        label: "Copy Arena code",
        click: () => {
          remote.clipboard.writeText(arenaCode);
        }
      });
      menu.append(menuItem);
      menu.popup(remote.getCurrentWindow());
    },
    false
  );
}

//
function printCollectionPage(page = 0) {
  collectionPage = page;
  printCards();
}
