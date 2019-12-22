import _ from "lodash";
import anime from "animejs";
import {
  CARD_RARITIES,
  MANA,
  COLORS_BRIEF,
  DEFAULT_TILE,
  RANKS,
  RANKS_SORT,
  EASING_DEFAULT
} from "../shared/constants";
import db from "../shared/database";
import { queryElements as $$, createDiv } from "../shared/dom-fns";
import createSelect from "./createSelect";
import {
  getCardArtCrop,
  get_rank_index_16,
  removeDuplicates,
  compare_cards,
  getBoosterCountEstimate,
  roundWinrate
} from "../shared/util";
import {
  addCheckbox,
  getLocalState,
  getWinrateClass,
  hideLoadingBars,
  ipcSend,
  resetMainContainer,
  setLocalState,
  showLoadingBars,
  formatPercent,
  formatWinrateInterval
} from "./renderer-util";
import { openDeck } from "./deck-details";
import { normalApproximationInterval } from "../shared/statsFns";

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
export function openExploreTab() {
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

  let exploreFiltersContainer = createDiv(["explore_buttons_container"]);
  let exploreFiltersSelects = createDiv([
    "explore_buttons_row",
    "explore_buttons_top"
  ]);
  let exploreFiltersButtons = createDiv([
    "explore_buttons_row",
    "explore_buttons_middle"
  ]);
  let exploreFiltersInputs = createDiv([
    "explore_buttons_row",
    "explore_buttons_bottom"
  ]);
  exploreFiltersContainer.appendChild(exploreFiltersSelects);
  exploreFiltersContainer.appendChild(exploreFiltersButtons);
  exploreFiltersContainer.appendChild(exploreFiltersInputs);
  mainDiv.appendChild(exploreFiltersContainer);

  let exploreList = createDiv(["explore_list"]);
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
      .filter(item => item && !db.single_match_events.includes(item))
      .map(getEventPrettyName);

    eventFilters = [...new Set(eventFilters)];
  } else if (inputFilterType === "Ranked Draft") {
    eventFilters = db.limited_ranked_events.map(getEventPrettyName);
  } else if (inputFilterType === "Ranked Constructed") {
    eventFilters = db.standard_ranked_events.map(getEventPrettyName);
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
    value => {
      exploreData.filterEvent = value;
    },
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
    value => {
      exploreData.filterSort = value;
    },
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
    value => {
      exploreData.filterSortDir = value;
    },
    "explore_query_sortdir"
  );
  sortDirSelect.style.width = "130px";

  /**
   *  Only owned filter
   **/
  let lab = addCheckbox(
    buttonsMiddle,
    "Only owned",
    "settings_owned",
    onlyOwned,
    () => null
  );
  lab.style.alignSelf = "center";
  lab.style.marginLeft = 0;
  lab.style.marginRight = "32px";

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
  const manas = createDiv(["mana_filters_explore"]);
  COLORS_BRIEF.forEach(function(s, i) {
    const mi = [1, 2, 3, 4, 5];
    let classes = ["mana_filter"];
    if (!inputMana.includes(mi[i])) {
      classes.push("mana_filter_on");
    }
    const manabutton = createDiv(classes);
    manabutton.style.backgroundImage = "url(../images/" + s + "20.png)";
    manabutton.addEventListener("click", function() {
      if ([...manabutton.classList].includes("mana_filter_on")) {
        manabutton.classList.remove("mana_filter_on");
        inputMana.push(mi[i]);
      } else {
        manabutton.classList.add("mana_filter_on");
        let n = inputMana.indexOf(mi[i]);
        if (n > -1) {
          inputMana.splice(n, 1);
        }
      }
    });
    manas.appendChild(manabutton);
  });
  buttonsBottom.appendChild(manas);

  /**
   *  Rank filter
   **/
  if (inputFilterType !== "Events") {
    const ranks_filters = createDiv(["mana_filters_explore"]);
    RANKS.forEach(function(rr, index) {
      let classes = ["rank_filter"];
      if (!inputRanks.includes(rr)) {
        classes.push("rank_filter_on");
      }
      const rankbutton = createDiv(classes, "", { title: rr });
      rankbutton.style.backgroundPosition = (index + 1) * -16 + "px 0px";
      rankbutton.style.backgroundImage = "url(../images/ranks_16.png)";
      rankbutton.addEventListener("click", function() {
        if ([...rankbutton.classList].includes("rank_filter_on")) {
          rankbutton.classList.remove("rank_filter_on");
          inputRanks.push(rr);
        } else {
          rankbutton.classList.add("rank_filter_on");
          let n = inputRanks.indexOf(rr);
          if (n > -1) {
            inputRanks.splice(n, 1);
          }
        }
      });
      ranks_filters.appendChild(rankbutton);
    });
    buttonsBottom.appendChild(ranks_filters);
  }

  /**
   * Search button.
   **/
  let searchButton = createDiv(["button_simple"], "Search");
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

function getInputValueFromButton(id, defaultVal) {
  let exploreEventDiv = $$("." + id);
  let exploreEventButton = exploreEventDiv[0].children[0];

  if (exploreEventButton.textContent === "") {
    return defaultVal;
  }
  return exploreEventButton.textContent;
}

