const db = require("../shared/database");
const pd = require("../shared/player-data");
const { createDivision, queryElements: $$ } = require("../shared/dom-fns");
const { get_card_image } = require("../shared/util");

let renderer = 0;

exports.setRenderer = value => {
  renderer = value;
};

// Attaches a hover event to any DOM element.
// Howver over the element with the mouse pops up
// card info for `card`
exports.addCardHover = addCardHover;
function addCardHover(element, card) {
  if (!card || !card.images || card.type == "Special") return;

  element.addEventListener("mouseover", () => {
    $$(".loader, .main_hover").forEach(element => (element.style.opacity = 1));

    // Split cards are readable both halves, no problem
    if (card.dfc != "None" && card.dfc != "SplitHalf" && renderer == 0) {
      $$(".loader_dfc, .main_hover_dfc").forEach(el => {
        show(el);
        el.style.opacity = 1;
      });

      var dfcCard = db.card(card.dfcId);
      var dfcCardImage = get_card_image(dfcCard);

      var dfcImageElement = $$(".main_hover_dfc")[0];
      dfcImageElement.src = dfcCardImage;
      dfcImageElement.addEventListener("load", () => {
        $$(".loader_dfc").forEach(el => (el.style.opacity = 0));
      });
    } else {
      $$(".main_hover_dfc, .loader_dfc").forEach(hide);
    }

    var mainImageElement = $$(".main_hover")[0];
    mainImageElement.src = get_card_image(card);
    mainImageElement.addEventListener("load", () => {
      $$(".loader").forEach(el => (el.style.opacity = 0));
    });

    // show card quantity
    if (renderer == 0) {
      attachOwnerhipStars(card, $$(".hover_card_quantity")[0]);
    }
  });

  element.addEventListener("mouseleave", () => {
    $$(
      ".hover_card_quantity, .main_hover, .main_hover_dfc, .loader, .loader_dfc"
    ).forEach(element => (element.style.opacity = 0));
  });
}

function show(element, mode) {
  if (!mode) {
    mode = "block";
  }
  element.style.display = mode;
  return element;
}

function hide(element) {
  element.style.display = "none";
  return element;
}

exports.attachOwnerhipStars = attachOwnerhipStars;
function attachOwnerhipStars(card, starContainer) {
  starContainer.innerHTML = "";
  starContainer.style.opacity = 1;

  const owned = pd.cards.cards[card.id];
  const aquired = pd.cardsNew[card.id];
  starContainer.title = `${owned}/4 copies in collection`;
  if (aquired) {
    starContainer.title += ` (${aquired} recent)`;
  }

  for (let i = 0; i < 4; i++) {
    let color = "gray";

    if (i < owned) color = "green";
    if (aquired && i >= owned - aquired && i < owned) color = "orange";

    starContainer.appendChild(
      createDivision([`inventory_card_quantity_${color}`])
    );
  }
}
