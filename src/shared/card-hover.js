import db from "./database";
import pd from "./player-data";
import { cardHasType } from "./card-types.js";
import { createDiv, queryElements as $$ } from "./dom-fns";
import { getCardImage } from "./util";
import { DRAFT_RANKS, FACE_DFC_BACK, FACE_DFC_FRONT } from "./constants.js";

let renderer = 0;

export const setRenderer = value => {
  renderer = value;
};

export function addCardHover(element, card) {
  if (!card || !card.images || card.type == "Special") return;

  element.addEventListener("mouseover", () => {
    $$(".loader, .main_hover").forEach(element => (element.style.opacity = 1));

    // Split cards are readable both halves, no problem
    if (
      (card.dfc == FACE_DFC_BACK || card.dfc == FACE_DFC_FRONT) &&
      renderer == 0
    ) {
      $$(".loader_dfc, .main_hover_dfc").forEach(el => {
        show(el);
        el.style.opacity = 1;
      });

      const dfcCard = db.card(card.dfcId);
      const dfcCardImage = getCardImage(dfcCard);

      const dfcImageElement = $$(".main_hover_dfc")[0];
      dfcImageElement.src = dfcCardImage;
      dfcImageElement.addEventListener("load", () => {
        $$(".loader_dfc").forEach(el => (el.style.opacity = 0));
      });
    } else {
      $$(".main_hover_dfc, .loader_dfc").forEach(hide);
    }

    const mainImageElement = $$(".main_hover")[0];
    mainImageElement.src = getCardImage(card);
    mainImageElement.addEventListener("load", () => {
      $$(".loader").forEach(el => (el.style.opacity = 0));
    });

    // show card quantity
    if (renderer == 0) {
      attachOwnerhipStars(card, $$(".hover_card_quantity")[0]);
    }

    if (renderer == 2) {
      attachDraftRatings(card, $$(".main_hover_ratings")[0]);
    } else {
      $$(".main_hover_ratings").forEach(
        element => (element.style.display = "none")
      );
    }
  });

  element.addEventListener("mouseleave", () => {
    $$(
      ".hover_card_quantity, .main_hover, .main_hover_ratings, .main_hover_dfc, .loader, .loader_dfc"
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

export function attachOwnerhipStars(card, starContainer) {
  const isbasic = cardHasType(card, "Basic Land");
  starContainer.innerHTML = "";
  starContainer.style.opacity = 1;

  const owned = pd.cards.cards[card.id];
  const acquired = pd.cardsNew[card.id];

  if (isbasic) {
    // Show infinity for basics (should work for rats and petitioners?)
    if (owned > 0) starContainer.title = `∞ copies in collection`;
    else starContainer.title = `0 copies in collection`;
    if (acquired) {
      starContainer.title += ` (∞ recent)`;
    }

    let color = "gray";
    if (owned > 0) color = "green";
    if (acquired > 0) color = "orange";

    starContainer.appendChild(createDiv([`inventory_card_infinity_${color}`]));
  } else {
    starContainer.title = `${owned || 0}/4 copies in collection`;
    if (acquired) {
      starContainer.title += ` (${acquired} recent)`;
    }

    for (let i = 0; i < 4; i++) {
      let color = "gray";

      if (i < owned) color = "green";
      if (acquired && i >= owned - acquired && i < owned) color = "orange";

      starContainer.appendChild(
        createDiv([`inventory_card_quantity_${color}`])
      );
    }
  }
}

export function attachDraftRatings(card, ratingsContainer) {
  ratingsContainer.innerHTML = "";
  ratingsContainer.style.opacity = 1;
  ratingsContainer.style.display = "flex";

  const rank = card.rank;
  const rankValues = card.rank_values;
  const rankControversy = card.rank_controversy;

  const maxValue = Math.max.apply(Math, card.rank_values);

  const valuesContainer = createDiv([`rank_values_main_container`]);

  const rankCont = createDiv(
    [`rank_value_container`],
    `Rank: ${DRAFT_RANKS[Math.round(rank)]}`
  );
  valuesContainer.appendChild(rankCont);
  const controversyCont = createDiv(
    [`rank_value_container`],
    `Controversy: ${rankControversy}`
  );
  valuesContainer.appendChild(controversyCont);

  rankValues.forEach((v, index) => {
    const rv = 12 - index;
    const rank = DRAFT_RANKS[rv];

    let colorClass = "white";
    if (rank == "A+" || rank == "A") colorClass = "blue";
    if (rank == "A-" || rank == "B+" || rank == "B") colorClass = "green";
    if (rank == "C-" || rank == "D+" || rank == "D") colorClass = "orange";
    if (rank == "D-" || rank == "F") colorClass = "red";

    const divCont = createDiv([`rank_value_container`]);
    const divTitle = createDiv([`rank_value_title`, colorClass], rank);
    const divBar = createDiv([`rank_value_bar`]);
    divBar.style.width = (240 / maxValue) * v + "px";

    divCont.appendChild(divTitle);
    divCont.appendChild(divBar);
    valuesContainer.appendChild(divCont);
  });

  ratingsContainer.appendChild(valuesContainer);
}
