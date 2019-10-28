import _ from "lodash";
import anime from "animejs";
import format from "date-fns/format";
import { MANA, CARD_RARITIES, EASING_DEFAULT } from "../shared/constants";
import pd from "../shared/player-data";
import { createDiv, createInput } from "../shared/dom-fns";
import {
  get_deck_missing,
  getBoosterCountEstimate,
  getReadableFormat
} from "../shared/util";
import Aggregator from "./aggregator";
import FilterPanel from "./filter-panel";
import ListItem from "./list-item";
import StatsPanel from "./stats-panel";
import { openDeck } from "./deck-details";
import {
  formatPercent,
  formatWinrateInterval,
  getTagColor,
  getWinrateClass,
  hideLoadingBars,
  ipcSend,
  makeResizable,
  resetMainContainer,
  setLocalState,
  showColorpicker
} from "./renderer-util";

let filters = Aggregator.getDefaultFilters();
filters.onlyCurrentDecks = true;
const tagPrompt = "Add";

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
export function openDecksTab(_filters = {}, scrollTop = 0) {
  hideLoadingBars();
  const mainDiv = resetMainContainer();
  mainDiv.classList.add("flex_item");
  setFilters(_filters);

  const wrap_r = createDiv(["wrapper_column", "sidebar_column_l"]);
  wrap_r.style.width = pd.settings.right_panel_width + "px";
  wrap_r.style.flex = `0 0 ${pd.settings.right_panel_width}px`;
  const aggregator = new Aggregator(filters);
  const statsPanel = new StatsPanel(
    "decks_top",
    aggregator,
    pd.settings.right_panel_width,
    true
  );
  const decks_top_winrate = statsPanel.render();
  decks_top_winrate.style.display = "flex";
  decks_top_winrate.style.flexDirection = "column";
  decks_top_winrate.style.marginTop = "16px";
  decks_top_winrate.style.padding = "12px";

  const drag = createDiv(["dragger"]);
  wrap_r.appendChild(drag);
  makeResizable(drag, statsPanel.handleResize);

  wrap_r.appendChild(decks_top_winrate);

  const wrap_l = createDiv(["wrapper_column"]);
  wrap_l.setAttribute("id", "decks_column");

  const d = createDiv(["list_fill"]);
  wrap_l.appendChild(d);

  mainDiv.appendChild(wrap_l);
  mainDiv.appendChild(wrap_r);

  // Tags and filters
  const decksTop = createDiv(["decks_top"]);

  const tags = Aggregator.gatherTags(Object.values(pd.decks));
  const filterPanel = new FilterPanel(
    "decks_top",
    selected => openDecksTab(selected),
    filters,
    new Aggregator({ date: filters.date }).events,
    tags,
    [],
    true,
    [],
    false,
    null,
    true,
    true
  );
  decksTop.appendChild(filterPanel.render());
  wrap_l.appendChild(decksTop);

  const decks = [...pd.deckList];
  if (filters.sort === "By Winrate") {
    decks.sort(aggregator.compareDecksByWinrates);
  } else if (filters.sort === "By Wins") {
    decks.sort(aggregator.compareDecksByWins);
  } else if (filters.sort === "By Incomplete") {
    decks.sort(aggregator.compareDecksByIncompleteness);
  } else {
    decks.sort(aggregator.compareDecks);
  }

  const isDeckVisible = deck =>
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
      let interval, tooltip;
      if (dwr.total >= 20) {
        // sample Size is large enough to use Wald Interval
        interval = formatPercent(dwr.interval);
        tooltip = formatWinrateInterval(
          formatPercent(dwr.winrateLow),
          formatPercent(dwr.winrateHigh)
        );
      } else {
        // sample size is too small (garbage results)
        interval = "???";
        tooltip = "play at least 20 matches to estimate actual winrate";
      }
      let colClass = getWinrateClass(dwr.winrate);
      deckWinrateDiv.innerHTML = `${dwr.wins}:${
        dwr.losses
      } (<span class="${colClass}_bright">${formatPercent(
        dwr.winrate
      )}</span> <i style="opacity:0.6;">&plusmn; ${interval}</i>)`;
      deckWinrateDiv.title = tooltip;
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
        deckWinrateLastDiv.title = `${formatPercent(
          drwr.winrate
        )} winrate since ${format(new Date(deck.lastUpdated), "Pp")}`;
      } else {
        deckWinrateLastDiv.innerHTML += "<span>--</span>";
        deckWinrateLastDiv.title = "no data yet";
      }
      listItem.rightBottom.appendChild(deckWinrateLastDiv);
    }

    wrap_l.appendChild(listItem.container);
  });

  wrap_l.addEventListener("scroll", function() {
    setLocalState({ lastScrollTop: wrap_l.scrollTop });
  });
  if (scrollTop) {
    wrap_l.scrollTop = scrollTop;
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
