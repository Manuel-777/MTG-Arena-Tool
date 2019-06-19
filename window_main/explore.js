const _ = require("lodash");

const {
  CARD_RARITIES,
  MANA,
  COLORS_BRIEF,
  DEFAULT_TILE,
  RANKS,
  RANKS_SORT
} = require("../shared/constants");
const db = require("../shared/database");
const { queryElements: $$, createDivision } = require("../shared/dom-fns");
const { createSelect } = require("../shared/select");
const {
  getReadableEvent,
  timeSince,
  get_rank_index_16,
  removeDuplicates,
  compare_cards,
  getBoosterCountEstimate
} = require("../shared/util");

const {
  addCheckbox,
  getLocalState,
  getWinrateClass,
  hideLoadingBars,
  ipcSend,
  resetMainContainer,
  setLocalState,
  showLoadingBars
} = require("./renderer-util");
const { openDeck } = require("./deck-details");

// default values for cached local state
const defaultData = {
  filterEvent: null,
  filterType: "Events",
  filterSort: "By Wins",
  filterSortDir: "Descending",
  filterSkip: 0,
  filterWCC: "",
  filterWCU: "",
  filterWCR: "",
  filterWCM: "",
  filteredMana: [],
  filteredranks: [],
  onlyOwned: false,
  result: [],
  results_number: 0,
  results_set: new Set(),
  results_type: "",
  results_terminated: false
};

// temporary local state variables (never cached)
let inputFilterType = defaultData.filterType;
let inputMana = defaultData.filteredMana;
let inputRanks = defaultData.filteredranks;
let queryInFlight = false; // semaphore to limit simultaneous queries

//
function openExploreTab() {
  hideLoadingBars();
  queryInFlight = false;
  let { exploreData } = getLocalState();
  if (!exploreData) {
    exploreData = { ...defaultData };
    setLocalState({ exploreData });
  }

  const mainDiv = resetMainContainer();
  let d;

  let divFill = document.createElement("div");
  divFill.classList.add("list_fill");
  mainDiv.appendChild(divFill);

  let exploreFiltersContainer = createDivision(["explore_buttons_container"]);
  let exploreFiltersSelects = createDivision([
    "explore_buttons_row",
    "explore_buttons_top"
  ]);
  let exploreFiltersButtons = createDivision([
    "explore_buttons_row",
    "explore_buttons_middle"
  ]);
  let exploreFiltersInputs = createDivision([
    "explore_buttons_row",
    "explore_buttons_bottom"
  ]);
  exploreFiltersContainer.appendChild(exploreFiltersSelects);
  exploreFiltersContainer.appendChild(exploreFiltersButtons);
  exploreFiltersContainer.appendChild(exploreFiltersInputs);
  mainDiv.appendChild(exploreFiltersContainer);

  let exploreList = createDivision(["explore_list"]);
  exploreList.id = "explore_list";
  mainDiv.appendChild(exploreList);

  d = document.createElement("div");
  d.classList.add("list_fill");
  mainDiv.appendChild(d);
  d = document.createElement("div");
  d.classList.add("list_fill");
  mainDiv.appendChild(d);

  inputFilterType = exploreData.filterType;
  inputMana = [...exploreData.filteredMana];
  inputRanks = [...exploreData.filteredranks];

  drawFilters();
  if (exploreData.results_number) {
    // display cached query results
    renderData();
  } else {
    // automatically fetch data when local cache is empty
    queryExplore();
  }

  const handler = () => {
    const { exploreData } = getLocalState();
    // do not spam server after reaching end of results
    if (exploreData.results_terminated) return;
    if (
      Math.round(mainDiv.scrollTop + mainDiv.offsetHeight) >=
      mainDiv.scrollHeight
    ) {
      queryExplore();
    }
  };
  mainDiv.addEventListener("scroll", handler);
  setLocalState({ lastScrollHandler: handler });
}

function getEventPrettyName(event) {
  return db.event(event) || event;
}

