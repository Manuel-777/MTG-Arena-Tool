const { ipcRenderer: ipc, webFrame, remote } = require("electron");
const format = require("date-fns/format");

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

const TransparencyMouseFix = require("electron-transparency-mouse-fix");
const striptags = require("striptags");

const db = require("../shared/database");
const pd = require("../shared/player-data");
const Deck = require("../shared/deck.js");
const Colors = require("../shared/colors");
const deckDrawer = require("../shared/deck-drawer");
const {
  compare_cards,
  deckManaCurve,
  deckTypesStats,
  get_card_type_sort
} = require("../shared/util");
const {
  addCardHover,
  attachOwnerhipStars,
  setRenderer
} = require("../shared/card-hover");
const { queryElements: $$, createDiv } = require("../shared/dom-fns");

const {
  COLORS_ALL,
  DRAFT_RANKS,
  MANA,
  PACK_SIZES,
  IPC_BACKGROUND,
  IPC_OVERLAY,
  IPC_MAIN,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_MIXED,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG,
  OVERLAY_DRAFT_BREW,
  OVERLAY_DRAFT_MODES
} = require("../shared/constants.js");

let landsCard = {
  id: 100,
  name: "Lands",
  set: "",
  artid: 0,
  type: "Special",
  cost: [],
  cmc: 0,
  rarity: "",
  cid: 0,
  frame: [1, 2, 3, 4, 5],
  artist: "",
  dfc: "None",
  collectible: false,
  craftable: false,
  images: {
    art_crop: "../images/type_land.png"
  },
  dfcId: 0
};

let matchBeginTime = Date.now();
let priorityTimers = [];
let clockMode = 0;
let overlayMode = 0;
let overlayIndex = -1;
setRenderer(1);

let playerSeat = 0;
let oppName = "";
let turnPriority = 0;
let oddsSampleSize = 1;

let actionLog = [];

let currentMatch = null;

const fix = new TransparencyMouseFix({
  fixPointerEvents: "auto"
});

//
function get_ids_colors(list) {
  var colors = [];
  list.forEach(function(grpid) {
    var cdb = db.card(grpid);
    if (cdb) {
      //var card_name = cdb.name;
      var card_cost = cdb.cost;
      card_cost.forEach(function(c) {
        if (c.indexOf("w") !== -1 && !colors.includes(1)) colors.push(1);
        if (c.indexOf("u") !== -1 && !colors.includes(2)) colors.push(2);
        if (c.indexOf("b") !== -1 && !colors.includes(3)) colors.push(3);
        if (c.indexOf("r") !== -1 && !colors.includes(4)) colors.push(4);
        if (c.indexOf("g") !== -1 && !colors.includes(5)) colors.push(5);
      });
    }
  });

  return colors;
}

//
function compare_chances(a, b) {
  // Yeah this is lazy.. I know
  a = a.chance;
  b = b.chance;

  if (a > b) {
    return -1;
  }
  if (a < b) {
    return 1;
  }

  return 0;
}

//
function compare_draft_cards(a, b) {
  // Yeah this is lazy.. I know
  a = db.card(a);
  b = db.card(b);
  var as = get_card_type_sort(a.type);
  var bs = get_card_type_sort(b.type);

  // Order by type?
  if (as < bs) {
    return -1;
  }
  if (as > bs) {
    return 1;
  }

  // by cmc
  if (a.cmc < b.cmc) {
    return -1;
  }
  if (a.cmc > b.cmc) {
    return 1;
  }

  // then by name
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }

  return 0;
}

