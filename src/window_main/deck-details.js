import anime from "animejs";
import _ from "lodash";
import { MANA, CARD_RARITIES, EASING_DEFAULT } from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import { createDiv, createSpan, queryElements as $$ } from "../shared/dom-fns";
import * as deckDrawer from "../shared/deck-drawer";
import {
  deckManaCurve,
  deckTypesStats,
  get_deck_export,
  get_deck_export_txt,
  get_deck_missing,
  getBoosterCountEstimate,
  timeSince
} from "../shared/util";
import Aggregator from "./aggregator";
import StatsPanel from "./stats-panel";
import {
  changeBackground,
  colorPieChart,
  drawDeck,
  drawDeckVisual,
  ipcSend,
  makeResizable,
  showLoadingBars,
  pop
} from "./renderer-util";
import createShareButton from "./createShareButton";

const byId = id => document.getElementById(id);
// We need to store a sorted list of card types so we create the card counts in the same order.
let currentOpenDeck = null;
let currentFilters = null;

//
function get_deck_colors_ammount(deck) {
  var colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

  //var mana = {0: "", 1: "white", 2: "blue", 3: "black", 4: "red", 5: "green", 6: "colorless", 7: "", 8: "x"}
  deck.mainDeck.forEach(function(card) {
    if (card.quantity > 0) {
      db.card(card.id).cost.forEach(function(c) {
        if (c.indexOf("w") !== -1) {
          colors.w += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("u") !== -1) {
          colors.u += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("b") !== -1) {
          colors.b += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("r") !== -1) {
          colors.r += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("g") !== -1) {
          colors.g += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("c") !== -1) {
          colors.c += card.quantity;
          colors.total += card.quantity;
        }
      });
    }
  });

  return colors;
}

//
function get_deck_lands_ammount(deck) {
  var colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

  //var mana = {0: "", 1: "white", 2: "blue", 3: "black", 4: "red", 5: "green", 6: "colorless", 7: "", 8: "x"}
  deck.mainDeck.forEach(function(card) {
    var quantity = card.quantity;
    card = db.card(card.id);
    if (quantity > 0) {
      if (card.type.indexOf("Land") != -1 || card.type.indexOf("land") != -1) {
        if (card.frame.length < 5) {
          card.frame.forEach(function(c) {
            if (c == 1) {
              colors.w += quantity;
              colors.total += quantity;
            }
            if (c == 2) {
              colors.u += quantity;
              colors.total += quantity;
            }
            if (c == 3) {
              colors.b += quantity;
              colors.total += quantity;
            }
            if (c == 4) {
              colors.r += quantity;
              colors.total += quantity;
            }
            if (c == 5) {
              colors.g += quantity;
              colors.total += quantity;
            }
            if (c == 6) {
              colors.c += quantity;
              colors.total += quantity;
            }
          });
        }
      }
    }
  });

  return colors;
}

function deckStatsSection(deck) {
  const stats = createDiv(["stats"]);

  const visualView = createDiv(["button_simple", "visualView"], "Visual View");
  stats.appendChild(visualView);

  const id = deck.id || deck._id;
  if (!id || !pd.deckExists(id)) {
    const importDeck = createDiv(
      ["button_simple", "centered"],
      "Add to My Decks"
    );
    importDeck.addEventListener("click", function() {
      ipcSend(
        "import_custom_deck",
        JSON.stringify({
          id,
          ..._.pick(deck, [
            "description",
            "format",
            "colors",
            "mainDeck",
            "name",
            "sideboard"
          ]),
          deckTileId: deck.deckTileId || deck.tile,
          lastUpdated: new Date().toISOString()
        })
      );
    });
    stats.appendChild(importDeck);
  }

  if (pd.deckChanges(deck.id).length) {
    const openHistory = createDiv(
      ["button_simple", "openHistory"],
      "History of changes"
    );
    openHistory.addEventListener("click", () => setChangesTimeline(deck.id));
    stats.appendChild(openHistory);
  }

  const exportDeck = createDiv(
    ["button_simple", "exportDeck"],
    "Export to Arena"
  );
  exportDeck.addEventListener("click", () => {
    const list = get_deck_export(deck);
    pop("Copied to clipboard", 2000);
    ipcSend("set_clipboard", list);
  });
  stats.appendChild(exportDeck);
  const exportDeckStandard = createDiv(
    ["button_simple", "exportDeckStandard"],
    "Export to .txt"
  );
  exportDeckStandard.addEventListener("click", () => {
    const list = get_deck_export_txt(deck);
    ipcSend("export_txt", { str: list, name: deck.name });
  });
  stats.appendChild(exportDeckStandard);

  // Cart Types
  stats.appendChild(deckTypesStats(deck));

  // Mana Curve
  stats.appendChild(deckManaCurve(deck));

  // Pie Charts
  const pieContainer = createDiv(["pie_container_outer"]);
  stats.appendChild(pieContainer);

  // Deck colors
  const colorCounts = get_deck_colors_ammount(deck);
  pieContainer.appendChild(colorPieChart(colorCounts, "Mana Symbols"));

  // Lands colors
  const landCounts = get_deck_lands_ammount(deck);
  pieContainer.appendChild(colorPieChart(landCounts, "Mana Sources"));

  // Deck crafting cost section
  const ownedWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };

  const missingWildcards = get_deck_missing(deck);
  const boosterCost = getBoosterCountEstimate(missingWildcards);
  const costSection = createDiv(["wildcards_cost"]);
  costSection.appendChild(createSpan([], "Wildcards you have/need"));
  CARD_RARITIES.filter(rarity => rarity !== "land").forEach(cardRarity => {
    cardRarity = cardRarity.toLowerCase();
    const wcText =
      (ownedWildcards[cardRarity] > 0
        ? ownedWildcards[cardRarity] + " / "
        : "") + missingWildcards[cardRarity];
    costSection.appendChild(
      createDiv(["wc_cost", "wc_" + cardRarity], wcText, { title: cardRarity })
    );
  });
  costSection.appendChild(
    createDiv(["wc_cost", "wc_booster"], Math.round(boosterCost), {
      title: "Approximate boosters"
    })
  );
  stats.appendChild(costSection);

  return stats;
}

