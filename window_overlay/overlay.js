/*
global
  $$,
  addCardHover,
  addCardTile,
  cardsDb,
  compare_cards,
  compare_chances,
  compare_draft_cards,
  CardsList,
  Deck,
  draftRanks,
  eventsList,
  eventsToFormat,
  get_ids_colors,
  setsList,
  windowBackground,
  windowOverlay,
  $
*/
const electron = require("electron");
const { webFrame, remote } = require("electron");

if (!remote.app.isPackaged) {
  const { openNewGitHubIssue, debugInfo } = require("electron-util");
  const unhandled = require("electron-unhandled");
  unhandled({
    showDialog: true,
    reportButton: error => {
      openNewGitHubIssue({
        user: "Manuel-777",
        repo: "MTG-Arena-Tool",
        body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`
      });
    }
  });
}

const fs = require("fs");
const ipc = electron.ipcRenderer;
const striptags = require("striptags");
window.$ = window.jQuery = require("jquery");

let matchBeginTime = Date.now();
let priorityTimers = [];
let clockMode = 0;
let draftMode = 1;
let deckMode = 4;
let overlayMode = 0;
var renderer = 1;

//var turnPhase = 0;
//var turnStep = 0;
//var turnNumber = 0;
//var turnActive = 0;
//var turnDecision = 0;

let playerSeat = 0;
let oppName = "";
let turnPriority = 0;
let soundPriority = false;
let soundPriorityVolume = 1;
let overlayAlpha = 1;
let overlayAlphaBack = 1;
let oddsSampleSize = 1;

let cardQuality = "normal";

let showSideboard = false;
let actionLog = [];

let currentMatch = null;
let cards = {};
let mana = {
  0: "",
  1: "white",
  2: "blue",
  3: "black",
  4: "red",
  5: "green",
  6: "colorless",
  7: "",
  8: "x"
};

const packSizes = { "Ravnica Allegiance": 14, "Guilds of Ravnica": 14 };

const TransparencyMouseFix = require("electron-transparency-mouse-fix");
const fix = new TransparencyMouseFix({
  fixPointerEvents: "auto"
});

function ipc_send(method, arg, to = windowBackground) {
  if (method == "ipc_log") {
    //console.log("IPC LOG", arg);
  }
  ipc.send("ipc_switch", method, windowOverlay, arg, to);
}

window.setInterval(() => {
  updateClock();
}, 250);

function updateClock() {
  var hh, mm, ss;
  if (matchBeginTime == 0) {
    hh = 0;
    mm = 0;
    ss = 0;
  } else if (clockMode == 0) {
    let time = priorityTimers[1] / 1000;
    let now = new Date();
    if (turnPriority == 1 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    $(".clock_priority_1").html(mm + ":" + ss);

    time = priorityTimers[2] / 1000;
    if (turnPriority == 2 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    $(".clock_priority_2").html(mm + ":" + ss);
  } else if (clockMode == 1) {
    var diff = Math.floor((Date.now() - matchBeginTime) / 1000);
    hh = Math.floor(diff / 3600);
    mm = Math.floor((diff % 3600) / 60);
    ss = Math.floor(diff % 60);
    hh = ("0" + hh).slice(-2);
    mm = ("0" + mm).slice(-2);
    ss = ("0" + ss).slice(-2);
    $(".clock_elapsed").html(hh + ":" + mm + ":" + ss);
  } else if (clockMode == 2) {
    $(".clock_elapsed").html(new Date().toLocaleTimeString());
  }
}

function recreateClock() {
  if (clockMode == 0) {
    let p1 = $('<div class="clock_priority_1"></div>');
    let p2 = $('<div class="clock_priority_2"></div>');
    let p1name = oppName;
    let p2name = "You";
    if (playerSeat == 1) {
      p1name = "You";
      p2name = oppName;
    }
    $(".clock_turn").html(
      `<div class="clock_pname1 ${
        turnPriority == 1 ? "pname_priority" : ""
      }">${p1name}</div><div class="clock_pname2 ${
        turnPriority == 2 ? "pname_priority" : ""
      }">${p2name}</div>`
    );
    $(".clock_elapsed").html("");
    $(".clock_elapsed").append(p1);
    $(".clock_elapsed").append(p2);
  } else {
    $(".clock_turn").html("");
    $(".clock_elapsed").html("");

    if (turnPriority == playerSeat) {
      $(".clock_turn").html("You have priority.");
    } else {
      $(".clock_turn").html("Opponent has priority.");
    }
  }

  if (overlayMode == 1) {
    $(".clock_turn").html("");
  }

  updateClock();
}

//
ipc.on("set_db", function(event, arg) {
  try {
    arg = JSON.parse(arg);
    setsList = arg.sets;
    eventsList = arg.events;
    eventsToFormat = arg.events_format;
    delete arg.sets;
    delete arg.events;
    delete arg.events_format;
    delete arg.ranked_events;
    cardsDb.set(arg);
  } catch (e) {
    console.log("Error parsing metadata", e);
    return false;
  }
});

//
ipc.on("set_timer", function(event, arg) {
  if (arg == -1) {
    //overlayMode = 1;
    matchBeginTime = Date.now();
  } else if (arg !== 0) {
    //matchBeginTime = arg == 0 ? 0 : Date.parse(arg);
    matchBeginTime = Date.parse(arg);
  }
  //console.log("set time", arg);
});

ipc.on("set_priority_timer", function(event, arg) {
  if (arg) {
    priorityTimers = arg;
  }
});

ipc.on("action_log", function(event, arg) {
  arg.str = striptags(arg.str, ["log-card", "log-ability"]);

  actionLog.push(arg);
  if (arg.seat == -99) {
    actionLog = [];
  }
  actionLog.sort(compare_logs);
  //console.log(arg.seat, arg.str);
});

ipc.on("set_settings", function(event, settings) {
  // Alpha does some weird things..
  /*
  let alpha = settings.overlay_alpha;
  $('body').css("background-color", "rgba(0,0,0,"+alpha+")");
  $('.overlay_wrapper:before').css("opacity", 0.4*alpha);
  $('.overlay_wrapper').css("opacity", alpha);
  */
  overlayAlpha = settings.overlay_alpha;
  overlayAlphaBack = settings.overlay_alpha_back;
  change_background(settings.back_url);

  webFrame.setZoomFactor(settings.overlay_scale / 100);

  $(".overlay_container").css("opacity", overlayAlpha);
  $(".overlay_wrapper").css("opacity", overlayAlphaBack);
  if (overlayAlphaBack === 1) {
    $(".click-through").each(function() {
      $(this).css("pointer-events", "all");
    });
    $(document.body).css("background-color", "rgba(0,0,0,1)");
  } else {
    $(".click-through").each(function() {
      $(this).css("pointer-events", "inherit");
    });
    $(document.body).css("background-color", "rgba(0,0,0,0)");
  }

  if (settings.cards_quality != undefined) {
    cardQuality = settings.cards_quality;
  }

  showSideboard = settings.overlay_sideboard;
  soundPriority = settings.sound_priority;
  soundPriorityVolume = settings.sound_priority_volume;
  $(".top").css("display", "");
  $(".overlay_deckname").css("display", "");
  $(".overlay_deckcolors").css("display", "");
  $(".overlay_separator").css("display", "");
  $(".overlay_decklist").css("display", "");
  $(".overlay_clock_spacer").css("display", "");
  $(".overlay_clock_container").css("display", "");
  $(".overlay_deck_container").attr("style", "");
  $(".overlay_draft_container").attr("style", "");
  $(".overlay_deckname").attr("style", "");
  $(".overlay_deckcolors").attr("style", "");
  $(".overlay_separator").attr("style", "");

  if (!settings.overlay_top) {
    hideDiv(".top");
    let style = "top: 0px !important;";
    $(".overlay_deck_container").attr("style", style);
    $(".overlay_draft_container").attr("style", style);
  }
  if (!settings.overlay_title) {
    hideDiv(".overlay_deckname");
    hideDiv(".overlay_deckcolors");
    hideDiv(".overlay_separator");
  }
  if (!settings.overlay_deck) {
    hideDiv(".overlay_decklist");
    hideDiv(".overlay_deck_container");
    hideDiv(".overlay_draft_container");
  }
  if (!settings.overlay_clock || overlayMode == 1) {
    hideDiv(".overlay_clock_spacer");
    hideDiv(".overlay_clock_container");
  }
});

function hideDiv(div) {
  let _style = $(div).attr("style");
  if (_style == undefined) _style = "";
  _style += "display: none !important;";
  $(div).attr("style", _style);
}

//
ipc.on("set_hover", function(event, arg) {
  hoverCard(arg);
});

//
ipc.on("set_opponent", function(event, arg) {
  let cleanName = arg;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";
  recreateClock();
  $(".top_username").html(oppName);
});

//
ipc.on("set_opponent_rank", function(event, rank, title) {
  $(".top_rank")
    .css("background-position", rank * -48 + "px 0px")
    .attr("title", title);
});

//
ipc.on("set_cards", function(event, _cards) {
  cards = _cards;
});

let changedMode = true;

ipc.on("set_match", (event, arg) => {
  currentMatch = JSON.parse(arg);

  currentMatch.oppCards = new Deck(currentMatch.oppCards);

  let tempMain = currentMatch.playerCardsLeft.mainDeck;
  currentMatch.playerCardsLeft = new Deck(currentMatch.playerCardsLeft);
  currentMatch.playerCardsLeft.mainboard._list = tempMain;

  currentMatch.player.deck = new Deck(currentMatch.player.deck);
  currentMatch.player.originalDeck = new Deck(currentMatch.player.originalDeck);

  updateView();
});

function updateView() {
  let cleanName =
    currentMatch && currentMatch.opponent && currentMatch.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";

  if (overlayMode == 1) {
    $(".overlay_draft_container").hide();
    $(".overlay_deck_container").show();
  }
  overlayMode = 0;
  var doscroll = false;
  if (
    Math.round(
      $(".overlay_decklist")[0].scrollHeight - $(".overlay_decklist").height()
    ) -
      Math.round($(".overlay_decklist").scrollTop()) <
    32
  ) {
    doscroll = true;
  }

  if (overlayMode == 1) {
    $(".overlay_draft_container").hide();
    $(".overlay_deck_container").show();
  }

  $(".overlay_archetype").remove();
  $(".overlay_deck_container").show();
  $(".overlay_draft_container").hide();
  $(".overlay_decklist").html("");
  $(".overlay_deckcolors").html("");

  let deckListDiv;

  //
  // Action Log Mode
  //
  deckListDiv = $(".overlay_decklist");
  if (deckMode == 4) {
    $(".overlay_deckname").html("Action Log");

    actionLog.forEach(function(log) {
      var d = new Date(log.time);
      var hh = ("0" + d.getHours()).slice(-2);
      var mm = ("0" + d.getMinutes()).slice(-2);
      var ss = ("0" + d.getSeconds()).slice(-2);

      var box = $('<div class="actionlog log_p' + log.seat + '"></div>');
      var time = $(
        '<div class="actionlog_time">' + hh + ":" + mm + ":" + ss + "</div>"
      );
      var str = $('<div class="actionlog_text">' + log.str + "</div>");

      box.append(time);
      box.append(str);
      deckListDiv.append(box);
    });

    if (doscroll) {
      deckListDiv.scrollTop(deckListDiv[0].scrollHeight);
    }

    $$("log-card").forEach(obj => {
      let grpId = obj.getAttribute("id");
      addCardHover(obj, cardsDb.get(grpId));
    });

    $$("log-ability").forEach(obj => {
      let grpId = obj.getAttribute("id");
      let abilityText = cardsDb.getAbility(grpId);
      obj.title = abilityText;
    });

    return;
  }

  let deckToDraw = false;

  //
  // Opponent Cards Mode
  //
  if (deckMode == 3) {
    $('<div class="overlay_archetype"></div>').insertAfter(".overlay_deckname");
    $(".overlay_deckname").html("Played by " + oppName);
    $(".overlay_archetype").html(currentMatch.oppCards.archetype);

    currentMatch.oppCards.colors.get().forEach(color => {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + mana[color] + '"></div>'
      );
    });
    deckToDraw = currentMatch.oppCards;
  }

  //
  // Player Cards Odds Mode
  //
  if (deckMode == 2) {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.append(
      `<div class="chance_title">${cardsLeft} cards left</div>`
    );
    deckToDraw = currentMatch.playerCardsLeft;
  }

  //
  // Player Full Deck Mode
  //
  if (deckMode == 1) {
    let cardsCount = currentMatch.player.deck.mainboard.count();
    deckListDiv.append(`<div class="chance_title">${cardsCount} cards</div>`);
    deckToDraw = currentMatch.player.deck;
  }

  //
  // Player Cards Left Mode
  //
  if (deckMode == 0) {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.append(
      `<div class="chance_title">${cardsLeft} cards left</div>`
    );
    deckToDraw = currentMatch.playerCardsLeft;
  }

  if (deckMode !== 3) {
    $(".overlay_deckname").html(deckToDraw.name);
    deckToDraw.colors.get().forEach(color => {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + mana[color] + '"></div>'
      );
    });
  }

  if (!deckToDraw) return;

  let sortFunc = compare_cards;
  if (deckMode === 2) {
    sortFunc = compare_chances;
  }

  let mainCards = deckToDraw.mainboard;
  mainCards.removeDuplicates();
  mainCards.get().sort(sortFunc);

  mainCards.get().forEach(card => {
    var grpId = card.id;
    if (deckMode == 2) {
      addCardTile(
        grpId,
        "a",
        (card.chance != undefined ? card.chance : "0") + "%",
        deckListDiv
      );
    } else {
      addCardTile(grpId, "a", card.quantity, deckListDiv);
    }
  });
  if (showSideboard && deckToDraw.sideboard.count() > 0) {
    deckListDiv.append('<div class="card_tile_separator">Sideboard</div>');

    let sideCards = deckToDraw.sideboard;
    sideCards.removeDuplicates();
    sideCards.get().sort(sortFunc);

    sideCards.get().forEach(function(card) {
      var grpId = card.id;
      if (deckMode == 2) {
        addCardTile(grpId, "a", "0%", deckListDiv);
      } else {
        addCardTile(grpId, "a", card.quantity, deckListDiv);
      }
    });
  }

  if (deckMode == 2) {
    drawDeckOdds();
  }
}

