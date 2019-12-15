import anime from "animejs";
import { remote } from "electron";
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

import {
  COLORS_BRIEF,
  CARD_RARITIES,
  EASING_DEFAULT
} from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import { queryElements as $$, createDiv } from "../shared/dom-fns";
import createSelect from "./createSelect";
import { addCardHover, attachOwnerhipStars } from "../shared/card-hover";
import {
  collectionSortRarity,
  getCardImage,
  getCardsMissingCount,
  openScryfallCard,
  replaceAll
} from "../shared/util";
import Colors from "../shared/colors";
import {
  MULTI,
  COLORLESS,
  WHITE,
  BLUE,
  BLACK,
  GREEN,
  RED
} from "../shared/constants.js";
import {
  hideLoadingBars,
  changeBackground,
  ipcSend,
  resetMainContainer
} from "./renderer-util";

let collectionPage = 0;
let sortingAlgorithm = "Sort by Set";
let filteredSets;
let filteredMana;
let orderedSets;

const ALL_CARDS = "All cards";
const SINGLETONS = "Singletons (at least one)";
const FULL_SETS = "Full sets (all 4 copies)";
const BOOSTER_CARDS = "Only in Boosters";

let countMode = ALL_CARDS;
let displayMode = BOOSTER_CARDS;
let defaultSetName = "Complete collection";

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
class CountStats {
  constructor(
    owned = 0,
    total = 0,
    unique = 0,
    complete = 0,
    wanted = 0,
    uniqueWanted = 0,
    uniqueOwned = 0
  ) {
    this.owned = owned;
    this.total = total;
    this.unique = unique;
    this.complete = complete; // all 4 copies of a card
    this.wanted = wanted;
    this.uniqueWanted = uniqueWanted;
    this.uniqueOwned = uniqueOwned;
  }

  get percentage() {
    if (this.total) {
      return (this.owned / this.total) * 100;
    } else {
      return 100;
    }
  }
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
class SetStats {
  constructor(set) {
    this.set = set;
    this.cards = [];
    this.common = new CountStats();
    this.uncommon = new CountStats();
    this.rare = new CountStats();
    this.mythic = new CountStats();
  }