export function openDeck(deck = currentOpenDeck, filters = currentFilters) {
  if (!deck) return;
  currentOpenDeck = deck;
  if (filters && deck.id !== filters.deckId) filters = null;
  currentFilters = filters;

  // #ux_1 is right side, #ux_0 is left side
  const mainDiv = byId("ux_1");
  mainDiv.classList.remove("flex_item");
  mainDiv.innerHTML = "";

  let container = mainDiv;
  let showStatsPanel = false;
  if (filters) {
    const aggregator = new Aggregator(filters);
    showStatsPanel = aggregator.stats.total > 0;
    if (showStatsPanel) {
      mainDiv.classList.add("flex_item");
      const wrap_r = createDiv(["wrapper_column", "sidebar_column_l"], "", {
        id: "stats_column"
      });
      wrap_r.style.width = pd.settings.right_panel_width + "px";
      wrap_r.style.flex = `0 0 ${pd.settings.right_panel_width}px`;
      const statsPanel = new StatsPanel(
        "decks_top",
        aggregator,
        pd.settings.right_panel_width,
        true
      );
      const deck_top_winrate = statsPanel.render();
      deck_top_winrate.style.display = "flex";
      deck_top_winrate.style.flexDirection = "column";
      deck_top_winrate.style.marginTop = "16px";
      deck_top_winrate.style.padding = "12px";

      const drag = createDiv(["dragger"]);
      wrap_r.appendChild(drag);
      makeResizable(drag, statsPanel.handleResize);

      wrap_r.appendChild(deck_top_winrate);

      const wrap_l = createDiv(["wrapper_column"]);
      wrap_l.setAttribute("id", "deck_column");
      mainDiv.appendChild(wrap_l);
      mainDiv.appendChild(wrap_r);
      container = wrap_l;
    }
  }

  const d = createDiv(["list_fill"]);
  container.appendChild(d);

  const top = createDiv(["decklist_top"]);
  top.appendChild(createDiv(["button", "back"]));
  top.appendChild(createDiv(["deck_name"], deck.name));

  if (!pd.offline) {
    const deckShareButton = createShareButton(
      ["list_log_share", deck.id + "al"],
      () => deckShareLink(deck)
    );
    top.appendChild(deckShareButton);
  } else {
    const deckCantShare = createDiv(["list_log_cant_share"]);
    deckCantShare.title = "You need to be logged in to share!";
    top.appendChild(deckCantShare);
  }

  const deckColors = createDiv(["deck_top_colors"]);
  deckColors.style.alignSelf = "center";
  deck.colors.forEach(color => {
    const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
    deckColors.appendChild(m);
  });
  top.appendChild(deckColors);

  const tileGrpId = deck.deckTileId || deck.tile;
  if (db.card(tileGrpId)) {
    changeBackground("", tileGrpId);
  }

  const deckListSection = createDiv(["decklist"]);
  drawDeck(deckListSection, deck, true);

  const statsSection = deckStatsSection(deck);

  const fld = createDiv(["flex_item"]);
  fld.appendChild(deckListSection);
  fld.appendChild(statsSection);

  container.appendChild(top);
  container.appendChild(fld);

  $$(".visualView")[0].addEventListener("click", () => {
    if (showStatsPanel) {
      byId("stats_column").style.display = "none";
    }
    drawDeckVisual(fld, deck, openDeck);
  });

  $$(".back")[0].addEventListener("click", () => {
    changeBackground("default");
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: EASING_DEFAULT,
      duration: 350
    });
  });
}