function ipcSend(method, arg, to = IPC_BACKGROUND) {
  if (method == "ipc_log") {
    //console.log("IPC LOG", arg);
  }
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

window.setInterval(() => {
  updateClock();
}, 250);

function updateClock() {
  let hh, mm, ss;
  if (matchBeginTime === 0) {
    hh = 0;
    mm = 0;
    ss = 0;
  } else if (clockMode === 0) {
    let time = priorityTimers[1] / 1000;
    const now = new Date();
    if (turnPriority === 1 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    $$(".clock_priority_1")[0].innerHTML = mm + ":" + ss;

    time = priorityTimers[2] / 1000;
    if (turnPriority === 2 && time > 0) {
      time += (now - new Date(priorityTimers[0])) / 1000;
    }

    mm = Math.floor((time % 3600) / 60);
    mm = ("0" + mm).slice(-2);
    ss = Math.floor(time % 60);
    ss = ("0" + ss).slice(-2);
    $$(".clock_priority_2")[0].innerHTML = mm + ":" + ss;
  } else if (clockMode === 1) {
    const diff = Math.floor((Date.now() - matchBeginTime) / 1000);
    hh = Math.floor(diff / 3600);
    mm = Math.floor((diff % 3600) / 60);
    ss = Math.floor(diff % 60);
    hh = ("0" + hh).slice(-2);
    mm = ("0" + mm).slice(-2);
    ss = ("0" + ss).slice(-2);
    $$(".clock_elapsed")[0].innerHTML = hh + ":" + mm + ":" + ss;
  } else if (clockMode === 2) {
    $$(".clock_elapsed")[0].innerHTML = new Date().toLocaleTimeString();
  }
}

function recreateClock() {
  const clockTurn = $$(".clock_turn")[0];
  const clockElapsed = $$(".clock_elapsed")[0];

  if (clockMode === 0) {
    const p1 = createDiv(["clock_priority_1"]);
    const p2 = createDiv(["clock_priority_2"]);
    let p1name = oppName;
    let p2name = "You";
    if (playerSeat == 1) {
      p1name = "You";
      p2name = oppName;
    }
    clockTurn.innerHTML = `<div class="clock_pname1 ${
      turnPriority == 1 ? "pname_priority" : ""
    }">${p1name}</div><div class="clock_pname2 ${
      turnPriority == 2 ? "pname_priority" : ""
    }">${p2name}</div>`;

    clockElapsed.innerHTML = "";
    clockElapsed.appendChild(p1);
    clockElapsed.appendChild(p2);
  } else {
    clockTurn.innerHTML = "";
    clockElapsed.innerHTML = "";

    if (turnPriority == playerSeat) {
      clockTurn.innerHTML = "You have priority.";
    } else {
      clockTurn.innerHTML = "Opponent has priority.";
    }
  }

  if (OVERLAY_DRAFT_MODES.includes(overlayMode)) {
    clockTurn.innerHTML = "";
  }

  updateClock();
}

//
ipc.on("close", (event, arg) => {
  close(arg);
});

//
ipc.on("set_timer", function(event, arg) {
  if (arg == -1) {
    matchBeginTime = Date.now();
  } else if (arg !== 0) {
    //matchBeginTime = arg == 0 ? 0 : Date.parse(arg);
    matchBeginTime = Date.parse(arg);
  }
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

ipc.on("settings_updated", (_event, index) => {
  if (overlayIndex !== index) {
    console.log("OVERLAY INDEX: " + (index + 1));
  }
  overlayIndex = index;
  const settings = pd.settings.overlays[overlayIndex];
  overlayMode = settings.mode;

  webFrame.setZoomFactor(settings.scale / 100);

  $$(".overlay_container")[0].style.opacity = settings.alpha;
  $$(".overlay_wrapper")[0].style.opacity = settings.alpha_back;
  if (settings.alpha_back === 1) {
    $$(".click-through").forEach(el => (el.style.pointerEvents = "all"));
    document.body.style.backgroundColor = "rgba(0,0,0,1)";
  } else {
    $$(".click-through").forEach(el => (el.style.pointerEvents = "inherit"));
    document.body.style.backgroundColor = "rgba(0,0,0,0)";
  }
  change_background(pd.settings.back_url);

  $$(".overlay_title")[0].innerHTML = "Overlay " + (overlayIndex + 1);
  $$(".top")[0].style.display = settings.top ? "" : "none";
  $$(".overlay_icon")[0].style.backgroundColor = `var(--color-${
    COLORS_ALL[overlayIndex]
  })`;

  $$(".overlay_deckname")[0].innerHTML = "";
  $$(".overlay_deckname")[0].style = "";
  $$(".overlay_deckname")[0].style.display = settings.title ? "" : "none";
  $$(".overlay_deckcolors")[0].innerHTML = "";
  $$(".overlay_deckcolors")[0].style = "";
  $$(".overlay_deckcolors")[0].style.display = settings.title ? "" : "none";

  $$(".overlay_decklist")[0].innerHTML = "";
  $$(".overlay_decklist")[0].style.display = settings.deck ? "" : "none";

  const showClock =
    settings.clock && !OVERLAY_DRAFT_MODES.includes(overlayMode);
  $$(".overlay_clock_container")[0].style.display = showClock ? "" : "none";

  if (OVERLAY_DRAFT_MODES.includes(overlayMode)) {
    updateDraftView();
  } else {
    updateMatchView();
  }
});

//
ipc.on("set_opponent", function(event, arg) {
  let cleanName = arg;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";
  recreateClock();
  if ($$(".top_username")[0]) {
    $$(".top_username")[0].innerHTML = oppName;
  }
});

//
ipc.on("set_opponent_rank", function(event, rank, title) {
  const topRank = $$(".top_rank")[0];
  topRank.style.backgroundPosition = rank * -48 + "px 0px";
  topRank.title = title;
});

ipc.on("set_match", (event, arg) => {
  if (overlayIndex == -1) return;
  if (OVERLAY_DRAFT_MODES.includes(overlayMode)) return false;
  let settings = pd.settings.overlays[overlayIndex];

  if (settings.show == false && settings.show_always == false) return false;

  currentMatch = JSON.parse(arg);

  currentMatch.oppCards = new Deck(currentMatch.oppCards);

  let tempMain = currentMatch.playerCardsLeft.mainDeck;
  currentMatch.playerCardsLeft = new Deck(currentMatch.playerCardsLeft);
  currentMatch.playerCardsLeft.mainboard._list = tempMain;

  currentMatch.player.deck = new Deck(currentMatch.player.deck);
  currentMatch.player.originalDeck = new Deck(currentMatch.player.originalDeck);

  updateMatchView();
});

function updateMatchView() {
  if (overlayIndex === -1) return;
  if (!currentMatch) return;
  let settings = pd.settings.overlays[overlayIndex];

  let cleanName =
    currentMatch && currentMatch.opponent && currentMatch.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";

  const container = $$(".overlay_decklist")[0];
  const doscroll =
    Math.round(
      container.scrollHeight - container.offsetHeight - container.scrollTop
    ) < 32;

  if ($$(".overlay_archetype")[0]) {
    $$(".overlay_archetype")[0].remove();
  }

  $$(".overlay_decklist")[0].innerHTML = "";
  $$(".overlay_deckcolors")[0].innerHTML = "";
  $$(".overlay_deckname")[0].innerHTML = "";

  let deckListDiv;

  deckListDiv = $$(".overlay_decklist")[0];
  if (overlayMode === OVERLAY_LOG) {
    // Action Log Mode
    $$(".overlay_deckname")[0].innerHTML = "Action Log";

    let initalTime = actionLog[0] ? new Date(actionLog[0].time) : new Date();
    actionLog.forEach(log => {
      const _date = new Date(log.time);
      const secondsPast = Math.round((_date - initalTime) / 1000);

      const box = createDiv(["actionlog", "log_p" + log.seat]);
      const time = createDiv(["actionlog_time"], secondsPast + "s", {
        title: format(_date, "HH:mm:ss")
      });
      const str = createDiv(["actionlog_text"], log.str);

      box.appendChild(time);
      box.appendChild(str);
      deckListDiv.appendChild(box);
    });

    if (doscroll) {
      deckListDiv.scrollTop = deckListDiv.scrollHeight;
    }

    $$("log-card").forEach(obj => {
      const grpId = obj.getAttribute("id");
      addCardHover(obj, db.card(grpId));
    });

    $$("log-ability").forEach(obj => {
      const grpId = obj.getAttribute("id");
      const abilityText = db.abilities[grpId] || "";
      obj.title = abilityText;
    });

    return;
  }

  let deckToDraw = false;

  if (overlayMode === OVERLAY_FULL) {
    // Full Deck Mode
    let cardsCount = currentMatch.player.deck.mainboard.count();
    deckListDiv.appendChild(
      createDiv(["decklist_title"], "Full Deck: " + cardsCount + " cards")
    );
    deckToDraw = currentMatch.player.deck;
  } else if (overlayMode === OVERLAY_LEFT) {
    // Library Mode
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.appendChild(
      createDiv(["decklist_title"], "Library: " + cardsLeft + " cards")
    );
    deckToDraw = currentMatch.playerCardsLeft;
  } else if (overlayMode === OVERLAY_ODDS || overlayMode === OVERLAY_MIXED) {
    // Next Draw Odds Mode
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    deckListDiv.appendChild(
      createDiv(
        ["decklist_title"],
        `Next Draw: ${oddsSampleSize}/${cardsLeft} cards`
      )
    );
    deckToDraw = currentMatch.playerCardsLeft;
  } else if (overlayMode === OVERLAY_SEEN) {
    // Opponent Cards Mode
    const deckName = $$(".overlay_deckname")[0];
    deckName.parentNode.insertBefore(
      createDiv(["overlay_archetype"]),
      deckName.nextSibling
    );
    deckName.innerHTML = "Played by " + oppName;
    $$(".overlay_archetype")[0].innerHTML = currentMatch.oppArchetype;

    currentMatch.oppCards.colors
      .get()
      .forEach(color =>
        $$(".overlay_deckcolors")[0].appendChild(
          createDiv(["mana_s20", "mana_" + MANA[color]])
        )
      );
    deckToDraw = currentMatch.oppCards;
  }

  if (!deckToDraw) return;

  // Deck colors
  if (
    [OVERLAY_ODDS, OVERLAY_MIXED, OVERLAY_FULL, OVERLAY_LEFT].includes(
      overlayMode
    )
  ) {
    $$(".overlay_deckname")[0].innerHTML = deckToDraw.name;
    deckToDraw.colors
      .get()
      .forEach(color =>
        $$(".overlay_deckcolors")[0].appendChild(
          createDiv(["mana_s20", "mana_" + MANA[color]])
        )
      );
  }

  let sortFunc = compare_cards;
  if (overlayMode === OVERLAY_ODDS || overlayMode == OVERLAY_MIXED) {
    sortFunc = compare_chances;
  }

  let mainCards = deckToDraw.mainboard;
  mainCards.removeDuplicates();
  // group lands
  if (
    settings.lands &&
    [OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
      overlayMode
    )
  ) {
    let landsNumber = 0;
    let landsChance = 0;
    let landsColors = new Colors();
    mainCards.get().forEach(card => {
      let cardObj = db.card(card.id);
      if (cardObj && cardObj.type.includes("Land", 0)) {
        landsNumber += card.quantity;
        landsChance += card.chance !== undefined ? card.chance : 0;
        delete card.chance;
        card.quantity = 0;
        if (cardObj.frame) {
          landsColors.addFromArray(cardObj.frame);
        }
      }
    });
    let lands = mainCards.add(landsCard, landsNumber, true);
    if (landsChance > 0) {
      lands.chance = landsChance;
    }

    // Set lands frame colors
    landsCard.frame = landsColors.get();
  }
  mainCards.get().sort(sortFunc);
  mainCards.get().forEach(card => {
    let tile;
    if (overlayMode === OVERLAY_MIXED) {
      let odds = (card.chance !== undefined ? card.chance : "0") + "%";
      let q = card.quantity;

      if (!settings.lands || (settings.lands && odds !== "0%")) {
        tile = deckDrawer.cardTile(pd.settings.card_tile_style, card.id, "a", {
          quantity: q,
          odds: odds
        });
      }
    } else if (overlayMode === OVERLAY_ODDS) {
      let quantity = (card.chance !== undefined ? card.chance : "0") + "%";
      if (!settings.lands || (settings.lands && quantity !== "0%")) {
        tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          "a",
          quantity
        );
      }
    } else {
      tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        card.id,
        "a",
        card.quantity
      );
    }
    if (tile) deckListDiv.appendChild(tile);

    // This is hackish.. the way we insert our custom elements in the
    // array of cards is wrong in the first place :()
    if (tile && card.id.id && card.id.id == 100) {
      attachLandOdds(tile, currentMatch.playerCardsOdds);
    }
  });
  if (settings.sideboard && deckToDraw.sideboard.count() > 0) {
    deckListDiv.appendChild(createDiv(["card_tile_separator"], "Sideboard"));

    const sideCards = deckToDraw.sideboard;
    sideCards.removeDuplicates();
    sideCards.get().sort(sortFunc);

    sideCards.get().forEach(function(card) {
      if (overlayMode === OVERLAY_ODDS || overlayMode === OVERLAY_MIXED) {
        const tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          "a",
          "0%"
        );
        deckListDiv.appendChild(tile);
      } else {
        const tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          "a",
          card.quantity
        );
        if (tile) deckListDiv.appendChild(tile);
      }
    });
  }

  if (overlayMode === OVERLAY_ODDS || overlayMode === OVERLAY_MIXED) {
    drawDeckOdds();
    return;
  }

  const deck = deckToDraw.getSave();
  if (settings.type_counts) {
    deckListDiv.appendChild(deckTypesStats(deck));
  }
  if (settings.mana_curve) {
    deckListDiv.appendChild(deckManaCurve(deck));
  }
}

