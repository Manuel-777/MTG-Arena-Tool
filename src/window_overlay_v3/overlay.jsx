import { ipcRenderer as ipc, webFrame, remote } from "electron";
import * as React from "react";
import * as ReactDOM from "react-dom";
import interact from "interactjs";
import format from "date-fns/format";

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
  const Sentry = require("@sentry/electron");
  Sentry.init({
    dsn: "https://4ec87bda1b064120a878eada5fc0b10f@sentry.io/1778171"
  });
}

import TransparencyMouseFix from "electron-transparency-mouse-fix";
let fix = null;

import striptags from "striptags";
import db from "../shared/database";
import pd from "../shared/player-data";
import Deck from "../shared/deck.js";
import Colors from "../shared/colors";
import * as deckDrawer from "../shared/deck-drawer";
import {
  compare_cards,
  deckManaCurve,
  deckTypesStats,
  get_card_type_sort
} from "../shared/util";
import {
  addCardHover,
  attachOwnerhipStars,
  setRenderer
} from "../shared/card-hover";
import { queryElements, createDiv } from "../shared/dom-fns";
import {
  ARENA_MODE_IDLE,
  ARENA_MODE_MATCH,
  ARENA_MODE_DRAFT,
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
} from "../shared/constants.js";
import Clock from "../overlay/Clock";
import SampleSizePanel from "../overlay/SampleSizePanel";

const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";

const byId = id => document.getElementById(id);

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

setRenderer(1);

let playerSeat = 0;
let oppName = "";
let turnPriority = 0;

let actionLog = [];

let currentMatch = null;
let arenaState = ARENA_MODE_IDLE;
let editMode = false;

function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_OVERLAY, arg, to);
}

ipc.on("set_arena_state", function(event, arg) {
  arenaState = arg;

  // Change how cards hover are drawn if we are in a draft
  setRenderer(1);
  if (arenaState == ARENA_MODE_DRAFT) {
    setRenderer(2);
  }
  settingsUpdated();
});

ipc.on("edit", () => {
  toggleEditMode();
});

function toggleEditMode() {
  editMode = !editMode;

  let divsList = [];
  let mainHover = queryElements(".main_hover")[0];
  mainHover.style.opacity = "1";
  divsList.push(byId("overlay_hover"));
  pd.settings.overlays.forEach((_overlay, index) => {
    if (!getVisible(_overlay)) return;
    divsList.push(byId("overlay_" + (index + 1)));
  });

  if (editMode) {
    document.body.style.backgroundColor = "rgba(0, 0, 0, 0.3)";

    divsList.forEach(overlayDiv => {
      if (!overlayDiv.classList.contains("click-on"))
        overlayDiv.classList.add("click-on");
      overlayDiv.classList.remove("click-through");
      if (!overlayDiv.classList.contains("editable"))
        overlayDiv.classList.add("editable");

      const restrictToParent = interact.modifiers.restrictRect({
        restriction: "parent"
      });
      const restrictToEdges = interact.modifiers.restrictEdges({
        outer: "parent",
        endOnly: true
      });
      const restrictMinSize = interact.modifiers.restrictSize({
        min: { width: 100, height: 100 }
      });

      interact(overlayDiv)
        .draggable({ modifiers: [restrictToParent] })
        .on("dragmove", function(event) {
          const target = event.target;
          const x = parseFloat(target.style.left) + event.dx;
          const y = parseFloat(target.style.top) + event.dy;
          target.style.left = x + "px";
          target.style.top = y + "px";
        })
        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          modifiers: [restrictToEdges, restrictMinSize],
          inertia: true
        })
        .on("resizemove", function(event) {
          const target = event.target;
          const x = parseFloat(target.style.left) + event.deltaRect.left;
          const y = parseFloat(target.style.top) + event.deltaRect.top;
          //fix for interact.js adding 4px to height/width on resize
          target.style.width = event.rect.width - 4 + "px";
          target.style.height = event.rect.height - 4 + "px";
          target.style.left = x + "px";
          target.style.top = y + "px";
        });
    });
  } else {
    mainHover.style.opacity = "0";
    divsList.forEach(_div => {
      if (!_div.classList.contains("click-through"))
        _div.classList.add("click-through");
      _div.classList.remove("click-on");
      _div.classList.remove("editable");
      interact(_div).unset();
    });

    document.body.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    saveOverlaysPosition();
  }
}

