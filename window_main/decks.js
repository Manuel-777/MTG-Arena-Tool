/*
global
  Aggregator,
  allMatches,
  createDivision,
  decks,
  economyHistory,
  FilterPanel,
  formatPercent,
  get_deck_missing,
  getBoosterCountEstimate,
  getDeck,
  getReadableFormat,
  hideLoadingBars,
  getWinrateClass,
  ipc_send,
  makeResizable,
  mana,
  ListItem,
  openDeck,
  orderedCardRarities,
  sidebarActive,
  sidebarSize,
  sort_decks,
  getTagColor,
  setTagColor,
  StatsPanel
*/

let filters = Aggregator.getDefaultFilters();
filters.onlyCurrentDecks = true;

//
function openDecksTab() {
  if (sidebarActive == 0 && decks != null) {
    hideLoadingBars();
    var mainDiv = document.getElementById("ux_0");
    mainDiv.classList.add("flex_item");
    mainDiv.innerHTML = "";

    const wrap_r = createDivision(["wrapper_column", "sidebar_column_l"]);
    wrap_r.style.width = sidebarSize + "px";
    wrap_r.style.flex = `0 0 ${sidebarSize}px`;
    const aggregator = new Aggregator(filters);
    const statsPanel = new StatsPanel(
      "decks_top",
      aggregator.stats,
      sidebarSize
    );
    const decks_top_winrate = statsPanel.render();
    decks_top_winrate.style.display = "flex";
    decks_top_winrate.style.flexDirection = "column";
    decks_top_winrate.style.marginTop = "16px";
    decks_top_winrate.style.padding = "12px";

    let drag = createDivision(["dragger"]);
    wrap_r.appendChild(drag);
    const finalCallback = width => {
      ipc_send("save_user_settings", { right_panel_width: width });
    };
    makeResizable(drag, statsPanel.handleResize, finalCallback);

    wrap_r.appendChild(decks_top_winrate);

    const wrap_l = createDivision(["wrapper_column"]);
    wrap_l.setAttribute("id", "decks_column");

    var d = document.createElement("div");
    d.classList.add("list_fill");
    wrap_l.appendChild(d);

    mainDiv.appendChild(wrap_l);
    mainDiv.appendChild(wrap_r);

    // Tags and filters
    let decks_top = document.createElement("div");
    decks_top.classList.add("decks_top");

    const handler = selected => {
      if (selected.eventId || selected.date) {
        // clear all dependent filters
        filters = {
          ...Aggregator.getDefaultFilters(),
          date: filters.date,
          eventId: filters.eventId,
          ...selected
        };
      } else {
        // default case
        filters = { ...filters, ...selected };
      }
      openDecksTab();
    };
    const tags = Aggregator.gatherTags(decks);
    const filterPanel = new FilterPanel(
      "decks_top",
      handler,
      filters,
      allMatches.events,
      tags,
      [],
      true,
      [],
      false,
      null,
      true
    );
    const decks_top_filter = filterPanel.render();

    decks_top.appendChild(decks_top_filter);
    wrap_l.appendChild(decks_top);

    sort_decks(aggregator.compareDecks);

    const isDeckVisible = deck =>
      aggregator.filterDeck(deck) &&
      (filters.eventId === Aggregator.DEFAULT_EVENT ||
        aggregator.deckLastPlayed[deck.id]);

    decks.filter(isDeckVisible).forEach(deck => {
      let tileGrpid = deck.deckTileId;
      let listItem;
      if (deck.custom) {
        let archiveCallback = archiveDeck;
        if (deck.archived) {
          archiveCallback = unarchiveDeck;
        }
        listItem = new ListItem(
          tileGrpid,
          deck.id,
          openDeckCallback,
          archiveCallback,
          deck.archived
        );
      } else {
        listItem = new ListItem(tileGrpid, deck.id, openDeckCallback);
      }
      listItem.center.classList.add("deck_tags_container");
      listItem.divideLeft();
      listItem.divideRight();

      const t = createTag(null, listItem.center, false);
      jQuery.data(t, "deck", deck.id);
      if (deck.format) {
        const fText = getReadableFormat(deck.format);
        const t = createTag(fText, listItem.center, false);
        t.style.fontStyle = "italic";
        jQuery.data(t, "deck", deck.id);
      }
      if (deck.tags) {
        deck.tags.forEach(tag => {
          if (tag !== deck.format) {
            const t = createTag(tag, listItem.center);
            jQuery.data(t, "deck", deck.id);
          }
        });
      }

      // Deck crafting cost section
      let ownedWildcards = {
        common: economyHistory.wcCommon,
        uncommon: economyHistory.wcUncommon,
        rare: economyHistory.wcRare,
        mythic: economyHistory.wcMythic
      };

      let missingWildcards = get_deck_missing(deck);

      let wc;
      let n = 0;
      let boosterCost = getBoosterCountEstimate(missingWildcards);
      orderedCardRarities.forEach(cardRarity => {
        if (missingWildcards[cardRarity]) {
          n++;
          wc = document.createElement("div");
          wc.classList.add("wc_explore_cost");
          wc.classList.add("wc_" + cardRarity);
          wc.title = cardRarity.capitalize() + " wldcards needed.";
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
        let bo = document.createElement("div");
        bo.classList.add("bo_explore_cost");
        bo.innerHTML = Math.round(boosterCost);
        bo.title = "Boosters needed (estimated)";
        listItem.right.appendChild(bo);
      }

      if (deck.name.indexOf("?=?Loc/Decks/Precon/") != -1) {
        deck.name = deck.name.replace("?=?Loc/Decks/Precon/", "");
      }

      let deckNameDiv = createDivision(["list_deck_name"], deck.name);
      listItem.leftTop.appendChild(deckNameDiv);

      deck.colors.forEach(function(color) {
        let m = createDivision(["mana_s20", "mana_" + mana[color]]);
        listItem.leftBottom.appendChild(m);
      });

      const dwr = aggregator.deckWinrates[deck.id];
      if (dwr && dwr.total > 0) {
        let deckWinrateDiv = createDivision(["list_deck_winrate"]);
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

        let deckWinrateLastDiv = createDivision(["list_deck_winrate"]);
        deckWinrateLastDiv.style.opacity = 0.6;
        deckWinrateLastDiv.innerHTML = "Since last edit: ";
        const drwr = aggregator.deckRecentWinrates[deck.id];
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

      wrap_l.appendChild(listItem.container);
    });
  }
}

function openDeckCallback(id) {
  let deck = decks.filter(deck => deck.id == id)[0];
  openDeck(deck, 2);
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
}

function archiveDeck(id) {
  ipc_send("archive_deck", id);
  getDeck(id).archived = true;
  openDecksTab();
}

function unarchiveDeck(id) {
  ipc_send("unarchive_deck", id);
  getDeck(id).archived = false;
  openDecksTab();
}

function createTag(tag, div, showClose = true) {
  let tagCol = getTagColor(tag);
  let t = createDivision(["deck_tag"], tag == null ? "Add" : tag);
  t.style.backgroundColor = tagCol;

  if (tag) {
    $(t).on("click", function(e) {
      var colorPick = $(t);
      colorPick.spectrum({
        showInitial: true,
        showAlpha: false,
        showButtons: false
      });
      colorPick.spectrum("set", tagCol);
      colorPick.spectrum("show");

      colorPick.on("move.spectrum", function(e, color) {
        let tag = $(this).text();
        let col = color.toRgbString();
        ipc_send("edit_tag", { tag: tag, color: col });
        setTagColor(tag, col);

        $(".deck_tag").each((index, obj) => {
          let tag = $(obj).text();
          $(obj).css("background-color", getTagColor(tag));
        });
      });

      colorPick.on("hide.spectrum", () => {
        colorPick.spectrum("destroy");
      });
      e.stopPropagation();
    });
  } else {
    $(t).on("click", function(e) {
      if ($(this).html() == "Add") {
        t.innerHTML = "";
        let input = $(
          '<input size="1" onFocus="this.select()" class="deck_tag_input"></input>'
        );
        $(t).prepend(input);

        input[0].focus();
        input[0].select();
        input.keydown(function(e) {
          setTimeout(() => {
            input.css("width", $(this).val().length * 8);
          }, 10);
          if (e.keyCode == 13) {
            let val = $(this).val();
            let deckid = jQuery.data($(this).parent()[0], "deck");

            let masterdiv = $(this)
              .parent()
              .parent()[0];
            addTag(deckid, val, masterdiv);
            $(this)
              .parent()
              .html("Add");
          }
        });
      }
      e.stopPropagation();
    });
  }

  if (showClose) {
    let tc = createDivision(["deck_tag_close"]);
    t.appendChild(tc);

    $(tc).on("click", function(e) {
      e.stopPropagation();
      let deckid = jQuery.data($(this).parent()[0], "deck");
      let val = $(this)
        .parent()
        .text();

      deleteTag(deckid, val);

      $(this).css("width", "0px");
      $(this).css("margin", "0px");
      $(this)
        .parent()
        .css("opacity", 0);
      $(this)
        .parent()
        .css("font-size", 0);
      $(this)
        .parent()
        .css("margin-right", "0px");
      $(this)
        .parent()
        .css("color", $(this).css("background-color"));
    });
  } else {
    t.style.paddingRight = "12px";
  }
  div.appendChild(t);
  return t;
}

function addTag(deckid, tag, div) {
  decks.forEach(function(deck) {
    if (deck.id === deckid && deck.format !== tag) {
      if (deck.tags) {
        if (deck.tags.indexOf(tag) == -1) {
          deck.tags.push(tag);
        }
      } else {
        deck.tags = [tag];
      }
    }
  });

  let obj = { deck: deckid, name: tag };
  ipc_send("add_tag", obj);

  createTag(tag, div);
}

function deleteTag(deckid, tag) {
  decks.forEach(function(deck) {
    if (deck.id == deckid) {
      if (deck.tags) {
        let ind = deck.tags.indexOf(tag);
        if (ind !== -1) {
          deck.tags.splice(ind, 1);
        }
      }
    }
  });

  let obj = { deck: deckid, name: tag };
  ipc_send("delete_tag", obj);
}

module.exports = { openDecksTab: openDecksTab };