function attachLandOdds(tile, odds) {
  let landsDiv = createDiv(["lands_div"]);

  let createManaChanceDiv = function(odds, color) {
    let cont = createDiv(["mana_cont"], odds + "%");
    let div = createDiv(["mana_s16", "flex_end", "mana_" + color]);
    cont.appendChild(div);
    landsDiv.appendChild(cont);
  };

  if (odds.landW) createManaChanceDiv(odds.landW, "w");
  if (odds.landU) createManaChanceDiv(odds.landU, "u");
  if (odds.landB) createManaChanceDiv(odds.landB, "b");
  if (odds.landR) createManaChanceDiv(odds.landR, "r");
  if (odds.landG) createManaChanceDiv(odds.landG, "g");

  tile.addEventListener("mouseenter", () => {
    if ($$(".lands_div").length == 0) {
      $$(".overlay_hover_container")[0].appendChild(landsDiv);
    }
  });

  tile.addEventListener("mouseleave", () => {
    $$(".lands_div").forEach(div => {
      if (div) {
        $$(".overlay_hover_container")[0].removeChild(div);
      }
    });
  });
}

function drawDeckOdds() {
  let deckListDiv = $$(".overlay_decklist")[0];

  const navCont = createDiv(["overlay_samplesize_container"]);
  navCont.appendChild(createDiv(["odds_prev", "click-on"]));
  navCont.appendChild(
    createDiv(["odds_number"], "Sample size: " + oddsSampleSize)
  );
  navCont.appendChild(createDiv(["odds_next", "click-on"]));
  deckListDiv.appendChild(navCont);

  deckListDiv.appendChild(createDiv(["chance_title"])); // Add some space

  let cardOdds = currentMatch.playerCardsOdds;

  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Creature: " +
        (cardOdds.chanceCre != undefined ? cardOdds.chanceCre : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Instant: " +
        (cardOdds.chanceIns != undefined ? cardOdds.chanceIns : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Sorcery: " +
        (cardOdds.chanceSor != undefined ? cardOdds.chanceSor : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Artifact: " +
        (cardOdds.chanceArt != undefined ? cardOdds.chanceArt : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Enchantment: " +
        (cardOdds.chanceEnc != undefined ? cardOdds.chanceEnc : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Planeswalker: " +
        (cardOdds.chancePla != undefined ? cardOdds.chancePla : "0") +
        "%"
    )
  );
  deckListDiv.appendChild(
    createDiv(
      ["chance_title"],
      "Land: " +
        (cardOdds.chanceLan != undefined ? cardOdds.chanceLan : "0") +
        "%"
    )
  );

  //
  $$(".odds_prev")[0].addEventListener("click", function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize -= 1;
    if (oddsSampleSize < 1) {
      oddsSampleSize = cardsLeft - 1;
    }
    ipcSend("set_odds_samplesize", oddsSampleSize);
  });
  //
  $$(".odds_next")[0].addEventListener("click", function() {
    let cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    oddsSampleSize += 1;
    if (oddsSampleSize > cardsLeft - 1) {
      oddsSampleSize = 1;
    }
    ipcSend("set_odds_samplesize", oddsSampleSize);
  });
}

var currentDraft;
//
ipc.on("set_draft_cards", (event, draft) => {
  clockMode = 1;
  recreateClock();
  matchBeginTime = Date.now();
  currentDraft = draft;
  updateDraftView(currentDraft.packNumber, currentDraft.pickNumber);
});

//
ipc.on("set_turn", (event, arg) => {
  let { playerSeat: _we, turnPriority: _priority } = arg;
  playerSeat = _we;
  if (
    turnPriority != _priority &&
    _priority == playerSeat &&
    pd.settings.sound_priority
  ) {
    //    playBlip();
    let { Howl, Howler } = require("howler");
    let sound = new Howl({ src: ["../sounds/blip.mp3"] });
    Howler.volume(pd.settings.sound_priority_volume);
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
    if (turnPriority === playerSeat) {
      $$(".clock_turn")[0].innerHTML = "You have priority.";
    } else {
      $$(".clock_turn")[0].innerHTML = "Opponent has priority.";
    }
  }
});

let packN;
let pickN;

function updateDraftView(_packN = -1, _pickN = -1) {
  if (overlayIndex === -1) return;
  if (!currentDraft) return;
  const settings = pd.settings.overlays[overlayIndex];
  if (_packN === -1 || _pickN === -1) {
    packN = currentDraft.packNumber;
    pickN = currentDraft.pickNumber;
  } else {
    packN = _packN;
    pickN = _pickN;
  }
  const key = "pack_" + packN + "pick_" + pickN;
  // console.log("Key", key, currentDraft);
  $$(".overlay_decklist")[0].innerHTML = "";
  $$(".overlay_deckcolors")[0].innerHTML = "";

  if (overlayMode === OVERLAY_DRAFT) {
    const titleDiv = $$(".overlay_deckname")[0];
    titleDiv.style.display = "";
    let title = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
    if (
      packN === currentDraft.packNumber &&
      pickN === currentDraft.pickNumber
    ) {
      title += " - Current";
    }
    titleDiv.innerHTML = title;

    const controlCont = createDiv(["overlay_draft_container", "click-on"]);
    if (settings.top) controlCont.style.top = "32px";

    const draftPrev = createDiv(["draft_prev"]);
    draftPrev.addEventListener("click", function() {
      pickN -= 1;
      let packSize = (currentDraft && PACK_SIZES[currentDraft.set]) || 14;

      if (pickN < 0) {
        pickN = packSize;
        packN -= 1;
      }
      if (packN < 0) {
        pickN = currentDraft.pickNumber;
        packN = currentDraft.packNumber;
      }

      updateDraftView(packN, pickN);
    });
    controlCont.appendChild(draftPrev);

    controlCont.appendChild(createDiv(["draft_title"]));

    const draftNext = createDiv(["draft_next"]);
    draftNext.addEventListener("click", function() {
      pickN += 1;
      let packSize = (currentDraft && PACK_SIZES[currentDraft.set]) || 14;

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
        updateDraftView();
      } else {
        updateDraftView(packN, pickN);
      }
    });
    controlCont.appendChild(draftNext);

    titleDiv.appendChild(controlCont);

    let draftPack = currentDraft[key];
    let pick = "";
    if (!draftPack) {
      draftPack = currentDraft.currentPack || [];
    } else {
      pick = draftPack.pick;
      draftPack = draftPack.pack;
    }

    const colors = get_ids_colors(draftPack);
    colors.forEach(function(color) {
      $$(".overlay_deckcolors")[0].appendChild(
        createDiv(["mana_s20", "mana_" + MANA[color]])
      );
    });

    draftPack.sort(compare_draft_picks);

    const deckListDiv = $$(".overlay_decklist")[0];
    deckListDiv.style.display = "";

    draftPack.forEach(grpId => {
      const card = db.card(grpId) || { id: grpId, rank: 0 };
      const rank = card.rank;

      const cont = createDiv(["overlay_card_quantity"]);
      attachOwnerhipStars(card, cont);
      deckListDiv.appendChild(cont);

      const tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        grpId,
        "a",
        DRAFT_RANKS[rank]
      );
      deckListDiv.appendChild(tile);
      if (grpId == pick) {
        tile.style.backgroundColor = "rgba(250, 229, 210, 0.66)";
      }
    });
  } else if (overlayMode === OVERLAY_DRAFT_BREW) {
    const deckListDiv = $$(".overlay_decklist")[0];
    const deckToDraw = new Deck(
      { name: "All Picks" },
      currentDraft.pickedCards
    );

    $$(".overlay_deckname")[0].innerHTML = deckToDraw.name;
    deckToDraw.colors
      .get()
      .forEach(color =>
        $$(".overlay_deckcolors")[0].appendChild(
          createDiv(["mana_s20", "mana_" + MANA[color]])
        )
      );
    const mainCards = deckToDraw.mainboard;
    mainCards.removeDuplicates();
    mainCards.get().sort(compare_cards);
    mainCards.get().forEach(card => {
      const tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        card.id,
        "a",
        card.quantity
      );
      if (tile) deckListDiv.appendChild(tile);
    });

    const deck = deckToDraw.getSave();
    if (settings.type_counts) {
      deckListDiv.appendChild(deckTypesStats(deck));
    }
    if (settings.mana_curve) {
      deckListDiv.appendChild(deckManaCurve(deck));
    }
  }
}