function saveOverlaysPosition() {
  // Update each overlay with the new dimensions
  const overlays = [...pd.settings.overlays];
  const forceInt = num => Math.round(parseFloat(num));

  overlays.forEach((_overlay, index) => {
    const overlayDiv = byId("overlay_" + (index + 1));
    const bounds = {
      width: forceInt(overlayDiv.style.width),
      height: forceInt(overlayDiv.style.height),
      x: forceInt(overlayDiv.style.left),
      y: forceInt(overlayDiv.style.top)
    };
    const newOverlay = {
      ...overlays[index], // old overlay
      bounds // new setting
    };
    overlays[index] = newOverlay;
  });

  const hoverDiv = byId("overlay_hover");
  let overlayHover = {
    x: forceInt(hoverDiv.style.left),
    y: forceInt(hoverDiv.style.top)
  };
  ipcSend("save_user_settings", { overlays, overlayHover, skip_refresh: true });
}

ipc.on("close", (event, arg) => {
  close(arg.action, arg.index);
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

ipc.on("settings_updated", settingsUpdated);

function settingsUpdated() {
  // mid-match Arena updates can make edit-mode difficult
  // temporarily allow the overlays to go stale during editing
  // (should be okay since ending edit-mode causes a refresh)
  if (editMode) return;

  console.log(window.innerWidth, window.innerHeight);
  let hoverContainer = byId("overlay_hover");
  if (pd.settings.overlayHover) {
    hoverContainer.style.left = `${pd.settings.overlayHover.x}px`;
    hoverContainer.style.top = `${pd.settings.overlayHover.y}px`;
  } else {
    hoverContainer.style.left = `${window.innerWidth / 2 -
      pd.cardsSizeHoverCard / 2}px`;
    hoverContainer.style.top = `${window.innerHeight -
      pd.cardsSizeHoverCard / 0.71808510638 -
      50}px`;
  }

  webFrame.setZoomFactor(pd.settings.overlay_scale / 100);
  pd.settings.overlays.forEach((_overlay, index) => {
    const overlayDiv = byId("overlay_" + (index + 1));
    overlayDiv.style.height = _overlay.bounds.height + "px";
    overlayDiv.style.width = _overlay.bounds.width + "px";
    overlayDiv.style.left = _overlay.bounds.x + "px";
    overlayDiv.style.top = _overlay.bounds.y + "px";

    if (getVisible(_overlay)) {
      overlayDiv.style.opacity = "1";
      overlayDiv.style.visibility = "visible";
    } else {
      overlayDiv.style.opacity = "0";
      overlayDiv.style.visibility = "hidden";
    }

    change_background(index, pd.settings.back_url);

    let messageDom = `#overlay_${index + 1} .overlay_message`;
    let deckNameDom = `#overlay_${index + 1} .overlay_deckname`;
    let deckColorsDom = `#overlay_${index + 1} .overlay_deckcolors`;
    let deckListDom = `#overlay_${index + 1} .overlay_decklist`;
    let clockDom = `#overlay_${index + 1} .overlay_clock_container`;
    let bgImageDom = `#overlay_${index + 1} .overlay_bg_image`;
    let elementsDom = `#overlay_${index + 1} .elements_wrapper`;
    let topDom = `#overlay_${index + 1} .top_nav_wrapper`;
    let mainHoverDom = ".main_hover";

    queryElements(bgImageDom)[0].style.opacity = _overlay.alpha_back.toString();
    queryElements(elementsDom)[0].style.opacity = _overlay.alpha.toString();

    queryElements(topDom)[0].style = "";
    queryElements(topDom)[0].style.display = _overlay.top ? "" : "none";
    queryElements(deckNameDom)[0].style = "";
    queryElements(deckNameDom)[0].style.display = _overlay.title ? "" : "none";
    queryElements(deckColorsDom)[0].style = "";
    queryElements(deckColorsDom)[0].style.display = _overlay.title
      ? ""
      : "none";

    queryElements(deckListDom)[0].style.display = _overlay.deck ? "" : "none";
    queryElements(mainHoverDom)[0].style.width = pd.cardsSizeHoverCard + "px";
    queryElements(mainHoverDom)[0].style.height =
      pd.cardsSizeHoverCard / 0.71808510638 + "px";

    const showClock =
      _overlay.clock && !OVERLAY_DRAFT_MODES.includes(_overlay.mode);
    queryElements(clockDom)[0].style.display = showClock ? "" : "none";

    if (OVERLAY_DRAFT_MODES.includes(_overlay.mode)) {
      updateDraftView(index);
    } else {
      updateMatchView(index);
    }
  });
}

function getVisible(settings) {
  if (!settings) return false;

  const currentModeApplies =
    (OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_DRAFT) ||
    (!OVERLAY_DRAFT_MODES.includes(settings.mode) &&
      arenaState === ARENA_MODE_MATCH);

  return settings.show && (currentModeApplies || settings.show_always);
}

ipc.on("set_draft_cards", (event, draft) => {
  currentDraft = draft;
  pd.settings.overlays.forEach((_overlay, index) => {
    if (!OVERLAY_DRAFT_MODES.includes(_overlay.mode)) return;
    updateDraftView(index, currentDraft.packNumber, currentDraft.pickNumber);
  });
});

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

  pd.settings.overlays.forEach((_overlay, index) => {
    recreateClock(index);
  });
});

