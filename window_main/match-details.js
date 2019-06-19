const fs = require("fs");
const path = require("path");
const anime = require("animejs");

const { MANA } = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const { createDiv, queryElements: $$ } = require("../shared/dom-fns");
const deckDrawer = require("../shared/deck-drawer");
const {
  get_deck_export,
  get_deck_export_txt,
  get_rank_index,
  makeId
} = require("../shared/util");
const {
  hypergeometricSignificance,
  hypergeometricRange
} = require("../shared/stats-fns");

const {
  actionLogDir,
  changeBackground,
  drawCardList,
  drawDeck,
  ipcSend,
  openActionLog,
  toggleVisibility
} = require("./renderer-util");

const byId = id => document.getElementById(id);

//
exports.openMatch = openMatch;
function openMatch(id) {
  const match = pd.match(id);
  if (!match) return;
  const deck = match.playerDeck;
  if (!deck) return;

  const mainDiv = byId("ux_1");
  mainDiv.classList.remove("flex_item");
  mainDiv.innerHTML = "";

  const tileGrpId = deck.deckTileId;
  if (db.card(tileGrpId)) {
    changeBackground("", tileGrpId);
  }

  const d = createDiv(["list_fill"]);
  mainDiv.appendChild(d);

  const top = createDiv(["decklist_top"]);
  top.appendChild(createDiv(["button", "back"]));
  top.appendChild(createDiv(["deck_name"], deck.name));

  const deckColors = createDiv(["deck_top_colors"]);
  deckColors.style.alignSelf = "center";
  if (deck.colors) {
    deck.colors.forEach(color => {
      const m = createDiv(["mana_s20", "mana_" + MANA[color]]);
      deckColors.appendChild(m);
    });
  }
  top.appendChild(deckColors);
  mainDiv.appendChild(top);

  const flc = createDiv(["flex_item"]);
  flc.style.justifyContent = "space-evenly";
  if (fs.existsSync(path.join(actionLogDir, id + ".txt"))) {
    const actionLogButton = createDiv(
      ["button_simple", "openLog"],
      "Action log"
    );
    actionLogButton.addEventListener("click", function() {
      openActionLog(id, mainDiv);
    });
    flc.appendChild(actionLogButton);
  }
  mainDiv.appendChild(flc);

  const fld = createDiv(["flex_item"]);
  const isLimited = db.ranked_events.includes(match.eventId);
  renderSeat(
    fld,
    match.player,
    match.playerDeck,
    match.player.win > match.opponent.win,
    isLimited
  );
  renderSeat(
    fld,
    match.opponent,
    match.oppDeck,
    match.opponent.win > match.player.win,
    isLimited,
    true
  );
  mainDiv.appendChild(fld);

  if (match.gameStats) {
    match.gameStats.forEach((game, gameIndex) => {
      if (game && game.sideboardChanges) {
        const separator1 = deckDrawer.cardSeparator(
          `Game ${gameIndex + 1} Sideboard Changes`
        );
        mainDiv.appendChild(separator1);
        const sideboardDiv = createDiv(["card_lists_list"]);
        const additionsDiv = createDiv(["cardlist"]);
        if (
          game.sideboardChanges.added.length == 0 &&
          game.sideboardChanges.removed.length == 0
        ) {
          const separator2 = deckDrawer.cardSeparator("No changes");
          additionsDiv.appendChild(separator2);
          sideboardDiv.appendChild(additionsDiv);
        } else {
          const separator3 = deckDrawer.cardSeparator("Sideboarded In");
          additionsDiv.appendChild(separator3);
          drawCardList(additionsDiv, game.sideboardChanges.added);
          sideboardDiv.appendChild(additionsDiv);
          const removalsDiv = createDiv(["cardlist"]);
          const separator4 = deckDrawer.cardSeparator("Sideboarded Out");
          removalsDiv.appendChild(separator4);
          drawCardList(removalsDiv, game.sideboardChanges.removed);
          sideboardDiv.appendChild(removalsDiv);
        }

        mainDiv.appendChild(sideboardDiv);
      }

      const separator5 = deckDrawer.cardSeparator(
        `Game ${gameIndex + 1} Hands Drawn`
      );
      mainDiv.appendChild(separator5);

      const handsDiv = createDiv(["card_lists_list"]);
      if (game && game.handsDrawn.length > 3) {
        // The default value of "center" apparently causes padding to be omitted in the calculation of how far
        // the scrolling should go. So, if there are enough hands to actually need scrolling, override it.
        handsDiv.style.justifyContent = "start";
      }

      if (game) {
        game.handsDrawn.forEach((hand, i) => {
          const handDiv = createDiv(["cardlist"]);
          drawCardList(handDiv, hand);
          handsDiv.appendChild(handDiv);
          let landText, landTooltip;
          if (game.bestOf === 1 && i === 0) {
            landText = "Land Percentile: Unknown";
            landTooltip = `This hand was drawn with weighted odds that
              Wizards of the Coast has not disclosed because it is the first
              hand in a best-of-one match. It should be more likely to have a
              close to average number of lands, but only they could calculate
              the exact odds.`;
          } else {
            const likelihood = hypergeometricSignificance(
              game.handLands[i],
              game.deckSize,
              hand.length,
              game.landsInDeck
            );
            landText =
              "Land Likelihood: " + (likelihood * 100).toFixed(2) + "%";
            landTooltip = `The probability of a random hand of the same size
              having a number of lands at least as far from average as this one,
              calculated as if the distribution were continuous. Over a large
              number of games, this should average about 50%.`;
          }
          const landDiv = createDiv([], landText);
          landDiv.setAttribute("tooltip-top", "");
          landDiv.setAttribute("tooltip-content", landTooltip);
          landDiv.style.margin = "auto";
          landDiv.style.textAlign = "center";
          handDiv.appendChild(landDiv);
        });

        mainDiv.appendChild(handsDiv);

        const separator6 = deckDrawer.cardSeparator(
          `Game ${gameIndex + 1} Shuffled Order`
        );
        mainDiv.appendChild(separator6);
        const libraryDiv = createDiv(["library_list"]);
        const unique = makeId(4);
        const handSize = 8 - game.handsDrawn.length;

        game.shuffledOrder.forEach((cardId, libraryIndex) => {
          const rowShades =
            libraryIndex === handSize - 1
              ? ["line_dark", "line_bottom_border"]
              : libraryIndex < handSize - 1
              ? ["line_dark"]
              : (libraryIndex - handSize) % 2 === 0
              ? ["line_light"]
              : ["line_dark"];
          const cardDiv = createDiv(["library_card", ...rowShades]);
          const tile = deckDrawer.cardTile(
            pd.settings.card_tile_style,
            cardId,
            unique + libraryIndex,
            "#" + (libraryIndex + 1)
          );
          cardDiv.appendChild(tile);
          libraryDiv.appendChild(cardDiv);
        });
        const unknownCards = game.deckSize - game.shuffledOrder.length;
        if (unknownCards > 0) {
          const cardDiv = createDiv(["library_card"]);
          const tile = deckDrawer.cardTile(
            pd.settings.card_tile_style,
            null,
            unique + game.deckSize,
            unknownCards + "x"
          );
          cardDiv.appendChild(tile);
          libraryDiv.appendChild(cardDiv);
        }

        const handExplanation = createDiv(
          ["library_hand"],
          "The opening hand is excluded from the below statistics to prevent mulligan choices from influencing them."
        );
        handExplanation.style.gridRowEnd = "span " + (handSize - 1);
        libraryDiv.appendChild(handExplanation);

        let headerDiv = createDiv(["library_header"], "Lands");
        headerDiv.setAttribute("tooltip-bottom", "");
        headerDiv.setAttribute(
          "tooltip-content",
          "The number of lands in the library at or before this point."
        );
        headerDiv.style.gridArea = handSize + " / 2";
        libraryDiv.appendChild(headerDiv);
        headerDiv = createDiv(["library_header"], "Expected");
        headerDiv.setAttribute("tooltip-bottom", "");
        headerDiv.setAttribute(
          "tooltip-content",
          "The average number of lands expected in the library at or before this point."
        );
        headerDiv.style.gridArea = handSize + " / 3";
        libraryDiv.appendChild(headerDiv);
        headerDiv = createDiv(["library_header"], "Likelihood");
        headerDiv.setAttribute("tooltip-bottom", "");
        headerDiv.setAttribute(
          "tooltip-content",
          "The probability of the number of lands being at least this far from average, calculated as if the distribution were continuous. For details see footnote. Over a large number of games, this should average about 50%."
        );
        headerDiv.style.gridArea = handSize + " / 4";
        libraryDiv.appendChild(headerDiv);
        headerDiv = createDiv(["library_header"], "Percentile");
        headerDiv.setAttribute("tooltip-bottomright", "");
        headerDiv.setAttribute(
          "tooltip-content",
          "The expected percentage of games where the actual number of lands is equal or less than this one. This is easier to calculate and more widely recognized but harder to assess the meaning of."
        );
        headerDiv.style.gridArea = handSize + " / 5";
        libraryDiv.appendChild(headerDiv);

        game.libraryLands.forEach((count, index) => {
          const rowShade = index % 2 === 0 ? "line_light" : "line_dark";
          const landsDiv = createDiv(["library_stat", rowShade], count);
          landsDiv.style.gridArea = handSize + index + 1 + " / 2";
          libraryDiv.appendChild(landsDiv);
          const expected = (
            ((index + 1) * game.landsInLibrary) /
            game.librarySize
          ).toFixed(2);
          const expectedDiv = createDiv(["library_stat", rowShade], expected);
          expectedDiv.style.gridArea = handSize + index + 1 + " / 3";
          libraryDiv.appendChild(expectedDiv);
          const likelihood = hypergeometricSignificance(
            count,
            game.librarySize,
            index + 1,
            game.landsInLibrary
          );
          const likelihoodDiv = createDiv(
            ["library_stat", rowShade],
            (likelihood * 100).toFixed(2)
          );
          likelihoodDiv.style.gridArea = handSize + index + 1 + " / 4";
          libraryDiv.appendChild(likelihoodDiv);
          const percentile = hypergeometricRange(
            0,
            count,
            game.librarySize,
            index + 1,
            game.landsInLibrary
          );
          const percentileDiv = createDiv(
            ["library_stat", rowShade],
            (percentile * 100).toFixed(2)
          );
          percentileDiv.style.gridArea = handSize + index + 1 + " / 5";
          libraryDiv.appendChild(percentileDiv);
        });

        const footnoteLabel = createDiv(
          ["library_footnote"],
          "Footnote on Likelihood",
          { id: "library_footnote_label" + gameIndex }
        );
        footnoteLabel.setAttribute("tooltip-bottom", "");
        footnoteLabel.setAttribute("tooltip-content", "Click to show footnote");
        footnoteLabel.addEventListener("click", function() {
          toggleVisibility("library_footnote" + gameIndex);
        });
        footnoteLabel.style.gridRow = game.shuffledOrder.length + 1;
        libraryDiv.appendChild(footnoteLabel);
        const footnoteText =
          "<p>The Likelihood column calculations are designed to enable assessment of fairness at a glance, in a way " +
          "that is related to percentile but differs in important ways. In short, it treats the count of lands as if " +
          "it were actually a bucket covering a continuous range, and calculates the cumulative probability of the " +
          "continuous value being at least as far from the median as a randomly selected value within the range covered " +
          "by the actual count. Importantly, this guarantees that the theoretical average will always be exactly 50%.</p>" +
          "<p>For values that are not the median, the result is halfway between the value's own percentile and the " +
          "next one up or down. For the median itself, the covered range is split and weighted for how much of it is " +
          "on each side of the 50th percentile. In both cases, the result's meaning is the same for each direction " +
          "from the 50th percentile, and scaled up by a factor of 2 to keep the possible range at 0% to 100%. " +
          "For precise details, see the source code on github.</p>";
        const footnote = createDiv(
          ["library_footnote", "hidden"],
          footnoteText,
          {
            id: "library_footnote" + gameIndex
          }
        );
        footnote.addEventListener("click", function() {
          toggleVisibility("library_footnote" + gameIndex);
        });
        footnote.style.gridRow = game.shuffledOrder.length + 1;
        footnote.style.marginTop = "24px";
        libraryDiv.appendChild(footnote);

        mainDiv.appendChild(libraryDiv);
      }
    });
  }

  $$(".back")[0].addEventListener("click", () => {
    changeBackground("default");
    anime({
      targets: ".moving_ux",
      left: 0,
      easing: "easeInOutCubic",
      duration: 350
    });
  });
}