function compare_logs(a, b) {
  if (a.time < b.time) return -1;
  if (a.time > b.time) return 1;
  return 0;
}

function compare_draft_picks(a, b) {
  var arank = db.card(a).rank;
  var brank = db.card(b).rank;

  if (arank > brank) return -1;
  if (arank < brank) return 1;

  return 0;
}

function change_background(arg = "default") {
  if (!arg) return;
  const mainWrapper = $$(".overlay_bg_image")[0];
  if (arg === "default") {
    if (pd.settings.back_url && pd.settings.back_url !== "default") {
      mainWrapper.style.backgroundImage = "url(" + pd.settings.back_url + ")";
    } else {
      mainWrapper.style.backgroundImage =
        "url(../images/Ghitu-Lavarunner-Dominaria-MtG-Art.jpg)";
    }
  } else {
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", arg);
    xhr.onload = function() {
      if (xhr.status === 200) {
        mainWrapper.style.backgroundImage = "url(" + arg + ")";
      } else {
        mainWrapper.style.backgroundImage = "";
      }
    };
    xhr.send();
  }
}

function close(bool) {
  if (overlayIndex == -1) return;
  // -1 to toggle, else set
  let _new = bool == -1 ? !pd.settings.overlays[overlayIndex].show : bool;

  const overlays = [...pd.settings.overlays];
  const newOverlay = {
    ...overlays[overlayIndex], // old overlay
    show: _new // new setting
  };
  overlays[overlayIndex] = newOverlay;
  ipcSend("save_user_settings", { overlays });
}