  get all() {
    return [
      new CountStats(),
      this.common,
      this.uncommon,
      this.rare,
      this.mythic
    ].reduce((acc, c) => {
      acc.owned += c.owned;
      acc.total += c.total;
      acc.unique += c.unique;
      acc.complete += c.complete;
      acc.wanted += c.wanted;
      acc.uniqueOwned += c.uniqueOwned;
      return acc;
    });
  }
}

//
function get_collection_stats() {
  const stats = {
    complete: new SetStats("complete")
  };
  Object.keys(db.sets).forEach(
    setName => (stats[setName] = new SetStats(setName))
  );

  db.cardList.forEach(card => {
    if (!card.collectible || card.rarity === "land") return;
    if (!(card.set in stats)) return;
    if (!card.booster && displayMode == BOOSTER_CARDS) return;

    let obj = {
      id: card.id,
      owned: 0
    };
    let collation = db.sets[card.set].collation;
    // add to totals
    stats[card.set][card.rarity].total += 4;
    stats[card.set][card.rarity].unique += 1;
    stats.complete[card.rarity].total += 4;
    stats.complete[card.rarity].unique += 1;

    // add cards we own
    if (pd.cards.cards[card.id] !== undefined) {
      const owned = pd.cards.cards[card.id];
      obj.owned = owned;

      stats[card.set][card.rarity].owned += owned;
      stats[card.set][card.rarity].uniqueOwned += 1;
      stats.complete[card.rarity].owned += owned;
      stats.complete[card.rarity].uniqueOwned += 1;

      // count complete sets we own
      if (owned == 4) {
        stats[card.set][card.rarity].complete += 1;
        stats.complete[card.rarity].complete += 1;
      }
    }

    let col = new Colors();
    col.addFromCost(card.cost);
    let colorIndex = col.getBaseColor();

    // count cards we know we want across decks
    const wanted = Math.max(
      ...pd.deckList
        .filter(deck => deck && !deck.archived)
        .map(deck => getCardsMissingCount(deck, card.id))
    );
    stats[card.set][card.rarity].wanted += wanted;
    stats.complete[card.rarity].wanted += wanted;

    // count unique cards we know we want across decks
    stats[card.set][card.rarity].uniqueWanted += Math.min(1, wanted);
    stats.complete[card.rarity].uniqueWanted += Math.min(1, wanted);

    obj.wanted = wanted;
    if (!stats[card.set].cards[colorIndex])
      stats[card.set].cards[colorIndex] = {};
    if (!stats[card.set].cards[colorIndex][card.rarity])
      stats[card.set].cards[colorIndex][card.rarity] = [];
    stats[card.set].cards[colorIndex][card.rarity].push(obj);
  });

  return stats;
}

//
export function openCollectionTab() {
  filteredSets = [];
  filteredMana = [];
  orderedSets = Object.keys(db.sets);
  orderedSets = orderedSets
    .filter(set => db.sets[set].collation !== -1)
    .sort(
      (a, b) => new Date(db.sets[a].release) - new Date(db.sets[b].release)
    );

  console.log(orderedSets);

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
    printStats();
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
    setbutton.style.backgroundImage = `url(data:image/svg+xml;base64,${
      db.sets[set].svg
    })`;
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

//
function printStats() {
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
  let mainDiv = document.getElementById("ux_1");
  mainDiv.innerHTML = "";
  mainDiv.classList.remove("flex_item");
  const stats = get_collection_stats();
  console.log(stats);

  let top = createDiv(["decklist_top"]);
  top.appendChild(createDiv(["button", "back"]));
  top.appendChild(createDiv(["deck_name"], "Collection Statistics"));
  top.appendChild(createDiv(["deck_top_colors"]));

  //changeBackground("", 67574);

  const flex = createDiv(["flex_item"]);
  const mainstats = createDiv(["main_stats"]);

  let onlyBoostersLabel = document.createElement("label");
  onlyBoostersLabel.innerHTML = "Show cards";
  mainstats.appendChild(onlyBoostersLabel);

  // Counting Mode Selector
  const displayModeDiv = createDiv(["stats_count_div"]);
  const displayModeSelect = createSelect(
    displayModeDiv,
    [BOOSTER_CARDS, ALL_CARDS],
    displayMode,
    selectedMode => {
      displayMode = selectedMode;
      printStats();
    },
    "stats_mode_select"
  );
  displayModeSelect.style.margin = "12px auto";
  displayModeSelect.style.textAlign = "left";
  mainstats.appendChild(displayModeSelect);

  let completionLabel = document.createElement("label");
  completionLabel.innerHTML = "Sets Completion";
  mainstats.appendChild(completionLabel);

  // Counting Mode Selector
  const countModeDiv = createDiv(["stats_count_div"]);
  const countModeSelect = createSelect(
    countModeDiv,
    [ALL_CARDS, SINGLETONS, FULL_SETS],
    countMode,
    selectedMode => {
      countMode = selectedMode;
      printStats();
    },
    "stats_count_select"
  );
  countModeSelect.style.margin = "12px auto auto auto";
  countModeSelect.style.textAlign = "left";
  mainstats.appendChild(countModeSelect);

  // Complete collection sats
  let rs = renderSetStats(stats.complete, "Arena", "Complete collection");
  mainstats.appendChild(rs);

  // Filter out non booster sets ?
  let sets =
    displayMode == BOOSTER_CARDS
      ? orderedSets.filter(set => db.sets[set].collation > 0)
      : orderedSets;
  // each set stats
  sets
    .slice()
    .reverse()
    .forEach(set => {
      let rs = renderSetStats(stats[set], set, set);
      mainstats.appendChild(rs);
    });

  const substats = createDiv(["main_stats", "sub_stats"]);

  flex.appendChild(mainstats);
  flex.appendChild(substats);

  mainDiv.appendChild(top);
  mainDiv.appendChild(flex);

  //
  $$(".back")[0].addEventListener("click", () => {
    changeBackground("default");
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  });
}

//
function renderSetStats(setStats, setName, setText) {
  let setIcon = `url(data:image/svg+xml;base64,${db.sets[setName].svg})`;
  const setDiv = renderCompletionDiv(setStats.all, setIcon, setText);

  setDiv.addEventListener("mouseover", () => {
    let span = setDiv
      .getElementsByClassName("stats_set_icon")[0]
      .getElementsByTagName("span")[0];
    span.style.marginLeft = "48px";
    setDiv.style.opacity = 1;
  });
  setDiv.addEventListener("mouseout", () => {
    let span = setDiv
      .getElementsByClassName("stats_set_icon")[0]
      .getElementsByTagName("span")[0];
    span.style.marginLeft = "36px";
    setDiv.style.opacity = 0.7;
  });

  setDiv.addEventListener("click", () => {
    openSetStats(setStats, setText);
  });

  if (defaultSetName == setText) {
    setTimeout(() => {
      openSetStats(setStats, setText);
    }, 500);
  }

  return setDiv;
}

function openSetStats(setStats, setName) {
  defaultSetName = setName;
  const substats = $$(".sub_stats")[0];
  substats.innerHTML = "";

  let label = document.createElement("label");
  label.innerHTML = setName + " completion";
  substats.appendChild(label);

  // Draw completion table for this set
  if (setName != "Complete collection") {
    let table = createDiv(["completion_table"]);
    for (var color = 0; color < 7; color++) {
      let tile = "";
      switch (color + 1) {
        case WHITE:
          tile = "mana_white";
          break;
        case BLUE:
          tile = "mana_blue";
          break;
        case BLACK:
          tile = "mana_black";
          break;
        case RED:
          tile = "mana_red";
          break;
        case GREEN:
          tile = "mana_green";
          break;
        case COLORLESS:
          tile = "mana_colorless";
          break;
        case MULTI:
          tile = "mana_multi";
          break;
      }

      let cell = createDiv(["completion_table_color_title", tile]);
      cell.style.gridArea = `1 / ${color * 5 + 1} / auto / ${color * 5 + 6}`;
      table.appendChild(cell);

      CARD_RARITIES.filter(rarity => rarity !== "land").forEach(rarity => {
        var rarityIndex = CARD_RARITIES.indexOf(rarity);
        rarity = rarity.toLowerCase();
        let cell = createDiv(["completion_table_rarity_title", rarity]);
        cell.title = rarity;
        cell.style.gridArea = `2 / ${color * 5 +
          1 +
          rarityIndex} / auto / ${color * 5 + 1 + rarityIndex}`;
        table.appendChild(cell);

        // A little hacky to use "c + 1"..
        if (setStats.cards[color + 1]) {
          let cardsArray = setStats.cards[color + 1][rarity];
          if (cardsArray) {
            cardsArray.forEach((card, index) => {
              let dbCard = db.card(card.id);

              if (
                (!dbCard.booster && displayMode == ALL_CARDS) ||
                dbCard.booster
              ) {
                let classes = ["completion_table_card", "n" + card.owned];
                if (card.wanted > 0) classes.push("wanted");
                let cell = createDiv(classes, card.owned);
                cell.style.gridArea = `${index + 3} / ${color * 5 +
                  1 +
                  rarityIndex} / auto / ${color * 5 + 1 + rarityIndex}`;
                table.appendChild(cell);

                addCardHover(cell, dbCard);
              }
            });
          }
        }
      });
    }
    substats.appendChild(table);
  }

  let wanted = {};
  let missing = {};
  CARD_RARITIES.filter(rarity => rarity !== "land").forEach(rarity => {
    rarity = rarity.toLowerCase();
    const countStats = setStats[rarity];
    if (countStats.total > 0) {
      const capitalizedRarity = rarity[0].toUpperCase() + rarity.slice(1) + "s";

      var style = getComputedStyle(document.body);
      let compDiv = renderCompletionDiv(
        countStats,
        style.getPropertyValue(`--wc_${rarity}_png`),
        capitalizedRarity
      );
      compDiv.style.opacity = 1;
      substats.appendChild(compDiv);
    }
    wanted[rarity] = countStats.wanted;
    missing[rarity] = countStats.total - countStats.owned;
  });

  // If the set has a collationId, it means boosters for it exists
  if (db.sets[setName] && db.sets[setName].collation) {
    let chanceBoosterHasMythic = 0.125; // assume 1/8 of packs have a mythic
    let chanceBoosterHasRare = 1 - chanceBoosterHasMythic;
    let wantedText =
      "<abbr title='missing copy of a card in a current deck'>wanted</abbr>";

    // chance that the next booster opened contains a rare missing from one of our decks
    let possibleRares = setStats["rare"].unique - setStats["rare"].complete;
    if (possibleRares && setStats["rare"].uniqueWanted) {
      let chanceBoosterRareWanted = (
        (chanceBoosterHasRare * setStats["rare"].uniqueWanted) /
        possibleRares
      ).toLocaleString([], { style: "percent", maximumSignificantDigits: 2 });
      let rareWantedDiv = createDiv(["stats_set_completion"]);
      let rareWantedIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
      rareWantedIcon.style.height = "30px";
      let rareWantedSpan = document.createElement("span");
      rareWantedSpan.innerHTML = `<i>~${chanceBoosterRareWanted} chance next booster has ${wantedText} rare.</i>`;
      rareWantedSpan.style.fontSize = "13px";
      rareWantedIcon.appendChild(rareWantedSpan);
      rareWantedDiv.appendChild(rareWantedIcon);
      substats.appendChild(rareWantedDiv);
    }

    // chance that the next booster opened contains a mythic missing from one of our decks
    let possibleMythics =
      setStats["mythic"].unique - setStats["mythic"].complete;
    if (possibleMythics && setStats["mythic"].uniqueWanted) {
      let chanceBoosterMythicWanted = (
        (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted) /
        possibleMythics
      ).toLocaleString([], { style: "percent", maximumSignificantDigits: 2 });
      let mythicWantedDiv = createDiv(["stats_set_completion"]);
      let mythicWantedIcon = createDiv(["stats_set_icon", "bo_explore_cost"]);
      mythicWantedIcon.style.height = "30px";
      let mythicWantedSpan = document.createElement("span");
      mythicWantedSpan.innerHTML = `<i>~${chanceBoosterMythicWanted} chance next booster has ${wantedText} mythic.</i>`;
      mythicWantedSpan.style.fontSize = "13px";
      mythicWantedIcon.appendChild(mythicWantedSpan);
      mythicWantedDiv.appendChild(mythicWantedIcon);
      substats.appendChild(mythicWantedDiv);
    }
  }
}

//
function renderCompletionDiv(countStats, image, title) {
  let numerator, denominator;
  switch (countMode) {
    case SINGLETONS:
      numerator = countStats.uniqueOwned;
      denominator = countStats.unique;
      break;
    case FULL_SETS:
      numerator = countStats.complete;
      denominator = countStats.unique;
      break;
    default:
    case ALL_CARDS:
      numerator = countStats.owned;
      denominator = countStats.total;
      break;
  }
  const completionRatio = numerator / denominator;

  const completionDiv = createDiv(["stats_set_completion"]);

  let setIcon = createDiv(["stats_set_icon"]);
  setIcon.style.backgroundImage = image;
  let setIconSpan = document.createElement("span");
  setIconSpan.innerHTML = title;
  setIcon.appendChild(setIconSpan);
  completionDiv.appendChild(setIcon);

  const wrapperDiv = createDiv([]);
  const detailsDiv = createDiv(["stats_set_details"]);

  const percentSpan = document.createElement("span");
  percentSpan.innerHTML = completionRatio.toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2
  });
  detailsDiv.appendChild(percentSpan);

  const countSpan = document.createElement("span");
  countSpan.innerHTML = numerator + " / " + denominator;
  detailsDiv.appendChild(countSpan);

  const wantedSpan = document.createElement("span");
  wantedSpan.innerHTML =
    countStats.wanted +
    " <abbr title='missing copies of cards in current decks'>wanted cards</abbr>";
  detailsDiv.appendChild(wantedSpan);

  wrapperDiv.appendChild(detailsDiv);
  completionDiv.appendChild(wrapperDiv);

  let setBar = createDiv(["stats_set_bar"]);
  setBar.style.width = Math.round(completionRatio * 100) + "%";

  completionDiv.appendChild(setBar);
  return completionDiv;
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