ipc.on("set_match", (event, arg) => {
  currentMatch = JSON.parse(arg);
  currentMatch.oppCards = new Deck(currentMatch.oppCards);

  const tempMain = currentMatch.playerCardsLeft.mainDeck;
  currentMatch.playerCardsLeft = new Deck(currentMatch.playerCardsLeft);
  currentMatch.playerCardsLeft.mainboard._list = tempMain;

  currentMatch.player.deck = new Deck(currentMatch.player.deck);
  currentMatch.player.originalDeck = new Deck(currentMatch.player.originalDeck);

  pd.settings.overlays.forEach((_overlay, index) => {
    if (OVERLAY_DRAFT_MODES.includes(_overlay.mode)) return;
    recreateClock(index);
    updateMatchView(index);
  });
});

function updateMatchView(index) {
  if (!currentMatch) return;
  let settings = pd.settings.overlays[index];

  let deckNameDom = `#overlay_${index + 1} .overlay_deckname`;
  let deckColorsDom = `#overlay_${index + 1} .overlay_deckcolors`;
  let deckListDom = `#overlay_${index + 1} .overlay_decklist`;
  let archDom = `#overlay_${index + 1} .overlay_archetype`;

  let cleanName =
    currentMatch && currentMatch.opponent && currentMatch.opponent.name;
  if (cleanName && cleanName !== "Sparky") {
    cleanName = cleanName.slice(0, -6);
  }
  oppName = cleanName || "Opponent";

  const container = queryElements(deckListDom)[0];
  const doscroll =
    Math.round(
      container.scrollHeight - container.offsetHeight - container.scrollTop
    ) < 32;

  if (queryElements(archDom)[0]) {
    queryElements(archDom)[0].remove();
  }

  queryElements(deckListDom)[0].innerHTML = "";
  queryElements(deckColorsDom)[0].innerHTML = "";
  queryElements(deckNameDom)[0].innerHTML = "";

  let deckListDiv;
  let overlayMode = settings.mode;

  deckListDiv = queryElements(deckListDom)[0];
  if (overlayMode === OVERLAY_LOG) {
    // Action Log Mode
    queryElements(deckNameDom)[0].innerHTML = "Action Log";

    let initalTime = actionLog[0] ? new Date(actionLog[0].time) : new Date();
    actionLog.forEach(log => {
      log.str = log.str.replace(
        "<log-card",
        '<log-card class="click-on"',
        "gi"
      );
      log.str = log.str.replace(
        "<log-ability",
        '<log-ability class="click-on"',
        "gi"
      );
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

    queryElements("log-card").forEach(obj => {
      const grpId = obj.getAttribute("id");
      addCardHover(obj, db.card(grpId));
    });

    queryElements("log-ability").forEach(obj => {
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
    const cardsLeft = currentMatch.playerCardsLeft.mainboard.count();
    const cardOdds = currentMatch.playerCardsOdds;
    const sampleSize = cardOdds.sampleSize || 1;
    deckListDiv.appendChild(
      createDiv(
        ["decklist_title"],
        `Next Draw: ${sampleSize}/${cardsLeft} cards`
      )
    );
    deckToDraw = currentMatch.playerCardsLeft;
  } else if (overlayMode === OVERLAY_SEEN) {
    // Opponent Cards Mode
    const deckName = queryElements(deckNameDom)[0];
    deckName.parentNode.insertBefore(
      createDiv(["overlay_archetype"]),
      deckName.nextSibling
    );
    deckName.innerHTML = "Played by " + oppName;
    queryElements(archDom)[0].innerHTML = currentMatch.oppArchetype;

    currentMatch.oppCards.colors
      .get()
      .forEach(color =>
        queryElements(deckColorsDom)[0].appendChild(
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
    queryElements(deckNameDom)[0].innerHTML = deckToDraw.name;
    deckToDraw.colors
      .get()
      .forEach(color =>
        queryElements(deckColorsDom)[0].appendChild(
          createDiv(["mana_s20", "mana_" + MANA[color]])
        )
      );
  }

  let sortFunc = compare_cards;
  if (overlayMode === OVERLAY_ODDS || overlayMode == OVERLAY_MIXED) {
    sortFunc = compare_quantity;
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

  if (
    (overlayMode === OVERLAY_ODDS || overlayMode === OVERLAY_MIXED) &&
    settings.draw_odds
  ) {
    drawDeckOdds(index);
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

  tile.addEventListener("mouseover", () => {
    if (queryElements(".lands_div").length == 0) {
      queryElements(".overlay_hover_container")[0].appendChild(landsDiv);
    }
  });

  tile.addEventListener("mouseleave", () => {
    queryElements(".lands_div").forEach(div => {
      if (div) {
        queryElements(".overlay_hover_container")[0].removeChild(div);
      }
    });
  });
}

function drawDeckOdds(index) {
  const deckListDiv = queryElements(
    `#overlay_${index + 1} .overlay_decklist`
  )[0];

  // not sure this wrapper is necessary, just imitating createSelect for now
  const container = createDiv([]);
  deckListDiv.appendChild(container);

  const props = {
    cardOdds: currentMatch.playerCardsOdds,
    cardsLeft: currentMatch.playerCardsLeft.mainboard.count(),
    setOddsCallback: sampleSize => ipcSend("set_odds_samplesize", sampleSize)
  };

  ReactDOM.render(<SampleSizePanel {...props} />, container);
}

var currentDraft;
let packN;
let pickN;

function updateDraftView(index, _packN = -1, _pickN = -1) {
  if (!currentDraft) return;
  const settings = pd.settings.overlays[index];
  if (_packN === -1 || _pickN === -1) {
    packN = currentDraft.packNumber;
    pickN = currentDraft.pickNumber;
  } else {
    packN = _packN;
    pickN = _pickN;
  }
  const key = "pack_" + packN + "pick_" + pickN;

  let deckNameDom = `#overlay_${index + 1} .overlay_deckname`;
  let deckColorsDom = `#overlay_${index + 1} .overlay_deckcolors`;
  let deckListDom = `#overlay_${index + 1} .overlay_decklist`;

  queryElements(deckListDom)[0].innerHTML = "";
  queryElements(deckColorsDom)[0].innerHTML = "";

  let overlayMode = settings.mode;
  if (overlayMode === OVERLAY_DRAFT) {
    const titleDiv = queryElements(deckNameDom)[0];
    titleDiv.style.display = "";
    let title = "Pack " + (packN + 1) + " - Pick " + (pickN + 1);
    if (
      packN === currentDraft.packNumber &&
      pickN === currentDraft.pickNumber
    ) {
      title += " - Current";
    }
    titleDiv.innerHTML = title;

    const controlCont = createDiv(["overlay_draft_container"]);
    if (settings.top) controlCont.style.top = "32px";

    const draftPrev = createDiv(["draft_prev", "click-on"]);
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

      updateDraftView(index, packN, pickN);
    });
    controlCont.appendChild(draftPrev);

    controlCont.appendChild(createDiv(["draft_title"]));

    const draftNext = createDiv(["draft_next", "click-on"]);
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
        updateDraftView(index);
      } else {
        updateDraftView(index, packN, pickN);
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
      queryElements(deckColorsDom)[0].appendChild(
        createDiv(["mana_s20", "mana_" + MANA[color]])
      );
    });

    draftPack.sort(compareDraftPicks);

    const deckListDiv = queryElements(deckListDom)[0];
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
    const deckListDiv = queryElements(deckListDom)[0];
    const deckToDraw = new Deck(
      { name: "All Picks" },
      currentDraft.pickedCards
    );

    queryElements(deckNameDom)[0].innerHTML = deckToDraw.name;
    deckToDraw.colors
      .get()
      .forEach(color =>
        queryElements(deckColorsDom)[0].appendChild(
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

function recreateClock(index) {
  const clockDiv = queryElements(
    `#overlay_${index + 1} .overlay_clock_container`
  )[0];
  if (!clockDiv) return;

  const props = {
    key: "overlay_clock_" + index,
    matchBeginTime: currentMatch
      ? new Date(currentMatch.beginTime)
      : new Date(),
    oppName: currentMatch ? currentMatch.opponent.name : "Opponent",
    playerSeat: playerSeat,
    priorityTimers: currentMatch
      ? currentMatch.priorityTimers
      : [Date.now(), 0, 0],
    turnPriority: turnPriority
  };
  ReactDOM.render(<Clock {...props} />, clockDiv);
}

function change_background(index, arg = "default") {
  if (!arg) return;

  const mainWrapper = queryElements(
    `#overlay_${index + 1} .overlay_bg_image`
  )[0];
  if (arg === "default") {
    if (pd.settings.back_url && pd.settings.back_url !== "default") {
      mainWrapper.style.backgroundImage = "url(" + pd.settings.back_url + ")";
    } else {
      mainWrapper.style.backgroundImage = "url(" + DEFAULT_BACKGROUND + ")";
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

function close(bool, index) {
  // -1 to toggle, else set
  let _new = bool == -1 ? !pd.settings.overlays[index].show : bool;

  const overlays = [...pd.settings.overlays];
  const newOverlay = {
    ...overlays[index], // old overlay
    show: _new // new setting
  };
  overlays[index] = newOverlay;
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
  document.body.style.backgroundColor = "rgba(0, 0, 0, 0)";

  queryElements(".overlay_container").forEach(node => {
    node.innerHTML = `
      <div class="outer_wrapper">
          <div class="overlay_wrapper overlay_bg_image" >
          </div>
      </div>
      <div class="outer_wrapper elements_wrapper">
        <div class="overlay_deckname"></div>
        <div class="overlay_deckcolors"></div>
        <div class="overlay_decklist click-on"></div>
        <div class="overlay_clock_container"></div>
        <div class="overlay_message click-on"></div>
      </div>
      <div class="outer_wrapper top_nav_wrapper">
        <div class="flex_item overlay_icon click-on"></div>
        <div class="button settings click-on" style="margin: 0;"></div>
        <div class="button close click-on" style="margin-right: 4px;"></div>
      </div>`;
  });
  pd.settings.overlays.forEach((_overlay, index) => recreateClock(index));
  // Force a dom refresh
  queryElements(".overlay_container")[0].style.display = "none";
  queryElements(".overlay_container")[0].style.display = "";

  setTimeout(() => {
    pd.settings.overlays.forEach((_overlay, index) => {
      const iconDom = `#overlay_${index + 1} .overlay_icon`;
      const settingsDom = `#overlay_${index + 1} .settings`;
      const closeDom = `#overlay_${index + 1} .close`;
      const deckListDom = `#overlay_${index + 1} .overlay_decklist`;

      const deckListDiv = queryElements(deckListDom)[0];
      deckListDiv.addEventListener("mouseover", function() {
        let index = this.offsetParent.offsetParent.attributes["0"].value.slice(
          -1
        );
        let mainHoverDom = ".main_hover";
        let settings = pd.settings.overlays[index - 1];

        if (settings.cards_overlay) {
          queryElements(mainHoverDom)[0].style.display = "";
        } else {
          queryElements(mainHoverDom)[0].style.display = "none";
        }
      });

      const iconDiv = queryElements(iconDom)[0];
      iconDiv.style.backgroundColor = `var(--color-${COLORS_ALL[index]})`;
      iconDiv.addEventListener("click", toggleEditMode);

      queryElements(settingsDom)[0].addEventListener("click", function() {
        ipcSend("renderer_show");
        ipcSend("force_open_overlay_settings", index, IPC_MAIN);
      });
      queryElements(closeDom)[0].addEventListener("click", function() {
        close(-1, index);
      });
    });
  }, 500);
  setTimeout(() => {
    fix = new TransparencyMouseFix({
      log: false,
      fixPointerEvents: "auto"
    });
  }, 1000);
});

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

function compare_quantity(a, b) {
  return b.quantity - a.quantity;
}

function compare_logs(a, b) {
  if (a.time < b.time) return -1;
  if (a.time > b.time) return 1;
  return 0;
}

function compareDraftPicks(a, b) {
  const aCard = db.card(a);
  const bCard = db.card(b);
  const aColors = new Colors();
  aColors.addFromCost(aCard.cost);
  const bColors = new Colors();
  bColors.addFromCost(bCard.cost);
  const aType = get_card_type_sort(aCard.type);
  const bType = get_card_type_sort(bCard.type);
  return (
    bCard.rank - aCard.rank ||
    aColors.length - bColors.length ||
    aCard.cmc - bCard.cmc ||
    aType - bType ||
    aCard.name.localeCompare(bCard.name)
  );
}
