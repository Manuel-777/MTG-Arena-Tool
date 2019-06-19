const fs = require("fs");
const path = require("path");
const { app, ipcRenderer: ipc, remote } = require("electron");
const _ = require("lodash");
const striptags = require("striptags");
const Picker = require("vanilla-picker");

const {
  CARD_TYPE_CODES,
  CARD_TYPES,
  COLORS_ALL,
  DRAFT_RANKS,
  MANA_COLORS,
  PACK_SIZES,
  IPC_MAIN,
  IPC_BACKGROUND
} = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const ConicGradient = require("../shared/conic-gradient");
const {
  createDiv,
  createImg,
  createInput,
  createLabel,
  createSpan,
  queryElements: $$
} = require("../shared/dom-fns");
const deckDrawer = require("../shared/deck-drawer");
const cardTypes = require("../shared/card-types");
const { addCardHover } = require("../shared/card-hover");
const {
  add,
  get_card_image,
  get_deck_types_ammount,
  makeId
} = require("../shared/util");

const byId = id => document.getElementById(id);
let popTimeout = null;
// quick and dirty shared state object for main renderer process
// (for state shared across processes, use database or player-data)
const localState = {
  authToken: "",
  discordTag: null,
  lastDataIndex: 0,
  lastScrollHandler: null,
  lastScrollTop: 0,
  exploreData: null
};
const actionLogDir = path.join(
  (app || remote.app).getPath("userData"),
  "actionlogs"
);
exports.actionLogDir = actionLogDir;

//
exports.ipcSend = ipcSend;
function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_MAIN, arg, to);
}

//
exports.pop = pop;
function pop(str, timeout) {
  const popup = $$(".popup")[0];
  popup.style.opacity = 1;
  popup.innerHTML = str;

  if (popTimeout) clearTimeout(popTimeout);

  if (timeout < 1) {
    popTimeout = null;
  } else {
    popTimeout = setTimeout(function() {
      popup.style.opacity = 0;
      popup.innerHTML = "";
      popTimeout = null;
    }, timeout);
  }
}

//
exports.showLoadingBars = showLoadingBars;
function showLoadingBars() {
  $$(".main_loading")[0].style.display = "block";
  document.body.style.cursor = "progress";
}

//
exports.hideLoadingBars = hideLoadingBars;
function hideLoadingBars() {
  $$(".main_loading")[0].style.display = "none";
  document.body.style.cursor = "auto";
}

//
exports.setLocalState = setLocalState;
function setLocalState(state = {}) {
  Object.assign(localState, state);
}

//
exports.getLocalState = getLocalState;
function getLocalState() {
  return localState;
}

// convenience handler for player data singleton
exports.toggleArchived = toggleArchived;
function toggleArchived(id) {
  ipcSend("toggle_archived", id);
}

//
exports.getTagColor = getTagColor;
function getTagColor(tag) {
  return pd.tags_colors[tag] || "#FAE5D2";
}

//
exports.makeResizable = makeResizable;
function makeResizable(div, resizeCallback, finalCallback) {
  var m_pos;
  let finalWidth;

  let resize = function(e) {
    var parent = div.parentNode;
    var dx = m_pos - e.x;
    m_pos = e.x;
    let newWidth = Math.max(10, parseInt(parent.style.width) + dx);
    parent.style.width = `${newWidth}px`;
    parent.style.flex = `0 0 ${newWidth}px`;
    if (resizeCallback instanceof Function) resizeCallback(newWidth);
    finalWidth = newWidth;
  };

  let saveWidth = function(width) {
    ipcSend("save_user_settings", { right_panel_width: width });
  };

  div.addEventListener(
    "mousedown",
    event => {
      m_pos = event.x;
      document.addEventListener("mousemove", resize, false);
    },
    false
  );

  document.addEventListener(
    "mouseup",
    () => {
      document.removeEventListener("mousemove", resize, false);
      if (finalWidth) {
        saveWidth(finalWidth);
        if (finalCallback instanceof Function) finalCallback(finalWidth);
        finalWidth = null;
      }
    },
    false
  );
}

//
exports.resetMainContainer = resetMainContainer;
function resetMainContainer() {
  const container = byId("ux_0");
  container.innerHTML = "";
  container.classList.remove("flex_item");
  const { lastScrollHandler } = getLocalState();
  if (lastScrollHandler) {
    container.removeEventListener("scroll", lastScrollHandler);
    setLocalState({ lastScrollHandler: null });
  }
  return container;
}

