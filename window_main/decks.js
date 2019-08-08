const _ = require("lodash");
const anime = require("animejs");

const { MANA, CARD_RARITIES, EASING_DEFAULT } = require("../shared/constants");
const pd = require("../shared/player-data");
const {
  createDiv,
  createInput,
  createLabel,
  queryElements: $$
} = require("../shared/dom-fns");
const { createSelect } = require("../shared/select");
const {
  get_deck_missing,
  getBoosterCountEstimate,
  getReadableEvent,
  getReadableFormat
} = require("../shared/util");

const Aggregator = require("./aggregator");
const ListItem = require("./list-item");
const { openDeck } = require("./deck-details");
const {
  formatPercent,
  getTagColor,
  getWinrateClass,
  hideLoadingBars,
  ipcSend,
  resetMainContainer,
  setLocalState,
  showColorpicker
} = require("./renderer-util");
const {
  getTagString,
  renderDateFilter,
  renderManaFilter,
  renderSortOption
} = require("./filters");

let filters = Aggregator.getDefaultFilters();
filters.onlyCurrentDecks = true;
const tagPrompt = "Add";

const DECKS_ACTIVE = 1;
const DECKS_CUSTOM = 2;
const DECKS_WANTED = 3;
const DECKS_ARCHIVED = 4;
let lastOpenSection = DECKS_ACTIVE;

function setFilters(selected = {}) {
  if (selected.eventId || selected.date) {
    // clear all dependent filters
    filters = {
      ...Aggregator.getDefaultFilters(),
      date: filters.date,
      eventId: filters.eventId,
      onlyCurrentDecks: true,
      showArchived: filters.showArchived,
      ...selected
    };
  } else {
    // default case
    filters = { ...filters, date: pd.settings.last_date_filter, ...selected };
  }
}

