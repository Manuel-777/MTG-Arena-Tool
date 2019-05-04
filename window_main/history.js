/*
globals
  addHover,
  Aggregator,
  cardsDb,
  compare_cards,
  compare_decks,
  createDivision,
  currentId,
  deck_tags,
  decks,
  eventsToFormat,
  FilterPanel,
  get_deck_colors,
  get_rank_index,
  get_rank_index_16,
  getReadableEvent,
  getTagColor,
  getWinrateClass,
  hideLoadingBars,
  ipc_send,
  makeId,
  mana,
  matchesHistory,
  playerData,
  selectAdd,
  setsList,
  setTagColor,
  showLoadingBars,
  sidebarActive,
  sort_decks,
  StatsPanel,
  timeSince,
  toMMSS,
  $$
*/

const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Mythic"];
const { DEFAULT_DECK, DEFAULT_TAG } = Aggregator;
let filters = Aggregator.getDefaultFilters();
let filteredMatches;

let loadHistory = 0;
let viewingLimitSeason = false;

const autocomplete = require("../shared/autocomplete.js");

function open_history_tab(loadMore) {
  if (sidebarActive != 1 || decks == null) return;

  let allMatches;
  sort_decks();
  hideLoadingBars();
  var mainDiv = document.getElementById("ux_0");
  var div, d;
  mainDiv.classList.add("flex_item");
  if (loadMore <= 0) {
    loadMore = 25;
    sort_history();
    allMatches = new Aggregator();
    mainDiv.innerHTML = "";
    loadHistory = 0;

    let wrap_r = createDivision(["wrapper_column", "sidebar_column_l"]);

    div = createDivision(["ranks_history"]);
    div.style.padding = "12px";

    filteredMatches = new Aggregator(filters);
    const statsPanel = new StatsPanel("history_top", filteredMatches.stats);
    const historyTopWinrate = statsPanel.render();
    div.appendChild(historyTopWinrate);

    const rankStats = createDivision(["ranks_stats"]);
    rankStats.style.paddingTop = "16px";
    renderRanksStats(rankStats);
    div.appendChild(rankStats);

    let wrap_l = createDivision(["wrapper_column"]);
    wrap_l.setAttribute("id", "history_column");

    d = createDivision(["list_fill"]);

    wrap_r.appendChild(div);
    mainDiv.appendChild(wrap_l);
    mainDiv.appendChild(wrap_r);
    wrap_l.appendChild(d);
  }

  var historyColumn = document.getElementById("history_column");

  // container hierarchy which this next section of code deals with is:
  // .history_column
  //   .history_top
  //     .history_top_filter
  //     .history_top_winrate
  //       .list_deck_winrate
  //       .list_match_time

  // Event ID filter
  if (loadHistory === 0) {
    let historyTop = createDivision(["history_top"]);

    const eventFilter = { eventId: filters.eventId };
    const matchesInEvent = new Aggregator(eventFilter);

    const handler = selected => {
      filters = { ...filters, ...selected };
      if (selected.eventId) {
        filters.tag = DEFAULT_TAG;
        filters.deckId = DEFAULT_DECK;
      }
      open_history_tab(0);
    };

    const filterPanel = new FilterPanel(
      "history_top",
      handler,
      filters,
      allMatches.events,
      matchesInEvent.tags,
      matchesInEvent.decks,
      true
    );
    const historyTopFilter = filterPanel.render();
    historyTop.appendChild(historyTopFilter);
    historyColumn.appendChild(historyTop);
  }
  const filteredSampleSize = filteredMatches.matches.length;

  //console.log("loadHistory: ", loadHistory, "loadMore: ", loadMore, "matches.length: ", matchesHistory.matches.length, "filteredSampleSize: ", filteredSampleSize);
  // loadMore = The ammount of items we want to load
  // loadHistory = The starting point to load
  // loadEnd = The ending point
  // actuallyLoaded = The number of items that were actually loaded
  //   some items are skipped due to being invalid to what we want to load or having broken data
  //let dd = createDivision(["list_fill"]);
  //historyColumn.appendChild(dd);
  var actuallyLoaded = loadHistory;
  var begin = loadHistory;
  for (
    var loadEnd = loadHistory + loadMore;
    actuallyLoaded < loadEnd &&
    loadHistory <= matchesHistory.matches.length &&
    actuallyLoaded - begin < filteredSampleSize;
    loadHistory++
  ) {
    const revIndex = matchesHistory.matches.length - loadHistory - 1;
    var match_id = matchesHistory.matches[revIndex];
    var match = matchesHistory[match_id];

    //console.log("match: ", match_id, match);
    if (match == undefined) {
      continue;
    }

    if (match.type == "match") {
      if (match.opponent == undefined) {
        continue;
      }
      if (match.opponent.userid.indexOf("Familiar") !== -1) {
        continue;
      }
    }

    if (match.type == "Event") {
      continue;
    }

    if (!filteredMatches.filterMatch(match)) {
      continue;
    }

    actuallyLoaded++;
    //console.log("Load match: ", match_id, match);
    //console.log("Match: ", loadHistory, match.type, match);

    let div = createDivision([match.id, "list_match"]);
    let fltl = createDivision(["flex_item"]);
    let fll = createDivision(["flex_item"]);
    fll.style.flexDirection = "column";

    let flt = createDivision(["flex_top"]);
    let flb = createDivision(["flex_bottom"]);
    fll.appendChild(flt);
    fll.appendChild(flb);
    let fct = createDivision(["flex_top"]);

    let flc = createDivision(["flex_item"]);
    flc.style.flexDirection = "column";
    flc.style.flexGrow = 2;
    flc.appendChild(fct);

    let fcb = createDivision(["flex_bottom"]);
    fcb.style.marginRight = "14px";
    flc.appendChild(fcb);

    let flr = createDivision(["rightmost", "flex_item"]);

    var tileGrpid, tile;
    if (match.type == "match") {
      let t;
      tileGrpid = match.playerDeck.deckTileId;
      try {
        t = cardsDb.get(tileGrpid).images["art_crop"];
      } catch (e) {
        tileGrpid = 67003;
      }

      tile = createDivision([match.id + "t", "deck_tile"]);

      try {
        tile.style.backgroundImage =
          "url(https://img.scryfall.com/cards" +
          cardsDb.get(tileGrpid).images["art_crop"] +
          ")";
      } catch (e) {
        console.error(e, tileGrpid);
      }
      fltl.appendChild(tile);

      // This is pretty useful to debug scrolling
      //d = createDivision(["list_deck_name"], actuallyLoaded+" ("+loadHistory+") - "+match.playerDeck.name);
      d = createDivision(["list_deck_name"], match.playerDeck.name);
      flt.appendChild(d);

      d = createDivision(
        ["list_deck_name_it"],
        getReadableEvent(match.eventId)
      );
      flt.appendChild(d);

      match.playerDeck.colors.forEach(function(color) {
        var m = createDivision(["mana_s20", "mana_" + mana[color]]);
        flb.appendChild(m);
      });

      if (match.opponent.name == null) {
        match.opponent.name = "-";
      }
      d = createDivision(
        ["list_match_title"],
        "vs " + match.opponent.name.slice(0, -6)
      );
      fct.appendChild(d);

      var or = createDivision(["ranks_16"]);
      or.style.backgroundPosition =
        get_rank_index_16(match.opponent.rank) * -16 + "px 0px";
      or.title = match.opponent.rank + " " + match.opponent.tier;
      fct.appendChild(or);

      d = createDivision(
        ["list_match_time"],
        timeSince(new Date(match.date)) + " ago - " + toMMSS(match.duration)
      );
      fcb.appendChild(d);

      var cc = get_deck_colors(match.oppDeck);
      cc.forEach(function(color) {
        var m = createDivision(["mana_s20", "mana_" + mana[color]]);
        fcb.appendChild(m);
      });

      let tags_div = createDivision(["history_tags"]);
      fcb.appendChild(tags_div);

      // set archetype
      t = eventsToFormat[match.eventId];
      let tags = [];
      if (t && deck_tags[t]) {
        deck_tags[t].forEach(val => {
          tags.push({ tag: val.tag, q: val.average });
        });
      }
      if (match.tags) {
        match.tags.forEach(tag => {
          let t = createTag(tag, tags_div, true);
          jQuery.data(t, "match", match_id);
          jQuery.data(t, "autocomplete", tags);
        });
        if (match.tags.length == 0) {
          let t = createTag(null, tags_div, false);
          jQuery.data(t, "match", match_id);
          jQuery.data(t, "autocomplete", tags);
        }
      } else {
        let t = createTag(null, tags_div, false);
        jQuery.data(t, "match", match_id);
        jQuery.data(t, "autocomplete", tags);
      }

      d = createDivision(
        [
          "list_match_result",
          match.player.win > match.opponent.win ? "green" : "red"
        ],
        `${match.player.win}:${match.opponent.win}`
      );
      flr.appendChild(d);
    } else if (match.type == "draft") {
      // console.log("Draft: ", match);
      try {
        tileGrpid = setsList[match.set].tile;
      } catch (e) {
        tileGrpid = 67003;
      }

      tile = createDivision([match.id + "t", "deck_tile"]);

      try {
        tile.style.backgroundImage =
          "url(https://img.scryfall.com/cards" +
          cardsDb.get(tileGrpid).images["art_crop"] +
          ")";
      } catch (e) {
        console.error(e);
      }
      fltl.appendChild(tile);

      d = createDivision(["list_deck_name"], match.set + " draft");
      flt.appendChild(d);

      d = createDivision(
        ["list_match_time"],
        timeSince(new Date(match.date)) + " ago."
      );
      fcb.appendChild(d);

      d = createDivision(["list_match_replay"], "See replay");
      fct.appendChild(d);

      d = createDivision(["list_draft_share", match.id + "dr"]);
      flr.appendChild(d);
    }

    var fldel = createDivision(["flex_item", match.id + "_del", "delete_item"]);

    div.appendChild(fltl);
    div.appendChild(fll);
    div.appendChild(flc);
    div.appendChild(flr);
    div.appendChild(fldel);

    historyColumn.appendChild(div);

    if (match.type == "draft") {
      addShare(match);
    }
    deleteMatch(match);
    addHover(match, tileGrpid);
  }

  $(this).off();

  historyColumn.addEventListener("scroll", () => {
    if (
      Math.round(historyColumn.scrollTop + historyColumn.offsetHeight) >=
      historyColumn.scrollHeight
    ) {
      open_history_tab(20);
    }
  });

  $$(".delete_item").forEach(item => {
    item.addEventListener("mouseover", () => {
      item.style.width = "32px";
    });

    item.addEventListener("mouseout", () => {
      item.style.width = "4px";
    });
  });

  //loadHistory = actuallyLoaded;
}