//
exports.drawDeck = drawDeck;
function drawDeck(div, deck, showWildcards = false) {
  div.innerHTML = "";
  const unique = makeId(4);

  // draw maindeck grouped by cardType
  const cardsByGroup = _(deck.mainDeck)
    .map(card => ({ data: db.card(card.id), ...card }))
    .groupBy(card => {
      const cardType = cardTypes.cardType(card.data);
      switch (cardType) {
        case "Creature":
          return "Creatures";
        case "Planeswalker":
          return "Planeswalkers";
        case "Instant":
        case "Sorcery":
          return "Spells";
        case "Enchantment":
          return "Enchantments";
        case "Artifact":
          return "Artifacts";
        case "Land":
          return "Lands";
        default:
          throw new Error(`Unexpected card type: ${cardType}`);
      }
    })
    .value();

  _([
    "Creatures",
    "Planeswalkers",
    "Spells",
    "Enchantments",
    "Artifacts",
    "Lands"
  ])
    .filter(group => !_.isEmpty(cardsByGroup[group]))
    .forEach(group => {
      // draw a separator for the group
      const cards = cardsByGroup[group];
      const count = _.sumBy(cards, "quantity");
      const separator = deckDrawer.cardSeparator(`${group} (${count})`);
      div.appendChild(separator);

      // draw the cards
      _(cards)
        .filter(card => card.quantity > 0)
        .orderBy(["data.cmc", "data.name"])
        .forEach(card => {
          const tile = deckDrawer.cardTile(
            pd.settings.card_tile_style,
            card.id,
            unique + "a",
            card.quantity,
            showWildcards,
            deck,
            false
          );
          div.appendChild(tile);
        });
    });

  const sideboardSize = _.sumBy(deck.sideboard, "quantity");
  if (sideboardSize) {
    // draw a separator for the sideboard
    let separator = deckDrawer.cardSeparator(`Sideboard (${sideboardSize})`);
    div.appendChild(separator);

    // draw the cards
    _(deck.sideboard)
      .filter(card => card.quantity > 0)
      .map(card => ({ data: db.card(card.id), ...card }))
      .orderBy(["data.cmc", "data.name"])
      .forEach(card => {
        const tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          card.id,
          unique + "b",
          card.quantity,
          showWildcards,
          deck,
          true
        );
        div.appendChild(tile);
      });
  }
}

//
exports.drawCardList = drawCardList;
function drawCardList(div, cards) {
  let unique = makeId(4);
  let counts = {};
  cards.forEach(cardId => (counts[cardId] = (counts[cardId] || 0) + 1));
  Object.keys(counts).forEach(cardId => {
    let tile = deckDrawer.cardTile(
      pd.settings.card_tile_style,
      cardId,
      unique,
      counts[cardId]
    );
    div.appendChild(tile);
  });
}