//
function openDecksTab(
  _filters = {},
  scrollTop = 0,
  openSection = lastOpenSection
) {
  if (openSection !== -1) {
    lastOpenSection = openSection;
  } else {
    openSection = lastOpenSection;
  }
  if (openSection === DECKS_ARCHIVED) {
    _filters.showArchived = true;
  }
  if (openSection !== DECKS_ACTIVE) {
    _filters.sort = "By Date";
  }
  setFilters(_filters);
  const aggregator = new Aggregator(filters);

  hideLoadingBars();
  const mainDiv = resetMainContainer();
  mainDiv.classList.add("flex_item");

  const navCol = createDiv(["wrapper_column", "sidebar_column_r"]);
  navCol.appendChild(createDiv(["list_fill"]));

  // Primary section nav
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + DECKS_ACTIVE], "Active", {
      title: "Complete decks currently in Arena"
    })
  );
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + DECKS_CUSTOM], "Saved", {
      title: "Complete decks in mtg arena tool"
    })
  );
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + DECKS_WANTED], "Wanted", {
      title: "Incomplete decks in Arena or mtg arena tool"
    })
  );
  navCol.appendChild(
    createDiv(["settings_nav", "sn" + DECKS_ARCHIVED], "Archived", {
      title: "Archived decks in mtg arena tool"
    })
  );
  navCol.appendChild(createDiv(["list_fill"]));
  navCol.appendChild(createDiv(["list_fill"]));

  const updateFilterHandler = key => {
    return value => openDecksTab({ [key]: value });
  };

  // Common Filters
  navCol.appendChild(createLabel(["filter_label"], "Filters:"));
  renderManaFilter(filters.colors, updateFilterHandler("colors"), navCol);
  createSelect(
    navCol,
    Aggregator.gatherTags(Object.values(pd.decks)),
    filters.tag,
    updateFilterHandler("tag"),
    "select_filter",
    getTagString
  );
  navCol.appendChild(createDiv(["list_fill"]));

  // Data filters (only for active decks)
  if (openSection === DECKS_ACTIVE) {
    renderSortOption(filters.sort, updateFilterHandler("sort"), navCol);
    navCol.appendChild(createDiv(["list_fill"]));
    navCol.appendChild(createLabel(["filter_label"], "Winrate Data:"));
    renderDateFilter(filters.date, updateFilterHandler("date"), navCol);
    createSelect(
      navCol,
      new Aggregator({ date: filters.date }).events,
      filters.eventId,
      updateFilterHandler("eventId"),
      "select_filter",
      getReadableEvent
    );
  }

  mainDiv.appendChild(navCol);

  // Nav Event Handlers
  $$(".sn" + openSection)[0].classList.add("nav_selected");
  $$(".settings_nav").forEach(el =>
    el.addEventListener("click", function() {
      const classList = [...this.classList];
      if (classList.includes("nav_selected")) return;

      if (classList.includes("sn1")) {
        openDecksTab({}, 0, 1);
      } else if (classList.includes("sn2")) {
        openDecksTab({}, 0, 2);
      } else if (classList.includes("sn3")) {
        openDecksTab({}, 0, 3);
      } else if (classList.includes("sn4")) {
        openDecksTab({}, 0, 4);
      }
    })
  );

  const mainCol = createDiv(["wrapper_column"]);
  mainCol.setAttribute("id", "decks_column");

  const d = createDiv(["list_fill"]);
  mainCol.appendChild(d);

  mainDiv.appendChild(mainCol);

  const decks = [...pd.deckList];
  if (filters.sort === "By Winrate") {
    decks.sort(aggregator.compareDecksByWinrates);
  } else if (filters.sort === "By Wins") {
    decks.sort(aggregator.compareDecksByWins);
  } else {
    decks.sort(aggregator.compareDecks);
  }

  const filterDeckBySection = deck => {
    const needsCards = Object.values(get_deck_missing(deck)).some(x => x);
    if (openSection === DECKS_ACTIVE) {
      return !deck.custom && !needsCards;
    } else if (openSection === DECKS_CUSTOM) {
      return !deck.archived && deck.custom && !needsCards;
    } else if (openSection === DECKS_WANTED) {
      return !deck.archived && needsCards;
    } else if (openSection === DECKS_ARCHIVED) {
      return deck.archived;
    }
    return true;
  };

  const isDeckVisible = deck =>
    filterDeckBySection(deck) &&
    aggregator.filterDeck(deck) &&
    (filters.eventId === Aggregator.DEFAULT_EVENT ||
      aggregator.deckLastPlayed[deck.id]);

  decks.filter(isDeckVisible).forEach(deck => {
    let tileGrpid = deck.deckTileId;
    let listItem;
    if (deck.custom) {
      const archiveCallback = id => {
        ipcSend("toggle_deck_archived", id);
      };

      listItem = new ListItem(
        tileGrpid,
        deck.id,
        id => openDeckCallback(id, filters),
        archiveCallback,
        deck.archived
      );
    } else {
      listItem = new ListItem(tileGrpid, deck.id, id =>
        openDeckCallback(id, filters)
      );
    }
    listItem.center.classList.add("deck_tags_container");
    listItem.divideLeft();
    listItem.divideRight();

    createTag(listItem.center, deck.id, null, false);
    if (deck.format) {
      const fText = getReadableFormat(deck.format);
      const t = createTag(listItem.center, deck.id, fText, false);
      t.style.fontStyle = "italic";
    }
    if (deck.tags) {
      deck.tags.forEach(tag => {
        if (tag !== getReadableFormat(deck.format)) {
          createTag(listItem.center, deck.id, tag);
        }
      });
    }

    // Deck crafting cost section
    const ownedWildcards = {
      common: pd.economy.wcCommon,
      uncommon: pd.economy.wcUncommon,
      rare: pd.economy.wcRare,
      mythic: pd.economy.wcMythic
    };

    let missingWildcards = get_deck_missing(deck);

    let wc;
    let n = 0;
    let boosterCost = getBoosterCountEstimate(missingWildcards);
    CARD_RARITIES.forEach(cardRarity => {
      if (missingWildcards[cardRarity]) {
        n++;
        wc = createDiv(["wc_explore_cost", "wc_" + cardRarity]);
        wc.title = _.capitalize(cardRarity) + " wildcards needed.";
        wc.innerHTML =
          (ownedWildcards[cardRarity] > 0
            ? ownedWildcards[cardRarity] + "/"
            : "") + missingWildcards[cardRarity];
        listItem.right.appendChild(wc);
        listItem.right.style.flexDirection = "row";
        listItem.right.style.marginRight = "16px";
      }
    });
    if (n !== 0) {
      const bo = createDiv(["bo_explore_cost"], Math.round(boosterCost));
      bo.title = "Boosters needed (estimated)";
      listItem.right.appendChild(bo);
    }

    if (deck.name.indexOf("?=?Loc/Decks/Precon/") != -1) {
      deck.name = deck.name.replace("?=?Loc/Decks/Precon/", "");
    }

    const deckNameDiv = createDiv(["list_deck_name"], deck.name);
    listItem.leftTop.appendChild(deckNameDiv);

    deck.colors.forEach(function(color) {
      const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
      listItem.leftBottom.appendChild(m);
    });

    const dwr = aggregator.deckStats[deck.id];
    if (dwr && dwr.total > 0) {
      const deckWinrateDiv = createDiv(["list_deck_winrate"]);
      let colClass = getWinrateClass(dwr.winrate);
      deckWinrateDiv.innerHTML = `${dwr.wins}:${
        dwr.losses
      } <span class="${colClass}_bright">(${formatPercent(
        dwr.winrate
      )})</span>`;
      deckWinrateDiv.title = `${dwr.wins} matches won : ${
        dwr.losses
      } matches lost`;
      listItem.rightTop.appendChild(deckWinrateDiv);

      const deckWinrateLastDiv = createDiv(
        ["list_deck_winrate"],
        "Since last edit: "
      );
      deckWinrateLastDiv.style.opacity = 0.6;
      const drwr = aggregator.deckRecentStats[deck.id];
      if (drwr && drwr.total > 0) {
        colClass = getWinrateClass(drwr.winrate);
        deckWinrateLastDiv.innerHTML += `<span class="${colClass}_bright">${formatPercent(
          drwr.winrate
        )}</span>`;
        deckWinrateLastDiv.title = `${drwr.wins} matches won : ${
          drwr.losses
        } matches lost`;
      } else {
        deckWinrateLastDiv.innerHTML += "<span>--</span>";
        deckWinrateLastDiv.title = "no data yet";
      }
      listItem.rightBottom.appendChild(deckWinrateLastDiv);
    }

    mainCol.appendChild(listItem.container);
  });

  mainCol.addEventListener("scroll", function() {
    setLocalState({ lastScrollTop: mainCol.scrollTop });
  });
  if (scrollTop) {
    mainCol.scrollTop = scrollTop;
  }
}