function ready(fn) {
  if (
    document.attachEvent
      ? document.readyState === "complete"
      : document.readyState !== "loading"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

ready(function() {
  recreateClock();
  $$(".clock_prev")[0].addEventListener("click", function() {
    clockMode -= 1;
    if (clockMode < 0) {
      clockMode = 2;
    }
    recreateClock();
  });
  $$(".clock_next")[0].addEventListener("click", function() {
    clockMode += 1;
    if (clockMode > 2) {
      clockMode = 0;
    }
    recreateClock();
  });

  $$(".close")[0].addEventListener("click", function() {
    close(false);
  });

  $$(".minimize")[0].addEventListener("click", function() {
    ipcSend("overlay_minimize", overlayIndex);
  });

  $$(".settings")[0].addEventListener("click", function() {
    ipcSend("renderer_show");
    ipcSend("force_open_overlay_settings", overlayIndex, IPC_MAIN);
  });

  $$(".overlay_container")[0].addEventListener("mouseenter", () => {
    $$(".overlay_container")[0].style.opacity = 1;
  });
  $$(".overlay_container")[0].addEventListener("mouseleave", () => {
    if (overlayIndex == -1) return;
    let settings = pd.settings.overlays[overlayIndex];
    if (settings.alpha !== 1) {
      $$(".overlay_container")[0].style.opacity = settings.alpha;
    }
  });
});