//
exports.drawDeckVisual = drawDeckVisual;
function drawDeckVisual(container, deck, openCallback) {
  container.innerHTML = "";
  container.style.flexDirection = "column";

  container.appendChild(deckTypesStats(deck));

  // attempt at sorting visually..
  const newMainDeck = [];

  for (let cmc = 0; cmc < 21; cmc++) {
    for (let qq = 4; qq > -1; qq--) {
      deck.mainDeck.forEach(function(c) {
        const grpId = c.id;
        const card = db.card(grpId);
        let quantity;
        if (!card.type.includes("Land") && grpId !== 67306) {
          if (card.cmc === cmc) {
            quantity = c.quantity;

            if (quantity === qq) {
              newMainDeck.push(c);
            }
          }
        } else if (cmc === 20) {
          quantity = c.quantity;
          if (qq === 0 && quantity > 4) {
            newMainDeck.push(c);
          }
          if (quantity === qq) {
            newMainDeck.push(c);
          }
        }
      });
    }
  }

  const listDiv = createDiv(["decklist"]);
  listDiv.style.display = "flex";
  listDiv.style.width = "auto";
  listDiv.style.margin = "0 auto";

  const sz = pd.cardsSize;
  const mainDiv = createDiv(["visual_mainboard"]);
  mainDiv.style.display = "flex";
  mainDiv.style.flexWrap = "wrap";
  mainDiv.style.alignContent = "start";
  mainDiv.style.maxWidth = (sz + 6) * 5 + "px";

  let tileNow;
  let _n = 0;
  newMainDeck.forEach(c => {
    const card = db.card(c.id);
    if (c.quantity > 0) {
      let dfc = "";
      if (card.dfc === "DFC_Back") dfc = "a";
      if (card.dfc === "DFC_Front") dfc = "b";
      if (card.dfc === "SplitHalf") dfc = "a";
      if (dfc !== "b") {
        for (let i = 0; i < c.quantity; i++) {
          if (_n % 4 === 0) {
            tileNow = createDiv(["deck_visual_tile"]);
            mainDiv.appendChild(tileNow);
          }

          const d = createDiv(["deck_visual_card"]);
          d.style.width = sz + "px";
          const img = createImg(["deck_visual_card_img"], "", {
            src: get_card_image(card)
          });
          img.style.width = sz + "px";
          addCardHover(img, card);
          d.appendChild(img);

          tileNow.appendChild(d);
          _n++;
        }
      }
    }
  });
  listDiv.appendChild(mainDiv);

  const sideDiv = createDiv(["visual_sideboard"]);
  sideDiv.style.display = "flex";
  sideDiv.style.flexWrap = "wrap";
  sideDiv.style.marginLeft = "32px";
  sideDiv.style.alignContent = "start";
  sideDiv.style.maxWidth = (sz + 6) * 1.5 + "px";

  if (deck.sideboard && deck.sideboard.length) {
    tileNow = createDiv(["deck_visual_tile_side"]);
    tileNow.style.width = (sz + 6) * 5 + "px";

    let _n = 0;
    deck.sideboard.forEach(c => {
      const card = db.card(c.id);
      if (c.quantity > 0) {
        let dfc = "";
        if (card.dfc === "DFC_Back") dfc = "a";
        if (card.dfc === "DFC_Front") dfc = "b";
        if (card.dfc === "SplitHalf") dfc = "a";
        if (dfc !== "b") {
          for (let i = 0; i < c.quantity; i++) {
            const d = createDiv(["deck_visual_card_side"]);
            d.style.width = sz + "px";
            if (_n % 2 === 0) {
              d.style.marginLeft = "60px";
            }

            const img = createImg(["deck_visual_card_img"], "", {
              src: get_card_image(card)
            });
            img.style.width = sz + "px";
            addCardHover(img, card);
            d.appendChild(img);

            tileNow.appendChild(d);
            _n++;
          }
        }
      }
    });
    sideDiv.appendChild(tileNow);
  }
  listDiv.appendChild(sideDiv);

  container.appendChild(listDiv);

  if (openCallback) {
    const normalButton = createDiv(["button_simple"], "Normal view");
    normalButton.addEventListener("click", () => openCallback());
    container.appendChild(normalButton);
  }
}

//
function get_deck_curve(deck) {
  var curve = [];

  deck.mainDeck.forEach(function(card) {
    var grpid = card.id;
    var cmc = db.card(grpid).cmc;
    if (curve[cmc] == undefined) curve[cmc] = [0, 0, 0, 0, 0, 0];

    let card_cost = db.card(grpid).cost;

    if (db.card(grpid).type.indexOf("Land") == -1) {
      card_cost.forEach(function(c) {
        if (c.indexOf("w") !== -1) curve[cmc][1] += card.quantity;
        if (c.indexOf("u") !== -1) curve[cmc][2] += card.quantity;
        if (c.indexOf("b") !== -1) curve[cmc][3] += card.quantity;
        if (c.indexOf("r") !== -1) curve[cmc][4] += card.quantity;
        if (c.indexOf("g") !== -1) curve[cmc][5] += card.quantity;
      });

      curve[cmc][0] += card.quantity;
    }
  });
  /*
  // Do not account sideboard?
  deck.sideboard.forEach(function(card) {
    var grpid = card.id;
    var cmc = db.card(grpid).cmc;
    if (curve[cmc] == undefined)  curve[cmc] = 0;
    curve[cmc] += card.quantity

    if (db.card(grpid).rarity !== 'land') {
      curve[cmc] += card.quantity
    }
  });
  */
  //console.log(curve);
  return curve;
}