function formatPercent(percent, precision) {
  // Utility function: converts a number to rounded percent
  // converts number to percent
  // 0.333333 -> 33%
  // 20 -> 2000%
  precision = precision || 0;
  return (100 * percent).toFixed(precision);
}

function renderRanksStats(container) {
  /*
    globals:
      viewingLimitSeason
      matchesHistory
      get_rank_index
      getStepsUntilNextRank
      createButton
      formatPercent
      playerData
  */
  container.innerHTML = "";

  let seasonName = !viewingLimitSeason ? "constructed" : "limited";
  let switchSeasonName = viewingLimitSeason ? "constructed" : "limited";

  let seasonToggleButton = createDivision(
    ["button_simple", "button_thin", "season_toggle"],
    `Show ${switchSeasonName}`
  );
  seasonToggleButton.style.marginTop = "32px !important;";

  container.appendChild(seasonToggleButton);

  var title = createDivision(
    ["ranks_history_title"],
    `Current ${seasonName} season:`
  );
  container.appendChild(title);

  // Add ranks matchup history here
  let rc = matchesHistory.rankwinrates[seasonName];
  var lastWinrate; // used later

  Object.values(rc).forEach(object => {
    // object is either rank win/loss data OR metadata
    // See function calculateRankWins() in background.js
    var rankName = object.r;
    var totalGames = object.t;
    var wonGames = object.w;
    var lostGames = object.l;

    if (!rankName || totalGames <= 0) {
      // this is a not winrate object OR
      // we have no data for this rank so don't display it
      return;
    }

    var rowContainer = createDivision(["flex_item"]);
    //rowContainer.style.flexDirection = "column";
    rowContainer.style.justifyContent = "center";

    var versusPrefix = createDivision(["ranks_history_title"], "Vs.");
    rowContainer.appendChild(versusPrefix);

    var rankBadge = createDivision(["ranks_history_badge"]);
    rankBadge.title = rankName;
    rankBadge.style.backgroundPosition = `${get_rank_index(rankName, 1) *
      -48}px 0px`;
    rowContainer.appendChild(rankBadge);

    var rankSpecificWinrate = createDivision(
      ["ranks_history_title"],
      `${wonGames}:${lostGames} (${formatPercent(wonGames / totalGames)}%)`
    );

    // let sampleSize = `Sample size: ${totalGames}`;
    // rankSpecificWinrate.title = sampleSize;

    rowContainer.appendChild(rankSpecificWinrate);

    container.appendChild(rowContainer);

    lastWinrate = wonGames / totalGames;
  });

  let totalWon = rc.total.w;
  let totalLost = rc.total.l;
  let totalWinrate = totalWon / rc.total.t;
  title = createDivision(
    ["ranks_history_title"],
    `Total: ${totalWon}:${totalLost} (${formatPercent(totalWinrate)}%)`
  );
  // let sampleSize = `Sample size: ${rc.total.t}`;
  // title.title = sampleSize;
  container.appendChild(title);

  let currentRank = viewingLimitSeason
    ? playerData.rank.limited.rank
    : playerData.rank.constructed.rank;
  let expected = getStepsUntilNextRank(viewingLimitSeason, totalWinrate);

  title = createDivision(
    ["ranks_history_title"],
    `Games until ${getNextRank(currentRank)}: ${expected}`
  );
  title.title = `Using ${formatPercent(totalWinrate)}% winrate`;
  container.appendChild(title);

  seasonToggleButton.addEventListener("click", event => {
    viewingLimitSeason = !viewingLimitSeason;
    renderRanksStats(container);
  });
}