//
function deckShareLink(deck) {
  let deckString = JSON.stringify(deck);

  const shareExpire = byId("expire_select").value;
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
  ipcSend("request_deck_link", { expire, deckString });
}

//
function setChangesTimeline(deckId) {
  const cont = $$(".stats")[0];
  cont.innerHTML = "";

  const statsButton = createDiv(["button_simple", "openDeck"], "View stats");
  statsButton.addEventListener("click", () => openDeck());
  cont.appendChild(statsButton);

  const time = createDiv(["changes_timeline"]);
  const changes = [...pd.deckChanges(deckId)];
  changes.sort(compare_changes);
  const nowChange = {
    changesMain: [],
    changesSide: [],
    date: new Date(),
    label: "Current Deck"
  };
  [nowChange, ...changes].forEach((change, cn, changes) => {
    change.changesMain.sort(compare_changes_inner);
    change.changesSide.sort(compare_changes_inner);

    const div = createDiv(["change"]);

    const butbox = createDiv(["change_button_cont"]);
    if (cn === 0) {
      butbox.style.transform = "scaleY(-1)";
    } else if (cn < changes.length - 1) {
      butbox.style.backgroundSize = "100% 100%";
    }
    const button = createDiv(["change_button"]);
    butbox.appendChild(button);
    div.appendChild(butbox);

    const datbox = createDiv(["change_data"]);

    // title
    const title = createDiv(["change_data_box"]);

    // inside
    const data = createDiv(["change_data_box_inside"]);
    let innherH = 24;
    let nc = 0;
    let innerCn = 0;
    const renderChange = c => {
      innherH += 30;
      if (c.quantity > 0) nc += c.quantity;
      const dd = createDiv(["change_item_box"]);
      const changeStyle = c.quantity > 0 ? "change_add" : "change_remove";
      dd.appendChild(createDiv([changeStyle]));
      const tile = deckDrawer.cardTile(
        pd.settings.card_tile_style,
        c.id,
        innerCn + cn,
        Math.abs(c.quantity)
      );
      if (tile) {
        dd.appendChild(tile);
        data.appendChild(dd);
        innerCn++;
      }
    };

    if (change.changesMain.length > 0) {
      innherH += 30;
      const dd = createDiv(["change_item_box"]);
      const separator = deckDrawer.cardSeparator("Mainboard");
      dd.appendChild(separator);
      data.appendChild(dd);
      change.changesMain.forEach(renderChange);
    }

    if (change.changesSide.length > 0) {
      innherH += 30;
      const dd = createDiv(["change_item_box"]);
      dd.appendChild(deckDrawer.cardSeparator("Sideboard"));
      data.appendChild(dd);
      change.changesSide.forEach(renderChange);
    }

    if (change.label) {
      title.innerHTML = change.label;
    } else if (change.date) {
      title.innerHTML =
        nc + " changes, " + timeSince(Date.parse(change.date)) + " ago.";
    }
    datbox.appendChild(title);
    datbox.appendChild(data);
    div.appendChild(datbox);

    if (cn > 0) {
      div.style.cursor = "pointer";

      div.addEventListener("mouseenter", () => {
        button.style.width = "32px";
        button.style.height = "32px";
        button.style.top = "calc(50% - 16px)";
      });

      div.addEventListener("mouseleave", () => {
        button.style.width = "24px";
        button.style.height = "24px";
        button.style.top = "calc(50% - 12px)";
      });

      div.addEventListener("click", () => {
        // This requires some UX indicators
        const isActive = [...button.classList].includes("change_button_active");
        $$(".change_data_box_inside").forEach(el => {
          el.style.height = "0";
        });
        $$(".change_button").forEach(el => {
          el.classList.remove("change_button_active");
        });
        if (!isActive) {
          button.classList.add("change_button_active");
          data.style.height = innherH + "px";
        }
      });
    }
    cont.appendChild(div);
  });
  cont.appendChild(time);
}

//
function compare_changes(a, b) {
  a = Date.parse(a.date);
  b = Date.parse(b.date);
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

//
function compare_changes_inner(a, b) {
  a = a.quantity;
  b = b.quantity;
  if (a > 0 && b > 0) {
    if (a < b) return -1;
    if (a > b) return 1;
  }
  if (a < 0 && b < 0) {
    if (a < b) return 1;
    if (a > b) return -1;
  }
  if (a < 0 && b > 0) {
    return -1;
  }
  if (a > 0 && b < 0) {
    return 1;
  }
  return 0;
}
