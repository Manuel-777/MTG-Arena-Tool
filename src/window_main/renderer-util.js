/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-use-before-define */
import fs from "fs";
import path from "path";
import { app, ipcRenderer as ipc, remote, shell } from "electron";
const { dialog } = remote;
import _ from "lodash";
import format from "date-fns/format";
import anime from "animejs";
import striptags from "striptags";
import Picker from "vanilla-picker";
import Pikaday from "pikaday";
import {
  CARD_RARITIES,
  COLORS_ALL,
  MANA,
  MANA_COLORS,
  IPC_MAIN,
  IPC_BACKGROUND,
  EASING_DEFAULT,
  SETTINGS_PRIVACY
} from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import ConicGradient from "../shared/conic-gradient";
import {
  createDiv,
  createImg,
  createInput,
  createLabel,
  createSpan,
  queryElements as $$
} from "../shared/dom-fns";
import * as deckDrawer from "./DeckDrawer";
import { cardType } from "../shared/cardTypes";
import { addCardHover } from "../shared/cardHover";
import {
  deckTypesStats,
  formatRank,
  getBoosterCountEstimate,
  getCardArtCrop,
  get_deck_missing,
  get_rank_index_16,
  getCardImage,
  getReadableEvent,
  makeId,
  toMMSS,
  openScryfallCard
} from "../shared/util";
import ReactDOM from "react-dom";
import createShareButton from "./createShareButton";
import { forceOpenSettings } from "./tabControl";

const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";

const byId = id => document.getElementById(id);
let popTimeout = null;
let dialogHandler = null;
let unmountPoints = [];
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
function ipcSend(method, arg, to = IPC_BACKGROUND) {
  ipc.send("ipc_switch", method, IPC_MAIN, arg, to);
}

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

function showLoadingBars() {
  $$(".main_loading")[0].style.display = "block";
  document.body.style.cursor = "progress";
}

function hideLoadingBars() {
  $$(".main_loading")[0].style.display = "none";
  document.body.style.cursor = "auto";
}

function setLocalState(state = {}) {
  Object.assign(localState, state);
}

function getLocalState() {
  return localState;
}

function toggleArchived(id) {
  ipcSend("toggle_archived", id);
}

function getTagColor(tag) {
  return pd.tags_colors[tag] || "#FAE5D2";
}