function createTag(tag, div, showClose = true) {
  let tagCol = getTagColor(tag);
  let iid = makeId(6);
  let t = createDivision(
    ["deck_tag", iid],
    tag == null ? "Set archetype" : tag
  );
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
      if ($(this).html() == "Set archetype") {
        t.innerHTML = "";
        let input = $(
          `<input style="min-width: 120px;" id="${iid}" size="1" autocomplete="off" type="text" onFocus="this.select()" class="deck_tag_input"></input>`
        );
        let ac = $('<div class="autocomplete"></div>');
        input.appendTo(ac);
        $(t).prepend(ac);

        input[0].focus();
        input[0].select();

        let options = jQuery.data($(this)[0], "autocomplete");
        autocomplete(input[0], options, () => {
          input[0].focus();
          input[0].select();
          input[0].dispatchEvent(new KeyboardEvent("keydown", { keyCode: 13 }));
        });
        input.keydown(function(e) {
          setTimeout(() => {
            input.css("width", $(this).val().length * 8);
          }, 10);
          if (e.keyCode == 13) {
            let val = $(this).val();
            let matchid = jQuery.data(
              $(this)
                .parent()
                .parent()[0],
              "match"
            );
            let masterdiv = $(this)
              .parent()
              .parent()
              .parent()[0];
            addTag(matchid, val, masterdiv);

            $(this)
              .parent()
              .parent()
              .remove();
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
      let matchid = jQuery.data($(this).parent()[0], "match");
      let options = jQuery.data($(this).parent()[0], "autocomplete");
      let val = $(this)
        .parent()
        .text();

      deleteTag(matchid, val);

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

      setTimeout(e => {
        $(this).remove();
      }, 200);

      let t = createTag(
        null,
        $(this)
          .parent()
          .parent()[0],
        false
      );
      jQuery.data(t, "match", matchid);
      jQuery.data(t, "autocomplete", options);
    });
  } else {
    t.style.paddingRight = "12px";
  }
  div.appendChild(t);

  return t;
}

function addTag(matchid, tag, div) {
  let match = matchesHistory[matchid];
  if (match.tags) {
    if (match.tags.indexOf(tag) == -1) {
      match.tags.push(tag);
    }
  } else {
    match.tags = [tag];
  }

  let obj = { match: matchid, name: tag };
  ipc_send("add_history_tag", obj);

  let t = createTag(tag, div);
  jQuery.data(t, "match", matchid);
}

function deleteTag(matchid, tag) {
  let match = matchesHistory[matchid];

  if (match.tags) {
    let ind = match.tags.indexOf(tag);
    if (ind !== -1) {
      match.tags.splice(ind, 1);
    }
  }

  let obj = { match: matchid, name: tag };
  ipc_send("delete_history_tag", obj);
}

function getNextRank(currentRank) {
  /*
    Globals used: RANKS
  */
  var rankIndex = RANKS.indexOf(currentRank);
  if (rankIndex < RANKS.length - 1) {
    return RANKS[rankIndex + 1];
  } else {
    return undefined;
  }
}

function getStepsUntilNextRank(mode, winrate) {
  let rr = mode ? playerData.rank.limited : playerData.rank.constructed;

  let cr = rr.rank;
  let cs = rr.step;
  let ct = rr.tier;

  let st = 1;
  let stw = 1;
  let stl = 0;
  if (cr == "Bronze") {
    st = 4;
    stw = 2;
    stl = 0;
  }
  if (cr == "Silver") {
    st = 5;
    stw = 2;
    stl = 1;
  }
  if (cr == "Gold") {
    st = 6;
    stw = 1;
    stl = 1;
  }
  if (cr == "Platinum") {
    st = 7;
    stw = 1;
    stl = 1;
  }
  if (cr == "Diamond") {
    st = 1;
    stw = 1;
    stl = 1;
  }

  let stepsNeeded = st * ct - cs;

  if (winrate <= 0.5) return "&#x221e";
  let expected = 0;
  let n = 0;
  console.log("stepsNeeded", stepsNeeded);
  while (expected <= stepsNeeded) {
    expected = n * winrate * stw - n * (1 - winrate) * stl;
    //console.log("stepsNeeded:", stepsNeeded, "expected:", expected, "N:", n);
    n++;
  }

  return "~" + n;
}

function addShare(_match) {
  $("." + _match.id + "dr").on("click", function(e) {
    currentId = _match.id;
    e.stopPropagation();
    $(".dialog_wrapper").css("opacity", 1);
    $(".dialog_wrapper").css("pointer-events", "all");
    $(".dialog_wrapper").show();
    $(".dialog").css("width", "500px");
    $(".dialog").css("height", "200px");
    $(".dialog").css("top", "calc(50% - 100px)");

    $(".dialog_wrapper").on("click", function() {
      console.log(".dialog_wrapper on click");
      //e.stopPropagation();
      $(".dialog_wrapper").css("opacity", 0);
      $(".dialog_wrapper").css("pointer-events", "none");
      setTimeout(function() {
        $(".dialog_wrapper").hide();
        $(".dialog").css("width", "400px");
        $(".dialog").css("height", "160px");
        $(".dialog").css("top", "calc(50% - 80px)");
      }, 250);
    });

    $(".dialog").on("click", function(e) {
      e.stopPropagation();
      console.log(".dialog on click");
    });

    var dialog = $(".dialog");
    dialog.html("");
    var cont = $('<div class="dialog_container"></div>');

    cont.append('<div class="share_title">Link For sharing:</div>');
    var icd = $('<div class="share_input_container"></div>');
    var but = $('<div class="button_simple">Copy</div>');
    var sin = $(
      '<input id="share_input" onClick="this.setSelectionRange(0, this.value.length)" autofocus autocomplete="off" value="" />'
    );

    sin.appendTo(icd);
    but.appendTo(icd);
    icd.appendTo(cont);

    cont.append('<div class="share_subtitle"><i>Expires in: </i></div>');
    cont.appendTo(dialog);

    var select = $('<select id="expire_select"></select>');
    var sortby = ["One day", "One week", "One month", "Never"];
    for (var i = 0; i < sortby.length; i++) {
      select.append(
        '<option value="' + sortby[i] + '">' + sortby[i] + "</option>"
      );
    }
    select.appendTo(cont);
    selectAdd(select, draftShareLink);

    but.click(function() {
      ipc_send("set_clipboard", document.getElementById("share_input").value);
    });
  });
}

function draftShareLink() {
  var shareExpire = document.getElementById("expire_select").value;
  var expire = 0;
  switch (shareExpire) {
    case "One day":
      expire = 0;
      break;
    case "One week":
      expire = 1;
      break;
    case "One month":
      expire = 2;
      break;
    case "Never":
      expire = -1;
      break;
    default:
      expire = 0;
      break;
  }
  var obj = {
    expire: expire,
    id: currentId
  };
  showLoadingBars();
  ipc_send("request_draft_link", obj);
}

function deleteMatch(_match) {
  $("." + _match.id + "_del").on("click", function(e) {
    let currentId = _match.id;
    e.stopPropagation();
    ipc_send("delete_match", currentId);
    let deleteButton = $$("." + currentId)[0];
    deleteButton.style.height = "0px";
    deleteButton.style.overflow = "hidden";
  });
}

function sort_history() {
  matchesHistory.matches.sort(compare_matches);

  matchesHistory.matches.forEach(function(mid) {
    var match = matchesHistory[mid];

    if (mid != null && match != undefined) {
      if (match.type != "draft" && match.type != "Event") {
        try {
          if (match.playerDeck.mainDeck == undefined) {
            match.playerDeck = JSON.parse(
              '{"deckTileId":67003,"description":null,"format":"Standard","colors":[],"id":"00000000-0000-0000-0000-000000000000","isValid":false,"lastUpdated":"2018-05-31T00:06:29.7456958","lockedForEdit":false,"lockedForUse":false,"mainDeck":[],"name":"Undefined","resourceId":"00000000-0000-0000-0000-000000000000","sideboard":[]}'
            );
          } else {
            match.playerDeck.colors = get_deck_colors(match.playerDeck);
          }
          match.playerDeck.mainDeck.sort(compare_cards);
          match.oppDeck.colors = get_deck_colors(match.oppDeck);
          match.oppDeck.mainDeck.sort(compare_cards);
        } catch (e) {
          console.log(e, match);
        }
      }
    }
  });
}

function compare_matches(b, a) {
  if (a == undefined) return -1;
  if (b == undefined) return 1;

  a = matchesHistory[a];
  b = matchesHistory[b];

  if (a == undefined) return -1;
  if (b == undefined) return 1;

  a = Date.parse(a.date);
  b = Date.parse(b.date);
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

module.exports = { open_history_tab: open_history_tab };