//
exports.deckManaCurve = deckManaCurve;
function deckManaCurve(deck) {
  const manaCounts = get_deck_curve(deck);
  const curveMax = Math.max(
    ...manaCounts
      .filter(v => {
        if (v == undefined) return false;
        return true;
      })
      .map(v => v[0] || 0)
  );
  // console.log("deckManaCurve", manaCounts, curveMax);

  const container = createDiv();
  const curve = createDiv(["mana_curve"]);
  const numbers = createDiv(["mana_curve_numbers"]);

  manaCounts.forEach((cost, i) => {
    const total = cost[0];
    const manaTotal = cost.reduce(add, 0) - total;

    const curveCol = createDiv(["mana_curve_column"]);
    curveCol.style.height = (total * 100) / curveMax + "%";

    const curveNum = createDiv(["mana_curve_number"], total > 0 ? total : "");
    curveCol.appendChild(curveNum);

    MANA_COLORS.forEach((mc, ind) => {
      if (ind < 5 && cost[ind + 1] > 0) {
        const col = createDiv(["mana_curve_column_color"]);
        col.style.height = Math.round((cost[ind + 1] / manaTotal) * 100) + "%";
        col.style.backgroundColor = mc;
        curveCol.appendChild(col);
      }
    });

    curve.appendChild(curveCol);

    const colNum = createDiv(["mana_curve_column_number"]);
    const numDiv = createDiv(["mana_s16", "mana_" + i]);
    numDiv.style.margin = "0 auto !important";
    colNum.appendChild(numDiv);
    numbers.appendChild(colNum);
  });

  container.appendChild(curve);
  container.appendChild(numbers);

  return container;
}

//
exports.deckTypesStats = deckTypesStats;
function deckTypesStats(deck) {
  const cardTypes = get_deck_types_ammount(deck);
  const typesContainer = createDiv(["types_container"]);
  CARD_TYPE_CODES.forEach((cardTypeKey, index) => {
    const type = createDiv(["type_icon_cont"]);
    type.appendChild(
      createDiv(["type_icon", "type_" + cardTypeKey], "", {
        title: CARD_TYPES[index]
      })
    );
    type.appendChild(createSpan([], cardTypes[cardTypeKey]));
    typesContainer.appendChild(type);
  });
  return typesContainer;
}

//
exports.colorPieChart = colorPieChart;
function colorPieChart(colorCounts, title) {
  /*
    used for land / card pie charts.
    colorCounts should be object with values for each of the color codes wubrgc and total.
    */
  // console.log("making colorPieChart", colorCounts, title);

  const stops = [];
  let start = 0;
  COLORS_ALL.forEach((colorCode, i) => {
    const currentColor = MANA_COLORS[i];
    const stop =
      start + ((colorCounts[colorCode] || 0) / colorCounts.total) * 100;
    stops.push(`${currentColor} 0 ${stop}%`);
    // console.log('\t', start, stop, currentColor);
    start = stop;
  });
  const gradient = new ConicGradient({
    stops: stops.join(", "),
    size: 400
  });
  const chart = createDiv(
    ["pie_container"],
    `<span>${title}</span>
    <svg class="pie">${gradient.svg}</svg>`
  );
  return chart;
}