function openDeckCallback(id, filters) {
  const deck = pd.deck(id);
  if (!deck) return;
  openDeck(deck, { ...filters, deckId: id });
  anime({
    targets: ".moving_ux",
    left: "-100%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

function createTag(div, deckId, tag, showClose = true) {
  const tagCol = getTagColor(tag);
  const t = createDiv(["deck_tag"], tag || tagPrompt);
  t.style.backgroundColor = tagCol;

  if (tag) {
    t.addEventListener("click", function(e) {
      e.stopPropagation();
      showColorpicker(
        tagCol,
        color => (t.style.backgroundColor = color.rgbString),
        color => ipcSend("edit_tag", { tag, color: color.rgbString }),
        () => (t.style.backgroundColor = tagCol)
      );
    });
  } else {
    t.addEventListener("click", function(e) {
      t.innerHTML = "";
      const input = createInput(["deck_tag_input"], "", {
        type: "text",
        autocomplete: "off",
        placeholder: tagPrompt,
        size: 1
      });
      input.addEventListener("keyup", function(e) {
        setTimeout(() => {
          input.style.width = this.value.length * 8 + "px";
        }, 10);
        if (e.keyCode === 13) {
          e.stopPropagation();
          this.blur();
        }
      });
      input.addEventListener("focusout", function() {
        const val = this.value;
        if (val && val !== tagPrompt) {
          addTag(deckId, val);
        }
      });
      t.appendChild(input);
      input.focus();

      e.stopPropagation();
    });
  }

  if (showClose) {
    const val = t.innerHTML;
    const tc = createDiv(["deck_tag_close"]);
    tc.addEventListener("click", function(e) {
      e.stopPropagation();
      tc.style.visibility = "hidden";
      deleteTag(deckId, val);
    });
    t.appendChild(tc);
  } else {
    t.style.paddingRight = "12px";
  }
  div.appendChild(t);
  return t;
}

function addTag(deckid, tag) {
  const deck = pd.deck(deckid);
  if (!deck || !tag) return;
  if (getReadableFormat(deck.format) === tag) return;
  if (tag === tagPrompt) return;
  if (deck.tags && deck.tags.includes(tag)) return;

  ipcSend("add_tag", { deckid, tag });
}

function deleteTag(deckid, tag) {
  const deck = pd.deck(deckid);
  if (!deck || !tag) return;
  if (!deck.tags || !deck.tags.includes(tag)) return;

  ipcSend("delete_tag", { deckid, tag });
}

module.exports = { openDecksTab: openDecksTab };