function makeResizable(div, resizeCallback, finalCallback) {
  let mPos;
  let finalWidth;

  const resize = function(e) {
    const parent = div.parentNode;
    const dx = mPos - e.x;
    mPos = e.x;
    const newWidth = Math.max(10, parseInt(parent.style.width) + dx);
    parent.style.width = `${newWidth}px`;
    parent.style.flex = `0 0 ${newWidth}px`;
    if (resizeCallback instanceof Function) resizeCallback(newWidth);
    finalWidth = newWidth;
  };

  const saveWidth = function(width) {
    ipcSend("save_user_settings", {
      right_panel_width: width,
      skipRefresh: true
    });
  };

  div.addEventListener(
    "mousedown",
    event => {
      mPos = event.x;
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

export function resetMainContainer() {
  const container = byId("ux_0");
  if (unmountPoints.length > 0) {
    unmountPoints.forEach(node => ReactDOM.unmountComponentAtNode(node));
  }
  unmountPoints = [];
  container.innerHTML = "";
  container.classList.remove("flex_item");
  const { lastScrollHandler } = getLocalState();
  if (lastScrollHandler) {
    container.removeEventListener("scroll", lastScrollHandler);
    setLocalState({ lastScrollHandler: null });
  }
  return container;
}

export function addNodeToUnmountReact(node) {
  unmountPoints.push(node);
}

function drawDeck(div, deck, showWildcards = false) {
  div.innerHTML = "";
  const unique = makeId(4);

  if (deck.commandZoneGRPIds && deck.commandZoneGRPIds.length > 0) {
    const separator = deckDrawer.cardSeparator(`Commander`);
    div.appendChild(separator);

    deck.commandZoneGRPIds.forEach((id, index) => {
      if (index % 2 == 0) {
        const tile = deckDrawer.cardTile(
          pd.settings.card_tile_style,
          id,
          unique + "a",
          deck.commandZoneGRPIds[index + 1],
          showWildcards,
          deck,
          false
        );
        div.appendChild(tile);
      }
    });
  }

  // draw maindeck grouped by cardType
  const cardsByGroup = _(deck.mainDeck)
    .map(card => ({ data: db.card(card.id), ...card }))
    .filter(card => card.data.type)
    .groupBy(card => {
      const type = cardType(card.data);
      switch (type) {
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
        case "Basic Land":
          return "Lands";
        default:
          throw new Error(`Unexpected card type: ${type}`);
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
    const separator = deckDrawer.cardSeparator(`Sideboard (${sideboardSize})`);
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

function drawCardList(div, cards) {
  const unique = makeId(4);
  const counts = {};
  cards.forEach(cardId => (counts[cardId] = (counts[cardId] || 0) + 1));
  Object.keys(counts).forEach(cardId => {
    const tile = deckDrawer.cardTile(
      pd.settings.card_tile_style,
      cardId,
      unique,
      counts[cardId]
    );
    div.appendChild(tile);
  });
}

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
            tileNow.style.marginBottom = sz * 0.5 + "px";
            mainDiv.appendChild(tileNow);
          }

          const d = createDiv(["deck_visual_card"]);
          d.style.width = sz + "px";
          d.style.height = sz * 0.166 + "px";
          const img = createImg(["deck_visual_card_img"], "", {
            src: getCardImage(card)
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
            d.style.height = sz * 0.166 + "px";
            if (_n % 2 === 0) {
              d.style.marginLeft = "60px";
            }

            const img = createImg(["deck_visual_card_img"], "", {
              src: getCardImage(card)
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

function openActionLog(actionLogId) {
  const conatiner = byId("ux_2");
  conatiner.innerHTML = "";

  const top = createDiv(["decklist_top"]);
  const backButton = createDiv(["button", "back"]);
  backButton.addEventListener("click", () => {
    anime({
      targets: ".moving_ux",
      left: "-100%",
      easing: EASING_DEFAULT,
      duration: 350
    });
  });
  top.appendChild(backButton);
  top.appendChild(createDiv(["deck_name"], "Action Log"));
  top.appendChild(createDiv(["deck_name"]));
  conatiner.appendChild(top);

  const actionLogContainer = createDiv(["action_log_container"]);

  const actionLogFile = path.join(actionLogDir, actionLogId + ".txt");
  const str = fs.readFileSync(actionLogFile).toString();

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

  anime({
    targets: ".moving_ux",
    left: "-200%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}

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

function addCheckbox(div, label, id, def, func, disabled = false) {
  const labelEl = createLabel(["check_container", "hover_label"], label);
  if (disabled) {
    labelEl.classList.remove("hover_label");
    labelEl.style.cursor = "default";
    labelEl.style.opacity = 0.4;
  }

  const checkbox = createInput([], "", {
    type: "checkbox",
    id,
    checked: def,
    disabled
  });
  if (!disabled) checkbox.addEventListener("click", func);
  labelEl.appendChild(checkbox);
  labelEl.appendChild(createSpan(["checkmark"]));

  div.appendChild(labelEl);
  return labelEl;
}

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
      topArtist.innerHTML = "Bedevil by Seb McKinnon";
      mainWrapper.style.backgroundImage = "url(" + DEFAULT_BACKGROUND + ")";
    }
  } else if (_card) {
    mainWrapper.style.backgroundImage = `url(${getCardArtCrop(_card)})`;
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

function openDialog(content, onClose = () => {}) {
  const wrapper = $$(".dialog_wrapper")[0];
  dialogHandler = () => {
    onClose();
    closeDialog();
  };
  wrapper.style.pointerEvents = "all";
  wrapper.addEventListener("mousedown", dialogHandler);
  anime({
    targets: ".dialog_wrapper",
    opacity: 1,
    display: "block",
    easing: EASING_DEFAULT,
    duration: 150
  });

  const dialog = $$(".dialog")[0];
  dialog.innerHTML = "";
  dialog.appendChild(content);
  const halfHeight = (content.offsetHeight || 0) / 2;
  dialog.addEventListener("mousedown", e => e.stopPropagation());
  dialog.style.width = content.offsetWidth + 32 + "px";
  // dialog.style.height = content.offsetHeight + 32 + "px";
  dialog.style.top = `calc(50% - ${halfHeight}px)`;
  anime({
    targets: ".dialog",
    opacity: 1,
    easing: EASING_DEFAULT,
    duration: 250
  });
}

function closeDialog() {
  const wrapper = $$(".dialog_wrapper")[0];
  anime({
    targets: ".dialog_wrapper",
    opacity: 0,
    display: "hidden",
    easing: EASING_DEFAULT,
    duration: 150
  });
  wrapper.style.pointerEvents = "none";
  wrapper.removeEventListener("mousedown", dialogHandler);
  dialogHandler = null;

  const dialog = $$(".dialog")[0];
  anime({
    targets: ".dialog",
    opacity: 0,
    easing: EASING_DEFAULT,
    duration: 250
  });
  setTimeout(() => (dialog.innerHTML = ""), 250);
}

function showColorpicker(
  color,
  onChange = color => {},
  onDone = color => {},
  onCancel = () => {},
  pickerOptions = {}
) {
  const cont = createDiv(["dialog_content"]);
  cont.style.width = "250px";
  // https://vanilla-picker.js.org/gen/Picker.html
  new Picker({
    alpha: false,
    color,
    parent: cont,
    popup: false,
    onChange,
    onDone: function(color) {
      onDone(color);
      closeDialog();
    },
    ...pickerOptions
  });
  openDialog(cont, () => onCancel(color));
  const pickerWrapper = $$(".picker_wrapper")[0];
  pickerWrapper.style.backgroundColor = "rgb(0,0,0,0)";
  pickerWrapper.style.boxShadow = "none";
}

function showDatepicker(
  defaultDate,
  onChange = date => {},
  pickerOptions = {}
) {
  const cont = createDiv(["dialog_content"]);
  cont.style.width = "320px";
  cont.style.heigh = "400px";
  // https://github.com/Pikaday/Pikaday
  const now = new Date();
  const picker = new Pikaday({
    defaultDate,
    maxDate: now,
    onSelect: () => onChange(picker.getDate()),
    setDefaultDate: defaultDate !== undefined,
    ...pickerOptions
  });
  cont.appendChild(picker.el);
  openDialog(cont);
}

function renderLogInput(section) {
  const logUriLabel = createLabel(["but_container_label"], "Arena Log:", {
    for: "settings_log_uri"
  });
  logUriLabel.style.width = "100%";
  logUriLabel.appendChild(createDiv(["open_button"]));
  const logUriCont = createDiv(["input_container"]);
  logUriCont.style.margin = "3px";
  logUriCont.style.width = "70%";
  const logUriInput = createInput([], "", {
    type: "text",
    id: "settings_log_uri",
    autocomplete: "off",
    placeholder: pd.settings.logUri,
    value: pd.settings.logUri
  });
  let canShowFileDialog = true;
  logUriLabel.addEventListener("click", () => {
    if (!canShowFileDialog) return;
    // ignore clicks inside actual input field
    if (document.activeElement === logUriInput) return;
    canShowFileDialog = false;
    const paths = dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: "Arena Log Location",
      defaultPath: pd.settings.logUri,
      buttonLabel: "Select",
      filters: [
        { name: "Text", extensions: ["txt", "text"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (paths && paths.length && paths[0]) {
      logUriInput.focus();
      logUriInput.value = paths[0];
      logUriInput.blur();
    }
    canShowFileDialog = true;
  });
  logUriInput.addEventListener("keyup", e => {
    if (e.keyCode === 13) logUriInput.blur();
  });
  logUriInput.addEventListener("focusout", () => {
    if (logUriInput.value === pd.settings.logUri) return;
    if (
      confirm(
        "Changing the Arena log location requires a restart, are you sure?"
      )
    ) {
      ipcSend("set_log", byId("settings_log_uri").value);
    } else {
      logUriInput.value = pd.settings.logUri;
    }
  });
  logUriCont.appendChild(logUriInput);
  logUriLabel.appendChild(logUriCont);
  section.appendChild(logUriLabel);
  section.appendChild(
    createDiv(
      ["settings_note"],
      `<p><i>This temporary text file generated by WotC contains the raw
      output from your most recent (or current) Arena session. This is the
      primary source of user data.</i></p>`
    )
  );
}

function formatPercent(value, config = { maximumSignificantDigits: 2 }) {
  return value.toLocaleString([], {
    style: "percent",
    ...config
  });
}

export function formatWinrateInterval(lower, upper) {
  return `${formatPercent(lower)} to ${formatPercent(upper)} with 95% confidence
(estimated actual winrate bounds, assuming a normal distribution)`;
}

function formatNumber(value, config = {}) {
  return value.toLocaleString([], {
    style: "decimal",
    ...config
  });
}

function getWinrateClass(wr) {
  if (wr > 0.65) return "blue";
  if (wr > 0.55) return "green";
  if (wr < 0.45) return "orange";
  if (wr < 0.35) return "red";
  return "white";
}

function getEventWinLossClass(wlGate) {
  if (wlGate === undefined) return "white";
  if (wlGate.MaxWins === wlGate.CurrentWins) return "blue";
  if (wlGate.CurrentWins > wlGate.CurrentLosses) return "green";
  if (wlGate.CurrentWins * 2 > wlGate.CurrentLosses) return "orange";
  return "red";
}

function compareWinrates(a, b) {
  const _a = a.wins / a.losses;
  const _b = b.wins / b.losses;

  if (_a < _b) return 1;
  if (_a > _b) return -1;

  return compareColorWinrates(a, b);
}

function compareColorWinrates(a, b) {
  a = a.colors;
  b = b.colors;

  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;

  const sa = a.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  const sb = b.reduce(function(_a, _b) {
    return _a + _b;
  }, 0);
  if (sa < sb) return -1;
  if (sa > sb) return 1;

  return 0;
}

function localTimeSince(date) {
  return `<relative-time datetime="${date.toISOString()}">
    ${date.toString()}
  </relative-time>`;
}

function attachMatchData(listItem, match) {
  // Deck name
  const deckNameDiv = createDiv(["list_deck_name"], match.playerDeck.name);
  listItem.leftTop.appendChild(deckNameDiv);

  // Event name
  const eventNameDiv = createDiv(
    ["list_deck_name_it"],
    getReadableEvent(match.eventId)
  );
  listItem.leftTop.appendChild(eventNameDiv);

  match.playerDeck.colors.forEach(color => {
    const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
    listItem.leftBottom.appendChild(m);
  });

  // Opp name
  if (match.opponent.name == null) match.opponent.name = "-#000000";
  const oppNameDiv = createDiv(
    ["list_match_title"],
    "vs " + match.opponent.name.slice(0, -6)
  );
  listItem.rightTop.appendChild(oppNameDiv);

  // Opp rank
  const oppRank = createDiv(["ranks_16"]);
  oppRank.style.marginRight = "0px";
  oppRank.style.backgroundPosition =
    get_rank_index_16(match.opponent.rank) * -16 + "px 0px";
  oppRank.title = formatRank(match.opponent);
  listItem.rightTop.appendChild(oppRank);

  const date = !match.date
    ? "Unknown date - "
    : localTimeSince(new Date(match.date));
  // Match time
  const matchTime = createDiv(
    ["list_match_time"],
    date + " " + toMMSS(match.duration) + " long"
  );
  listItem.rightBottom.appendChild(matchTime);

  // Opp colors
  match.oppDeck.colors.forEach(color => {
    const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
    listItem.rightBottom.appendChild(m);
  });

  const tagsDiv = createDiv(["matches_tags"], "", {
    id: "matches_tags_" + match.id
  });
  listItem.rightBottom.appendChild(tagsDiv);

  // Result
  const resultDiv = createDiv(
    [
      "list_match_result",
      match.player.win > match.opponent.win ? "green" : "red"
    ],
    `${match.player.win}:${match.opponent.win}`
  );
  listItem.right.after(resultDiv);

  // On the play/draw
  if (match.onThePlay) {
    let onThePlay = false;
    if (match.player.seat == match.onThePlay) {
      onThePlay = true;
    }
    const div = createDiv([onThePlay ? "ontheplay" : "onthedraw"]);
    div.title = onThePlay ? "On the play" : "On the draw";
    listItem.right.after(div);
  }
}

function createDraftSetDiv(draft) {
  return createDiv(["list_deck_name"], draft.set + " draft");
}

export function createRoundCard(card, rarityOverlay = false) {
  const roundCard = createDiv([
    "round_card",
    card.rarity,
    `rarity-overlay${rarityOverlay ? "" : "-none"}`
  ]);

  roundCard.title = card.name;
  roundCard.style.backgroundImage = `url("${getCardImage(card, "art_crop")}")`;

  addCardHover(roundCard, card);

  roundCard.addEventListener("click", () => {
    if (card.dfc == "SplitHalf") {
      card = db.card(card.dfcId);
    }
    openScryfallCard(card);
  });

  return roundCard;
}

export function createDraftRares(draft) {
  const draftRares = createDiv(["flex_item"]);
  draftRares.style.margin = "auto";
  if (!draft.pickedCards) return draftRares;

  draft.pickedCards
    .map(cardId => db.card(cardId))
    .filter(card => card.rarity == "rare" || card.rarity == "mythic")
    .map(card => createRoundCard(card, true))
    .forEach(inventoryCard => draftRares.appendChild(inventoryCard));

  return draftRares;
}

function createDraftTimeDiv(draft) {
  return createDiv(
    ["list_match_time"],
    draft.date ? localTimeSince(new Date(draft.date)) : "Unknown"
  );
}

function createReplayDiv() {
  return createDiv(["list_match_replay"], "See replay");
}

function createReplayShareButton(draft) {
  const replayShareButton = createShareButton(
    ["list_draft_share", draft.id + "dr"],
    shareExpire => draftShareLink(draft.id, draft, shareExpire)
  );
  replayShareButton.title = "share draft replay";
  return replayShareButton;
}

export function attachDeckData(listItem, deck) {
  // Deck name
  if (deck.name.indexOf("?=?Loc/Decks/Precon/") != -1) {
    deck.name = deck.name.replace("?=?Loc/Decks/Precon/", "");
  }
  const deckNameDiv = createDiv(["list_deck_name"], deck.name);
  listItem.leftTop.appendChild(deckNameDiv);

  // Deck colors
  deck.colors.forEach(function(color) {
    const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
    listItem.leftBottom.appendChild(m);
  });

  // Last touched
  const lastTouch = new Date(deck.timeTouched);
  const deckLastTouchedDiv = createDiv(
    ["list_deck_winrate"],
    `<i style="opacity:0.6">updated/played:</i> ${localTimeSince(lastTouch)}`
  );
  deckLastTouchedDiv.style.marginLeft = "18px";
  deckLastTouchedDiv.style.marginRight = "auto";
  deckLastTouchedDiv.style.lineHeight = "18px";
  listItem.centerBottom.appendChild(deckLastTouchedDiv);

  // Deck winrates
  if (deck.total > 0) {
    const deckWinrateDiv = createDiv(["list_deck_winrate"]);
    let interval, tooltip;
    if (deck.total >= 20) {
      // sample Size is large enough to use Wald Interval
      interval = formatPercent(deck.interval);
      tooltip = formatWinrateInterval(
        formatPercent(deck.winrateLow),
        formatPercent(deck.winrateHigh)
      );
    } else {
      // sample size is too small (garbage results)
      interval = "???";
      tooltip = "play at least 20 matches to estimate actual winrate";
    }
    let colClass = getWinrateClass(deck.winrate);
    deckWinrateDiv.innerHTML = `${deck.wins}:${
      deck.losses
    } (<span class="${colClass}_bright">${formatPercent(
      deck.winrate
    )}</span> <i style="opacity:0.6;">&plusmn; ${interval}</i>)`;
    deckWinrateDiv.title = tooltip;
    listItem.rightTop.appendChild(deckWinrateDiv);

    const deckWinrateLastDiv = createDiv(
      ["list_deck_winrate"],
      "Since last edit: "
    );
    deckWinrateLastDiv.style.opacity = 0.6;

    if (deck.lastEditTotal > 0) {
      colClass = getWinrateClass(deck.lastEditWinrate);
      deckWinrateLastDiv.innerHTML += `<span class="${colClass}_bright">${formatPercent(
        deck.lastEditWinrate
      )}</span>`;
      deckWinrateLastDiv.title = `${formatPercent(
        deck.lastEditWinrate
      )} winrate since ${format(new Date(deck.lastUpdated), "Pp")}`;
    } else {
      deckWinrateLastDiv.innerHTML += "<span>--</span>";
      deckWinrateLastDiv.title = "no data yet";
    }
    listItem.rightBottom.appendChild(deckWinrateLastDiv);
  }

  // Deck crafting cost
  const ownedWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };
  const missingWildcards = get_deck_missing(deck);
  let wc;
  let n = 0;
  const boosterCost = getBoosterCountEstimate(missingWildcards);
  CARD_RARITIES.filter(rarity => rarity !== "land").forEach(cardRarity => {
    cardRarity = cardRarity.toLowerCase();
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
}

export function attachDraftData(listItem, draft) {
  // console.log("Draft: ", draft);
  const draftSetDiv = createDraftSetDiv(draft);
  const draftRares = createDraftRares(draft);
  const draftTimeDiv = createDraftTimeDiv(draft);
  const replayDiv = createReplayDiv(draft);
  const replayShareButton = createReplayShareButton(draft);

  listItem.leftTop.appendChild(draftSetDiv);
  listItem.center.appendChild(draftRares);
  listItem.rightBottom.appendChild(draftTimeDiv);
  listItem.rightTop.appendChild(replayDiv);
  listItem.right.after(replayShareButton);
}

function draftShareLink(id, draft, shareExpire) {
  const draftData = JSON.stringify(draft);
  let expire = 0;
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
  showLoadingBars();
  ipcSend("request_draft_link", { expire, id, draftData });
}

function showOfflineSplash() {
  hideLoadingBars();
  byId("ux_0").innerHTML = `
  <div class="message_center_offline" style="display: flex; position: fixed;">
    <div class="message_unlink"></div>
    <div class="message_big red">Oops, you are offline!</div>
    <div class="message_sub_16 white">To access online features:</div>
    <div class="message_sub_16 white">If you are logged in, you may need to <a class="privacy_link">enable online sharing</a> and restart.</div>
    <div class="message_sub_16 white">If you are in offline mode, you can <a class="launch_login_link">login to your account</a>.</div>
    <div class="message_sub_16 white">If you need an account, you can <a class="signup_link">sign up here</a>.</div>
  </div>`;
  $$(".privacy_link")[0].addEventListener("click", function() {
    forceOpenSettings(SETTINGS_PRIVACY);
  });
  $$(".launch_login_link")[0].addEventListener("click", function() {
    const clearAppSettings = {
      remember_me: false,
      auto_login: false,
      launch_to_tray: false
    };
    ipcSend("save_app_settings", clearAppSettings);
    remote.app.relaunch();
    remote.app.exit(0);
  });
  $$(".signup_link")[0].addEventListener("click", function() {
    shell.openExternal("https://mtgatool.com/signup/");
  });
}

export {
  actionLogDir,
  ipcSend,
  pop,
  showLoadingBars,
  hideLoadingBars,
  setLocalState,
  getLocalState,
  toggleArchived,
  getTagColor,
  makeResizable,
  drawDeck,
  drawCardList,
  drawDeckVisual,
  colorPieChart,
  openActionLog,
  toggleVisibility,
  addCheckbox,
  changeBackground,
  openDialog,
  closeDialog,
  showColorpicker,
  showDatepicker,
  renderLogInput,
  formatPercent,
  formatNumber,
  getWinrateClass,
  getEventWinLossClass,
  compareWinrates,
  compareColorWinrates,
  localTimeSince,
  attachMatchData,
  showOfflineSplash
};