//
exports.openDraft = openDraft;
function openDraft(id, draftPosition = 1) {
  // console.log("OPEN DRAFT", id, draftPosition);
  const container = byId("ux_1");
  container.innerHTML = "";
  container.classList.remove("flex_item");

  const draft = pd.draft(id);
  if (!draft) return;
  const tileGrpid = db.sets[draft.set].tile;
  if (db.card(tileGrpid)) {
    changeBackground("", tileGrpid);
  }

  const packSize = PACK_SIZES[draft.set] || 14;
  if (draftPosition < 1) draftPosition = packSize * 6;
  if (draftPosition > packSize * 6) draftPosition = 1;
  const pa = Math.floor((draftPosition - 1) / 2 / packSize);
  const pi = Math.floor(((draftPosition - 1) / 2) % packSize);
  const key = "pack_" + pa + "pick_" + pi;
  const pack = (draft[key] && draft[key].pack) || [];
  const pick = (draft[key] && draft[key].pick) || "";

  const d = createDiv(["list_fill"]);
  container.appendChild(d);

  const top = createDiv(["decklist_top"]);
  top.appendChild(createDiv(["button", "back"]));
  top.appendChild(createDiv(["deck_name"], draft.set + " Draft"));
  top.appendChild(createDiv(["deck_top_colors"]));
  container.appendChild(top);

  const cont = createDiv(["flex_item"]);
  cont.style.flexDirection = "column";

  const navCont = createDiv(["draft_nav_container"]);
  const prevNav = createDiv(["draft_nav_prev"]);
  prevNav.addEventListener("click", function() {
    draftPosition -= 1;
    openDraft(id, draftPosition);
  });
  navCont.appendChild(prevNav);
  const nextNav = createDiv(["draft_nav_next"]);
  nextNav.addEventListener("click", function() {
    draftPosition += 1;
    openDraft(id, draftPosition);
  });
  navCont.appendChild(nextNav);
  cont.appendChild(navCont);

  const title = createDiv(
    ["draft_title"],
    "Pack " + (pa + 1) + ", Pick " + (pi + 1)
  );
  cont.appendChild(title);

  const slider = createDiv(["slidecontainer"]);
  const sliderInput = createInput(["slider"], "", {
    type: "range",
    min: 1,
    max: packSize * 6,
    step: 1,
    value: draftPosition
  });
  sliderInput.addEventListener("input", function() {
    const pa = Math.floor((this.value - 1) / 2 / packSize);
    const pi = Math.floor(((this.value - 1) / 2) % packSize);
    title.innerHTML = "Pack " + (pa + 1) + ", Pick " + (pi + 1);
  });
  sliderInput.addEventListener("change", function() {
    draftPosition = parseInt(this.value);
    openDraft(id, draftPosition);
  });
  slider.appendChild(sliderInput);
  cont.appendChild(slider);

  const pdiv = createDiv(["draft_pack_container"]);
  cont.appendChild(pdiv);

  pack.forEach(grpId => {
    const card = db.card(grpId);
    const d = createDiv(["draft_card"]);
    d.style.width = pd.cardsSize + "px";

    const img = createImg(["draft_card_img"], "", {
      src: get_card_image(card)
    });
    img.style.width = pd.cardsSize + "px";
    if (grpId === pick && draftPosition % 2 === 0) {
      img.classList.add("draft_card_picked");
    }
    addCardHover(img, card);
    d.appendChild(img);

    d.appendChild(createDiv(["draft_card_rating"], DRAFT_RANKS[card.rank]));

    pdiv.appendChild(d);
  });

  container.appendChild(cont);

  $$(".back")[0].addEventListener("click", () => {
    changeBackground("default");
    // TODO find alternative to jQuery animate
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

//
exports.openActionLog = openActionLog;
function openActionLog(actionLogId) {
  const conatiner = byId("ux_2");
  conatiner.innerHTML = "";

  const top = createDiv(["decklist_top"]);
  const backButton = createDiv(["button", "back"]);
  backButton.addEventListener("click", () => {
    // TODO remove jquery.easing
    $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
  });
  top.appendChild(backButton);
  top.appendChild(createDiv(["deck_name"], "Action Log"));
  top.appendChild(createDiv(["deck_name"]));
  conatiner.appendChild(top);

  const actionLogContainer = createDiv(["action_log_container"]);

  const actionLogFile = path.join(actionLogDir, actionLogId + ".txt");
  let str = fs.readFileSync(actionLogFile).toString();

  const actionLog = str.split("\n");
  for (let line = 1; line < actionLog.length - 1; line += 3) {
    const seat = ("" + actionLog[line]).trim();
    const time = actionLog[line + 1];
    let str = actionLog[line + 2];
    str = striptags(str, ["log-card", "log-ability"]);

    const boxDiv = createDiv(["actionlog", "log_p" + seat]);
    boxDiv.appendChild(createDiv(["actionlog_time"], time));
    boxDiv.appendChild(createDiv(["actionlog_text"], str));
    actionLogContainer.appendChild(boxDiv);
  }

  conatiner.appendChild(actionLogContainer);

  $$("log-card").forEach(obj => {
    const grpId = obj.getAttribute("id");
    addCardHover(obj, db.card(grpId));
  });

  $$("log-ability").forEach(obj => {
    const grpId = obj.getAttribute("id");
    obj.title = db.abilities[grpId] || "";
  });

  // TODO remove jquery.easing
  $(".moving_ux").animate({ left: "-200%" }, 250, "easeInOutCubic");
}

//
exports.toggleVisibility = toggleVisibility;
function toggleVisibility(...ids) {
  ids.forEach(id => {
    const el = byId(id);
    if ([...el.classList].includes("hidden")) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

//
exports.addCheckbox = addCheckbox;
function addCheckbox(div, label, id, def, func) {
  const labelEl = createLabel(["check_container", "hover_label"], label);

  const checkbox = createInput([], "", { type: "checkbox", id, checked: def });
  checkbox.addEventListener("click", func);
  labelEl.appendChild(checkbox);
  labelEl.appendChild(createSpan(["checkmark"]));

  div.appendChild(labelEl);
  return labelEl;
}

//
exports.changeBackground = changeBackground;
function changeBackground(arg = "default", grpId = 0) {
  let artistLine = "";
  const _card = db.card(grpId);
  const topArtist = $$(".top_artist")[0];
  const mainWrapper = $$(".main_wrapper")[0];

  //console.log(arg, grpId, _card);
  if (arg === "default") {
    if (pd.settings.back_url && pd.settings.back_url !== "default") {
      topArtist.innerHTML = "";
      mainWrapper.style.backgroundImage = "url(" + pd.settings.back_url + ")";
    } else {
      topArtist.innerHTML = "Ghitu Lavarunner by Jesper Ejsing";
      mainWrapper.style.backgroundImage =
        "url(../images/Ghitu-Lavarunner-Dominaria-MtG-Art.jpg)";
    }
  } else if (_card) {
    // console.log(_card.images["art_crop"]);
    mainWrapper.style.backgroundImage =
      "url(https://img.scryfall.com/cards" + _card.images["art_crop"] + ")";
    try {
      artistLine = _card.name + " by " + _card.artist;
      topArtist.innerHTML = artistLine;
    } catch (e) {
      console.log(e);
    }
  } else if (fs.existsSync(arg)) {
    topArtist.innerHTML = "";
    mainWrapper.style.backgroundImage = "url(" + arg + ")";
  } else {
    topArtist.innerHTML = "";
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

//
exports.showColorpicker = showColorpicker;
function showColorpicker(
  color,
  onChange = () => {},
  onDone = () => {},
  onCancel = () => {},
  pickerOptions = {}
) {
  const wrapper = $$(".dialog_wrapper")[0];
  wrapper.style.opacity = 1;
  wrapper.style.pointerEvents = "all";
  wrapper.style.display = "block";

  const dialog = $$(".dialog")[0];
  dialog.innerHTML = "";
  dialog.style.width = "260px";
  dialog.style.height = "320px";
  dialog.style.top = "calc(50% - 100px)";
  dialog.addEventListener("mousedown", function(e) {
    e.stopPropagation();
  });

  const closeDialog = () => {
    wrapper.style.opacity = 0;
    wrapper.style.pointerEvents = "none";

    setTimeout(() => {
      wrapper.style.display = "none";
      dialog.style.width = "400px";
      dialog.style.height = "160px";
      dialog.style.top = "calc(50% - 80px)";
    }, 250);
  };

  wrapper.addEventListener("mousedown", function() {
    onCancel(color);
    closeDialog();
  });
  // https://vanilla-picker.js.org/gen/Picker.html
  new Picker({
    alpha: false,
    color,
    parent: dialog,
    popup: false,
    onChange,
    onDone: function(color) {
      onDone(color);
      closeDialog();
    },
    ...pickerOptions
  });
  const pickerWrapper = $$(".picker_wrapper")[0];
  pickerWrapper.style.alignSelf = "center";
  pickerWrapper.style.margin = "1px";
  pickerWrapper.style.backgroundColor = "rgb(0,0,0,0)";
  pickerWrapper.style.boxShadow = "none";
}

//
exports.formatPercent = formatPercent;
function formatPercent(value, config = {}) {
  return value.toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2,
    ...config
  });
}

//
exports.formatNumber = formatNumber;
function formatNumber(value, config = {}) {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

//
exports.getWinrateClass = getWinrateClass;
function getWinrateClass(wr) {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

//
exports.getEventWinLossClass = getEventWinLossClass;
function getEventWinLossClass(wlGate) {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
  if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  return "red";
}

//
exports.compareWinrates = compareWinrates;
function compareWinrates(a, b) {
  let _a = a.wins / a.losses;
  let _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compareColorWinrates(a, b);
}

//
exports.compareColorWinrates = compareColorWinrates;
function compareColorWinrates(a, b) {
  a = a.colors;
  b = b.colors;

  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;

  let sa = a.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  let sb = b.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  if (sa < sb) return -1;
  if (sa > sb) return 1;

  return 0;
}