//
function handleNewSearch() {
  const exploreList = document.getElementById("explore_list");
  exploreList.innerHTML = "";

  const ed = getLocalState().exploreData;
  const exploreData = {
    ...ed,
    filterEvent: getInputValueFromButton("explore_query_event", ed.filterEvent),
    filterSort: getInputValueFromButton("explore_query_sort", ed.filterSort),
    filterSortDir: getInputValueFromButton(
      "explore_query_sortdir",
      ed.filterSortDir
    ),
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
  const q = $$("#settings_owned");
  if (q.length) {
    exploreData.onlyOwned = q[0].checked;
  }

  setLocalState({ exploreData });
  queryExplore();
}

//
function wildcardsInput(_class, _id, _default) {
  let inputContainer = createDiv(["input_container_explore", "auto_width"]);

  let label = createDiv([_class, "wc_search_icon"]);
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
    loadMessage = createDiv(["text_centered", "white"], "Loading...");
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
    exploreData.filterEvent ||
    getInputValueFromButton("explore_query_event", "Ladder");
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

export function setExploreDecks(data) {
  if (!queryInFlight || !data || !data.result) return;

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

  var flcf = createDiv(["flex_item"]);
  flcf.style.width = "20%";
  flcf.style.justifyContent = "center";

  let wc;
  let n = 0;
  let boosterCost = getBoosterCountEstimate(_deck.wildcards);
  CARD_RARITIES.filter(r => r !== "land").forEach(rarity => {
    rarity = rarity.toLowerCase();
    const key = rarity[0];
    if (
      Object.prototype.hasOwnProperty.call(_deck.wildcards, key) &&
      _deck.wildcards[key] > 0
    ) {
      wc = createDiv(["wc_explore_cost", "wc_" + rarity], _deck.wildcards[key]);
      wc.title = _.capitalize(rarity) + " wildcards needed.";
      flcf.appendChild(wc);
      n++;
    }
  });

  if (n == 0) {
    wc = createDiv(["wc_complete"]);
    flcf.appendChild(wc);
  } else {
    let bo = createDiv(["bo_explore_cost"], Math.round(boosterCost));
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

  var tile = createDiv([index + "t", "deck_tile"]);
  tile.style.backgroundImage = `url(${getCardArtCrop(tileGrpid)})`;

  var div = createDiv([index, "list_deck"]);

  var fll = createDiv(["flex_item"]);

  var flc = createDiv(["flex_item"]);
  flc.style.flexDirection = "column";
  flc.style.width = "40%";

  var flr = createDiv(["flex_item"]);
  flr.style.flexDirection = "column";
  flr.style.justifyContent = "center";
  flr.style.overflow = "hidden";
  flr.style.width = "40%";

  var flt = createDiv(["flex_top"]);

  var flb = createDiv(["flex_bottom"]);

  let d;
  d = createDiv(["list_deck_name"], _deck.name);
  flt.appendChild(d);

  let pname =
    _deck.player.length > 1 ? `Various (${_deck.player.length})` : _deck.player;
  d = createDiv(["list_deck_name_it"], "by " + pname);
  if (pname !== _deck.player) {
    d.style.textDecoration = "underline dotted";
    d.title = _deck.player;
  }
  flt.appendChild(d);

  _deck.colors.forEach(function(color) {
    let manaIcon = createDiv(["mana_s20", "mana_" + MANA[color]]);
    flb.appendChild(manaIcon);
  });

  let deckWinrate = normalApproximationInterval(_deck.mt, _deck.mw);

  let colClass = getWinrateClass(deckWinrate.winrate);
  d = createDiv(
    ["list_deck_record"],
    `${_deck.mw}:${_deck.ml} <span class="${colClass}_bright">(${formatPercent(
      deckWinrate.winrate
    )}`
  );
  if (_deck.mt >= 20) {
    // sample Size is large enough to use Wald Interval
    d.title = formatWinrateInterval(
      roundWinrate(deckWinrate.winrate - deckWinrate.interval),
      roundWinrate(deckWinrate.winrate + deckWinrate.interval)
    );
    d.innerHTML += `<i style="opacity:0.6;"> &plusmn; ${formatPercent(
      roundWinrate(deckWinrate.interval)
    )}</i>`;
  }
  d.innerHTML += `)</span>`;

  flr.appendChild(d);

  let rcont = createDiv(["flex_item"]);
  rcont.style.marginRight = "16px";
  rcont.style.marginLeft = "auto";

  let eventName = createDiv(["list_deck_name_it"], db.events[_deck.event]);
  rcont.appendChild(eventName);

  _deck.rank.sort((a, b) => RANKS_SORT[a] - RANKS_SORT[b]);

  _deck.rank.forEach(_rank => {
    let rankIcon = createDiv(["ranks_16"]);
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

  div.addEventListener("mouseenter", function() {
    tile.style.opacity = 1;
    tile.style.width = "200px";
  });

  div.addEventListener("mouseleave", function() {
    tile.style.opacity = 0.66;
    tile.style.width = "128px";
  });

  div.addEventListener("click", function() {
    _deck.mainDeck = removeDuplicates(_deck.mainDeck).sort(compare_cards);
    _deck.sideboard = removeDuplicates(_deck.sideboard).sort(compare_cards);
    openDeck(_deck, null);
    anime({
      targets: ".moving_ux",
      left: "-100%",
      easing: EASING_DEFAULT,
      duration: 350
    });
  });
}
