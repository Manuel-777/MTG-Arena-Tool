/* eslint-disable max-statements, complexity, @typescript-eslint/no-use-before-define */
import { COLORS_BRIEF } from "../../shared/constants";
import db from "../../shared/database";
import pd from "../../shared/player-data";
import { queryElements as $$, createDiv } from "../../shared/dom-fns";
import { collectionSortRarity } from "../../shared/util";

import createSelect from "../createSelect";

let sortingAlgorithm = "Sort by Set";
let displayMode = "Card View";
let filteredSets: any = [];
let filteredMana: any = [];

export function getDisplayMode(): string {
  return displayMode;
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

export function renderCollectionFilters(
  container: HTMLElement,
  updateCallback: () => void,
  exportCallback: () => void
): void {
  const orderedSets = db.sortedSetCodes.filter(
    code => db.sets[code].collation !== -1
  );

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
      updateCallback();
    }
  });

  let searchButton = createDiv(["button_simple", "button_thin"], "Search");
  searchButton.style.width = "100px";
  flrt.appendChild(searchButton);

  searchButton.addEventListener("click", () => {
    updateCallback();
  });

  createSelect(
    fllb,
    ["Card View", "Chart View", "Set View"],
    displayMode,
    res => {
      displayMode = res;
      updateCallback();
    },
    "query_display_mode"
  );

  if (displayMode === "Card View") {
    const sortby = [
      "Sort by Set",
      "Sort by Name",
      "Sort by Rarity",
      "Sort by CMC"
    ];
    createSelect(
      flrb,
      sortby,
      sortingAlgorithm,
      res => {
        sortingAlgorithm = res;
        updateCallback();
      },
      "query_sort_by"
    );
  }

  const exp = createDiv(["button_simple", "button_thin"], "Export");
  exp.style.width = "100px";
  exp.addEventListener("click", exportCallback);
  flrb.appendChild(exp);

  const reset = createDiv(["button_simple", "button_thin"], "Reset");
  reset.style.width = "100px";
  reset.addEventListener("click", () => {
    resetFilters(updateCallback);
  });
  flrt.appendChild(reset);

  const advButton = createDiv(["button_simple", "button_thin"], "Advanced");
  advButton.style.width = "100px";
  advButton.addEventListener("click", () => {
    expandFilters(container);
  });
  flrt.appendChild(advButton);

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
    '<div class="icon_search_booster"></div>In boosters only',
    "query_in_boosters",
    false
  );

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

  searchButton.addEventListener("click", updateCallback);

  container.appendChild(basicFilters);
  container.appendChild(filters);

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

function expandFilters(container: HTMLElement): void {
  container.style.overflow = "hidden";
  setTimeout(() => {
    container.removeAttribute("style");
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

function resetFilters(updateCallback: () => void): void {
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
  getInputById("query_in_boosters").checked = true;
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

  updateCallback();
}

export function getFilteredCardIds(): (number | string)[] {
  const cardIds: Set<number | string> = new Set();

  const filterName = getInputById("query_name")?.value?.toLowerCase();
  const filterType = getInputById("query_type")?.value?.toLowerCase();
  const filterInBoosters = getInputById("query_in_boosters");
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

  const list = db.cardIds ?? [];
  cardLoop: for (let n = 0; n < list.length; n++) {
    const key = list[n];

    const grpId = key;
    const card = db.card(grpId);
    if (!card || !card.images || !card.collectible) {
      continue;
    }
    if (filterInBoosters?.checked && !card.booster) {
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

export function sortCardIds(cardIds: (string | number)[]): void {
  let sortFn = collectionSortSet;
  switch (sortingAlgorithm) {
    default:
    case "Sort by Set":
      sortFn = collectionSortSet;
      break;
    case "Sort by Name":
      sortFn = collectionSortName;
      break;
    case "Sort by Rarity":
      sortFn = collectionSortRarity;
      break;
    case "Sort by CMC":
      sortFn = collectionSortCmc;
      break;
  }
  cardIds.sort(sortFn);
}