function drawDeckOdds() {
  let deckListDiv = $(".overlay_decklist");
  deckListDiv.append(`
          <div class="overlay_samplesize_container">
              <div class="odds_prev click-on"></div>
              <div class="odds_number">Sample size: ${oddsSampleSize}</div>
              <div class="odds_next click-on"></div>
          </div>
       `);

  deckListDiv.append('<div class="chance_title"></div>'); // Add some space
  deckListDiv.append(
    '<div class="chance_title">Creature: ' +
      (currentMatch.playerCardsOdds.chanceCre != undefined
        ? currentMatch.playerCardsOdds.chanceCre
        : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Instant: ' +
      (currentMatch.playerCardsOdds.chanceIns != undefined
        ? currentMatch.playerCardsOdds.chanceIns
        : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Sorcery: ' +
      (currentMatch.playerCardsOdds.chanceSor != undefined
        ? currentMatch.playerCardsOdds.chanceSor
        : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Artifact: ' +
      (currentMatch.playerCardsOdds.chanceArt != undefined
        ? currentMatch.playerCardsOdds.chanceArt
        : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Enchantment: ' +
      (currentMatch.playerCardsOdds.chanceEnc != undefined
        ? currentMatch.playerCardsOdds.chanceEnc
        : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Planeswalker: ' +
      (currentMatch.playerCardsOdds.chancePla != undefined
        ? currentMatch.playerCardsOdds.chancePla
        : "0") +
      "%</div>"
  );
  deckListDiv.append(
    '<div class="chance_title">Land: ' +
      (currentMatch.playerCardsOdds.chanceLan != undefined
        ? currentMatch.playerCardsOdds.chanceLan
        : "0") +
      "%</div>"
  );

  //
  $(".odds_prev").click(function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize -= 1;
    if (oddsSampleSize < 1) {
      oddsSampleSize = cardsLeft - 1;
    }
    ipc_send("set_odds_samplesize", oddsSampleSize);
  });
  //
  $(".odds_next").click(function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize += 1;
    if (oddsSampleSize > cardsLeft - 1) {
      oddsSampleSize = 1;
    }
    ipc_send("set_odds_samplesize", oddsSampleSize);
  });
}

var currentDraft;
//
ipc.on("set_draft_cards", function(event, draft) {
  if (overlayMode == 0) {
    overlayMode = 1;
    clockMode = 1;
    recreateClock();
    $(".overlay_draft_container").show();
    $(".overlay_deck_container").hide();
  }
  matchBeginTime = Date.now();
  currentDraft = draft;
  //draftPack = pack;
  //draftPick = picks;
  //packN = packn;
  //pickN = pickn;
  setDraft(currentDraft.packNumber, currentDraft.pickNumber);
});

//
ipc.on("set_turn", function(
  event,
  _we,
  _phase,
  _step,
  _number,
  _active,
  _priority,
  _decision
) {
  playerSeat = _we;
  if (turnPriority != _priority && _priority == _we && soundPriority) {
    //    playBlip();
    let { Howl, Howler } = require("howler");
    let sound = new Howl({ src: ["../sounds/blip.mp3"] });
    Howler.volume(soundPriorityVolume);
    sound.play();
  }
  //turnPhase = _phase;
  //turnStep = _step;
  //turnNumber = _number;
  //turnActive = _active;
  turnPriority = _priority;
  //turnDecision = _decision;
  if (clockMode == 0) {
    recreateClock();
  }
  if (clockMode > 0) {
    if (turnPriority == _we) {
      $(".clock_turn").html("You have priority.");
    } else {
      $(".clock_turn").html("Opponent has priority.");
    }
  }
});

let packN;
let pickN;

function setDraft(_packN = -1, _pickN = -1) {
  if (_packN == -1 || _pickN == -1) {
    packN = currentDraft.packNumber;
    pickN = currentDraft.pickNumber;
  } else {
    packN = _packN;
    pickN = _pickN;
  }
  $(".overlay_decklist").html("");
  $(".overlay_deckcolors").html("");
  let title = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
  if (packN === currentDraft.packNumber && pickN === currentDraft.pickNumber) {
    title += " - Current";
  }
  $(".overlay_deckname").html(title);

  let colors;
  if (draftMode == 0) {
    colors = get_ids_colors(currentDraft.pickedCards);
    colors.forEach(function(color) {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + mana[color] + '"></div>'
      );
    });

    currentDraft.pickedCards.sort(compare_draft_cards);

    currentDraft.pickedCards.forEach(function(grpId) {
      addCardTile(grpId, "a", 1, $(".overlay_decklist"));
    });
  } else if (draftMode == 1) {
    let key = "pack_" + packN + "pick_" + pickN;
    let draftPack = currentDraft[key];
    let pick = "";
    if (!draftPack) {
      draftPack = currentDraft.currentPack;
    } else {
      pick = draftPack.pick;
      draftPack = draftPack.pack;
    }

    console.log("Key", key, currentDraft);
    colors = get_ids_colors(draftPack);
    colors.forEach(function(color) {
      $(".overlay_deckcolors").append(
        '<div class="mana_s20 mana_' + mana[color] + '"></div>'
      );
    });

    draftPack.sort(compare_draft_picks);

    draftPack.forEach(function(grpId) {
      try {
        var rank = cardsDb.get(grpId).rank;
      } catch (e) {
        var rank = 0;
      }

      var od = $(".overlay_decklist");
      var cont = $('<div class="overlay_card_quantity"></div>');
      if (grpId == pick) {
        cont.css("background-color", "rgba(250, 229, 210, 0.66)");
      }

      for (let i = 0; i < 4; i++) {
        if (i < cards[grpId]) {
          $(
            '<div style="width: 24px; " class="inventory_card_quantity_green"></div>'
          ).appendTo(cont);
        } else {
          $(
            '<div style="width: 24px; " class="inventory_card_quantity_gray"></div>'
          ).appendTo(cont);
        }
      }

      cont.appendTo(od);
      let tile = addCardTile(grpId, "a", draftRanks[rank], od);
      if (grpId == pick) {
        tile.style.backgroundColor = "rgba(250, 229, 210, 0.66)";
      }
    });
  }
}

function compare_logs(a, b) {
  if (a.time < b.time) return -1;
  if (a.time > b.time) return 1;
  return 0;
}

function compare_draft_picks(a, b) {
  var arank = cardsDb.get(a).rank;
  var brank = cardsDb.get(b).rank;

  if (arank > brank) return -1;
  if (arank < brank) return 1;

  return 0;
}

function hoverCard(grpId) {
  if (grpId == undefined) {
    $(".overlay_hover").css("opacity", 0);
  } else {
    //let dfc = '';
    //if (cardsDb.get(grpId).dfc == 'DFC_Back') dfc = 'a';
    //if (cardsDb.get(grpId).dfc == 'DFC_Front')  dfc = 'b';
    //if (cardsDb.get(grpId).dfc == 'SplitHalf')  dfc = 'a';
    $(".overlay_hover").css("opacity", 1);
    $(".overlay_hover").attr(
      "src",
      "https://img.scryfall.com/cards" + cardsDb.get(grpId).images["normal"]
    );
    setTimeout(function() {
      $(".overlay_hover").css("opacity", 0);
    }, 10000);
  }
}

function change_background(arg) {
  if (!arg) return;
  if (arg == "default" || arg == "") {
    $(".overlay_bg_image").css("background-image", "");
  } else if (fs.existsSync(arg)) {
    $(".overlay_bg_image").css("background-image", "url(" + arg + ")");
  } else {
    $.ajax({
      url: arg,
      type: "HEAD",
      error: function() {
        $(".overlay_bg_image").css("background-image", "");
      },
      success: function() {
        $(".overlay_bg_image").css("background-image", "url(" + arg + ")");
      }
    });
  }
}

$(document).ready(function() {
  $(".overlay_draft_container").hide();
  recreateClock();
  //
  $(".clock_prev").click(function() {
    clockMode -= 1;
    if (clockMode < 0) {
      clockMode = 2;
    }
    recreateClock();
  });
  //
  $(".clock_next").click(function() {
    clockMode += 1;
    if (clockMode > 2) {
      clockMode = 0;
    }
    recreateClock();
  });

  //
  $(".draft_prev").click(function() {
    pickN -= 1;
    let packSize = (currentDraft && packSizes[currentDraft.set]) || 14;

    if (pickN < 0) {
      pickN = packSize;
      packN -= 1;
    }
    if (packN < 0) {
      pickN = currentDraft.pickNumber;
      packN = currentDraft.packNumber;
    }

    setDraft(packN, pickN);
  });
  //
  $(".draft_next").click(function() {
    pickN += 1;
    let packSize = (currentDraft && packSizes[currentDraft.set]) || 14;

    if (pickN > packSize) {
      pickN = 0;
      packN += 1;
    }

    if (pickN > currentDraft.pickNumber && packN == currentDraft.packNumber) {
      pickN = 0;
      packN = 0;
    }

    if (
      packN > currentDraft.packNumber ||
      (pickN == currentDraft.pickNumber && packN == currentDraft.packNumber)
    ) {
      setDraft();
    } else {
      setDraft(packN, pickN);
    }
  });

  //
  $(".deck_prev").click(function() {
    changedMode = true;
    deckMode -= 1;
    if (deckMode < 0) {
      deckMode = 4;
    }
    updateView();
  });
  //
  $(".deck_next").click(function() {
    changedMode = true;
    deckMode += 1;
    if (deckMode > 4) {
      deckMode = 0;
    }
    updateView();
  });

  //
  $(".close").click(function() {
    ipc_send("overlay_close", 1);
  });

  //
  $(".minimize").click(function() {
    ipc_send("overlay_minimize", 1);
  });

  //
  $(".settings").click(function() {
    ipc_send("force_open_settings", 1);
  });

  $(".overlay_container").hover(
    function() {
      $(".overlay_container").css("opacity", 1);
    },
    function() {
      if (overlayAlpha !== 1) {
        $(".overlay_container").css("opacity", overlayAlpha);
      }
    }
  );
});