//
function renderSeat(
  container,
  player,
  deck,
  isWinner,
  isLimited,
  isReverse = false
) {
  const playerName = player.name.slice(0, -6);
  const deckName = deck.name || playerName + "'s deck";

  const decklist = createDiv(["decklist"]);
  // drawDeck clears decklist content and must go first
  drawDeck(decklist, deck);

  const flt = createDiv(["flex_item"]);
  if (isReverse) {
    flt.style.flexDirection = "row-reverse";
  }

  const fltl = createDiv(["flex_item"]);
  const rank = player.rank;
  const tier = player.tier;
  const rankClass = isLimited ? "top_limited_rank" : "top_constructed_rank";
  const r = createDiv([rankClass], "", { title: rank + " " + tier });
  r.style.backgroundPosition = get_rank_index(rank, tier) * -48 + "px 0px";
  fltl.appendChild(r);
  flt.appendChild(fltl);

  const fltr = createDiv(["flex_item"]);
  fltr.style.flexDirection = "column";
  if (isReverse) {
    fltr.style.alignItems = "flex-end";
  }

  const fltrt = createDiv(["flex_top"]);
  const divClass = isReverse
    ? "list_match_player_right"
    : "list_match_player_left";
  const name = createDiv([divClass], `${playerName} (${player.win})`);
  fltrt.appendChild(name);
  fltr.appendChild(fltrt);

  const fltrb = createDiv(["flex_bottom"]);
  if (isWinner) {
    fltrb.appendChild(createDiv(["list_match_player_left", "green"], "Winner"));
  }
  fltr.appendChild(fltrb);
  flt.appendChild(fltr);

  decklist.insertBefore(flt, decklist.firstChild);

  const arenaExport = createDiv(
    ["button_simple", "centered", "exportDeckPlayer"],
    "Export to Arena"
  );
  arenaExport.addEventListener("click", function() {
    ipcSend("set_clipboard", get_deck_export(deck));
  });
  decklist.appendChild(arenaExport);

  const textExport = createDiv(
    ["button_simple", "centered", "exportDeckStandardPlayer"],
    "Export to .txt"
  );
  textExport.addEventListener("click", function() {
    const str = get_deck_export_txt(deck);
    ipcSend("export_txt", { str, name: deckName });
  });
  decklist.appendChild(textExport);

  container.appendChild(decklist);
}