function drawFilters() {
  const { exploreData } = getLocalState();
  const {
    filterEvent,
    filterSort,
    filterSortDir,
    onlyOwned,
    filterWCC,
    filterWCU,
    filterWCR,
    filterWCM
  } = exploreData;

  let buttonsTop = $$(".explore_buttons_top")[0];
  let buttonsMiddle = $$(".explore_buttons_middle")[0];
  let buttonsBottom = $$(".explore_buttons_bottom")[0];

  buttonsTop.innerHTML = "";
  buttonsMiddle.innerHTML = "";
  buttonsBottom.innerHTML = "";

  /**
   *  Type filter
   **/
  let typeFilter = ["Events", "Ranked Constructed", "Ranked Draft"];
  let typeSelect = createSelect(
    buttonsTop,
    typeFilter,
    inputFilterType,
    res => {
      inputFilterType = res;
      drawFilters();
    },
    "explore_query_type"
  );
  typeSelect.style.width = "200px";

  /**
   *  Event filter
   **/
  let eventFilters = [];
  if (inputFilterType === "Events") {
    eventFilters = db.eventIds
      .concat(db.activeEvents)
      .map(getEventPrettyName)
      .filter(
        item =>
          item != undefined &&
          item != "New Player Experience" &&
          item != "Direct Game" &&
          item != "Ranked" &&
          item != "Play" &&
          item != "Traditional Play" &&
          item != "Traditional Ranked" &&
          !db.ranked_events.map(getEventPrettyName).includes(item)
      );

    eventFilters = [...new Set(eventFilters)];
  } else if (inputFilterType === "Ranked Draft") {
    eventFilters = db.ranked_events.map(getEventPrettyName);
  } else if (inputFilterType === "Ranked Constructed") {
    eventFilters.push("Ladder");
    eventFilters.push("Traditional Ladder");
  }
  eventFilters.sort(function(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  let mappedActive = db.activeEvents.map(getEventPrettyName);
  eventFilters.forEach(item => {
    if (mappedActive.includes(item)) {
      eventFilters.splice(eventFilters.indexOf(item), 1);
      eventFilters.unshift(item);
    }
  });

  createSelect(
    buttonsTop,
    eventFilters,
    filterEvent || eventFilters[0],
    () => null,
    "explore_query_event"
  );

  /**
   *  Sort filter
   **/
  let sortLabel = document.createElement("label");
  sortLabel.innerHTML = "Sort";
  sortLabel.style.margin = "auto 4px auto 16px";
  buttonsTop.appendChild(sortLabel);

  let sortFilters = ["By Date", "By Wins", "By Winrate", "By Player"];
  let sortSelect = createSelect(
    buttonsTop,
    sortFilters,
    filterSort,
    () => null,
    "explore_query_sort"
  );
  sortSelect.style.width = "130px";

  /**
   *  Sort direction
   **/
  let sortDirection = ["Descending", "Ascending"];
  let sortDirSelect = createSelect(
    buttonsTop,
    sortDirection,
    filterSortDir,
    () => null,
    "explore_query_sortdir"
  );
  sortDirSelect.style.width = "130px";

  /**
   *  Only owned filter
   **/
  let lab = addCheckbox(
    $(buttonsMiddle),
    "Only owned",
    "settings_owned",
    onlyOwned,
    () => null
  );
  lab.css("align-self", "center");
  lab.css("margin-left", "0px");
  lab.css("margin-right", "32px");

  /**
   * Wildcards filters
   **/
  const commonsInput = wildcardsInput(
    "wc_common",
    "explore_query_wc_c",
    filterWCC
  );
  const uncommonsInput = wildcardsInput(
    "wc_uncommon",
    "explore_query_wc_u",
    filterWCU
  );
  const raresInput = wildcardsInput("wc_rare", "explore_query_wc_r", filterWCR);
  const mythicInput = wildcardsInput(
    "wc_mythic",
    "explore_query_wc_m",
    filterWCM
  );

  buttonsMiddle.appendChild(commonsInput);
  buttonsMiddle.appendChild(uncommonsInput);
  buttonsMiddle.appendChild(raresInput);
  buttonsMiddle.appendChild(mythicInput);

  /**
   *  Mana filter
   **/
  var manas = $('<div class="mana_filters_explore"></div>');
  COLORS_BRIEF.forEach(function(s, i) {
    var mi = [1, 2, 3, 4, 5];
    var mf = "";
    if (!inputMana.includes(mi[i])) {
      mf = "mana_filter_on";
    }
    var manabutton = $(
      `<div class="mana_filter ${mf}" style="background-image: url(../images/${s}20.png)"></div>`
    );
    manabutton.appendTo(manas);
    manabutton.click(function() {
      if (manabutton.hasClass("mana_filter_on")) {
        manabutton.removeClass("mana_filter_on");
        inputMana.push(mi[i]);
      } else {
        manabutton.addClass("mana_filter_on");
        let n = inputMana.indexOf(mi[i]);
        if (n > -1) {
          inputMana.splice(n, 1);
        }
      }
    });
  });
  manas.appendTo(buttonsBottom);

  /**
   *  Rank filter
   **/
  if (inputFilterType !== "Events") {
    var ranks_filters = $('<div class="mana_filters_explore"></div>');
    RANKS.forEach(function(rr, index) {
      var mf = "";
      if (!inputRanks.includes(rr)) {
        mf = "rank_filter_on";
      }
      var rankbutton = $(
        `<div title="${rr}" class="rank_filter ${mf}" style="background-position: ${(index +
          1) *
          -16}px 0px; background-image: url(../images/ranks_16.png)"></div>`
      );

      rankbutton.appendTo(ranks_filters);
      rankbutton.click(function() {
        if (rankbutton.hasClass("rank_filter_on")) {
          rankbutton.removeClass("rank_filter_on");
          inputRanks.push(rr);
        } else {
          rankbutton.addClass("rank_filter_on");
          let n = inputRanks.indexOf(rr);
          if (n > -1) {
            inputRanks.splice(n, 1);
          }
        }
      });
    });
    ranks_filters.appendTo(buttonsBottom);
  }

  /**
   * Search button.
   **/
  let searchButton = createDivision(["button_simple"], "Search");
  searchButton.id = "explore_query_button";
  searchButton.margin = "0px !important;";
  buttonsBottom.appendChild(searchButton);
  searchButton.addEventListener("click", handleNewSearch);
}

//
function getInputValue(id, defaultVal) {
  const q = $$("." + id);
  if (!q.length) return defaultVal;
  return q[0].value;
}

//
function handleNewSearch() {
  const exploreList = document.getElementById("explore_list");
  exploreList.innerHTML = "";

  const ed = getLocalState().exploreData;
  const exploreData = {
    ...ed,
    filterEvent: getInputValue("explore_query_event", ed.filterEvent),
    filterSort: getInputValue("explore_query_sort", ed.filterSort),
    filterSortDir: getInputValue("explore_query_sortdir", ed.filterSortDir),
    filterWCC: getInputValue("explore_query_wc_c", ed.filterWCC),
    filterWCU: getInputValue("explore_query_wc_u", ed.filterWCU),
    filterWCR: getInputValue("explore_query_wc_r", ed.filterWCR),
    filterWCM: getInputValue("explore_query_wc_m", ed.filterWCM),
    filterSkip: 0,
    results_number: 0,
    result: [],
    results_set: new Set(),
    results_type: "",
    results_terminated: false,
    filterType: inputFilterType,
    filteredMana: inputMana,
    filteredranks: inputRanks
  };
  const q = $$(".settings_owned");
  if (q.length) {
    exploreData.onlyOwned = q[0].checked;
  }

  setLocalState({ exploreData });
  queryExplore();
}

//
function wildcardsInput(_class, _id, _default) {
  let inputContainer = createDivision([
    "input_container_explore",
    "auto_width"
  ]);

  let label = createDivision([_class, "wc_search_icon"]);
  label.style.display = "table";
  label.style.justifySelf = "center";
  label.style.marginRight = "0px";

  inputContainer.appendChild(label);

  let input = document.createElement("input");
  input.id = _id;
  input.classList.add(_id);
  input.type = "number";
  input.value = _default;
  input.autocomplete = "off";
  input.style.maxWidth = "40px";
  input.style.alignSelf = "center";

  inputContainer.appendChild(input);

  return inputContainer;
}

//
function queryExplore() {
  if (queryInFlight) return;

  const button = document.getElementById("explore_query_button");
  if (button) button.style.display = "none";
  const exploreList = document.getElementById("explore_list");
  let loadMessage = document.getElementById("explore_load_message");
  if (!loadMessage) {
    loadMessage = createDivision(["text_centered", "white"], "Loading...");
    loadMessage.id = "explore_load_message";
    exploreList.appendChild(loadMessage);
  }

  const { exploreData } = getLocalState();
  const {
    filterType,
    filterSort,
    filterSortDir,
    filterWCC,
    filterWCU,
    filterWCR,
    filterWCM,
    filteredMana,
    filteredranks,
    onlyOwned,
    filterSkip
  } = exploreData;

  const sortDir = filterSortDir === "Descending" ? -1 : 1;

  // initial query defaults event filter to first event (dynamic)
  const filterEvent =
    exploreData.filterEvent || getInputValue("explore_query_event", "Ladder");
  // map selected event display name back to event ID
  let filterEventId = filterEvent;
  const eventIds = db.eventIds.filter(
    key => getEventPrettyName(key) === filterEvent
  );
  if (filterEvent === "Traditional Ladder") {
    filterEventId = "Traditional_Ladder";
  } else if (eventIds.length) {
    filterEventId = eventIds[0];
  }

  const query = {
    filterWCC,
    filterWCU,
    filterWCR,
    filterWCM,
    filterEvent: filterEventId,
    filterType,
    filterSort,
    filterSortDir: sortDir,
    onlyOwned,
    filteredMana,
    filteredranks,
    filterSkip
  };

  showLoadingBars();
  queryInFlight = true;
  ipcSend("request_explore", query);
}

function setExploreDecks(data) {
  if (!queryInFlight) return;

  const exploreList = document.getElementById("explore_list");
  const loadMessage = document.getElementById("explore_load_message");
  if (loadMessage) exploreList.removeChild(loadMessage);

  const exploreData = { ...getLocalState().exploreData };

  // filter out duplicates
  const results_set = new Set([...exploreData.results_set]);
  exploreData.result = [...exploreData.result];
  data.result.forEach(item => {
    const id = item._id || item.id || "Unknown";
    if (results_set.has(id)) return;
    exploreData.result.push(item);
    results_set.add(id);
  });
  exploreData.results_set = results_set;

  // update indexes
  const lastIndex = exploreData.results_number;
  exploreData.results_number = results_set.size;
  exploreData.filterSkip += data.results_number;
  if (data.results_number === 0) {
    exploreData.results_terminated = true;
  }

  setLocalState({ exploreData });
  renderData(lastIndex);
  queryInFlight = false;

  if (!exploreData.results_terminated && exploreData.results_number < 20) {
    // in highly filtered situations, keep asking for more
    queryExplore();
  } else {
    const button = document.getElementById("explore_query_button");
    if (button) button.style.display = "initial";
  }
}

function renderData(startIndex = 0) {
  const data = getLocalState().exploreData;

  data.result
    .slice(startIndex)
    .forEach((deck, index) => deckLoad(deck, startIndex + index));
}

function deckLoad(_deck, index) {
  var mainDiv = document.getElementById("explore_list");
  index = "result_" + index;

  var flcf = createDivision(["flex_item"]);
  flcf.style.width = "20%";
  flcf.style.justifyContent = "center";

  let wc;
  let n = 0;
  let boosterCost = getBoosterCountEstimate(_deck.wildcards);
  CARD_RARITIES.forEach(rarity => {
    const key = rarity[0];
    if (_deck.wildcards.hasOwnProperty(key) && _deck.wildcards[key] > 0) {
      wc = createDivision(
        ["wc_explore_cost", "wc_" + rarity],
        _deck.wildcards[key]
      );
      wc.title = _.capitalize(rarity) + " wildcards needed.";
      flcf.appendChild(wc);
      n++;
    }
  });

  if (n == 0) {
    wc = createDivision(["wc_complete"]);
    flcf.appendChild(wc);
  } else {
    let bo = createDivision(["bo_explore_cost"], Math.round(boosterCost));
    bo.title = "Boosters needed (estimated)";
    flcf.appendChild(bo);
  }

  if (_deck.colors == undefined) {
    _deck.colors = [];
  }
  if (_deck.mw == undefined) {
    _deck.mw = 0;
    _deck.ml = 0;
  }

  var tileGrpid = _deck.tile;
  try {
    db.card(tileGrpid).images["art_crop"];
  } catch (e) {
    tileGrpid = DEFAULT_TILE;
  }

  var tile = createDivision([index + "t", "deck_tile"]);
  tile.style.backgroundImage =
    "url(https://img.scryfall.com/cards" +
    db.card(tileGrpid).images["art_crop"] +
    ")";

  var div = createDivision([index, "list_deck"]);

  var fll = createDivision(["flex_item"]);

  var flc = createDivision(["flex_item"]);
  flc.style.flexDirection = "column";
  flc.style.width = "40%";

  var flr = createDivision(["flex_item"]);
  flr.style.flexDirection = "column";
  flr.style.justifyContent = "center";
  flr.style.overflow = "hidden";
  flr.style.width = "40%";

  var flt = createDivision(["flex_top"]);

  var flb = createDivision(["flex_bottom"]);

  let d;
  d = createDivision(["list_deck_name"], _deck.name);
  flt.appendChild(d);

  let pname =
    _deck.player.length > 1 ? `Various (${_deck.player.length})` : _deck.player;
  d = createDivision(["list_deck_name_it"], "by " + pname);
  if (pname !== _deck.player) {
    d.style.textDecoration = "underline dotted";
    d.title = _deck.player;
  }
  flt.appendChild(d);

  _deck.colors.forEach(function(color) {
    let manaIcon = createDivision(["mana_s20", "mana_" + MANA[color]]);
    flb.appendChild(manaIcon);
  });

  let colClass = getWinrateClass((1 / _deck.mt) * _deck.mw);
  d = createDivision(
    ["list_deck_record"],
    `${_deck.mw}:${_deck.ml} <span class="${colClass}_bright">(${Math.round(
      (100 / _deck.mt) * _deck.mw
    )}%)</span>`
  );

  flr.appendChild(d);

  let rcont = createDivision(["flex_item"]);
  rcont.style.marginRight = "16px";
  rcont.style.marginLeft = "auto";

  let eventName = createDivision(["list_deck_name_it"], db.events[_deck.event]);
  rcont.appendChild(eventName);

  _deck.rank.sort((a, b) => RANKS_SORT[a] - RANKS_SORT[b]);

  _deck.rank.forEach(_rank => {
    let rankIcon = createDivision(["ranks_16"]);
    rankIcon.style.marginTop = "4px";
    rankIcon.style.backgroundPosition =
      get_rank_index_16(_rank) * -16 + "px 0px";
    rankIcon.title = _rank;

    rcont.appendChild(rankIcon);
  });

  flr.appendChild(rcont);

  div.appendChild(fll);
  fll.appendChild(tile);
  div.appendChild(flc);
  div.appendChild(flcf);
  flc.appendChild(flt);
  flc.appendChild(flb);
  div.appendChild(flr);

  mainDiv.appendChild(div);

  $("." + index).on("mouseenter", function() {
    $("." + index + "t").css("opacity", 1);
    $("." + index + "t").css("width", "200px");
  });

  $("." + index).on("mouseleave", function() {
    $("." + index + "t").css("opacity", 0.66);
    $("." + index + "t").css("width", "128px");
  });

  $("." + index).on("click", function() {
    _deck.mainDeck = removeDuplicates(_deck.mainDeck).sort(compare_cards);
    _deck.sideboard = removeDuplicates(_deck.sideboard).sort(compare_cards);
    openDeck(_deck, null);
    $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
  });
}

module.exports = {
  openExploreTab,
  setExploreDecks
};
