import anime from 'animejs';
import { DRAFT_RANKS, EASING_DEFAULT, PACK_SIZES } from 'common/constants';
import db from 'common/database';
import pd from 'common/player-data';
import { createDiv, createImg, createInput, queryElements as $$ } from 'common/dom-fns';
import { addCardHover } from 'common/card-hover';
import { getCardImage } from 'common/util';
import { changeBackground } from './renderer-util';

const byId = id => document.getElementById(id);

function getPickData(draft, draftPosition) {
  const packSize = PACK_SIZES[draft.set] || 14;
  const pa = Math.floor((draftPosition - 1) / 2 / packSize);
  const pi = Math.floor(((draftPosition - 1) / 2) % packSize);
  const key = "pack_" + pa + "pick_" + pi;
  const pack = (draft[key] && draft[key].pack) || [];
  const pick = (draft[key] && draft[key].pick) || "";
  return { pa, pi, key, pack, pick };
}

function getPickedCards(draft, draftPosition) {
  const cards = [];
  for (let n = 0; n <= draftPosition; n += 2) {
    const { pick } = getPickData(draft, n);
    const card = db.card(pick);
    if (card) {
      cards.push(card);
    }
  }
  return cards;
}

let arrowsChange = null;
export { openDraft };
function openDraft(id, draftPosition = 1) {
  // console.log("OPEN DRAFT", id, draftPosition);
  const draft = pd.draft(id);
  if (!draft) return;

  const container = byId("ux_1");
  container.innerHTML = "";
  container.classList.remove("flex_item");
  container.appendChild(createDiv(["list_fill"]));

  const tileGrpid = db.sets[draft.set].tile;
  if (db.card(tileGrpid)) {
    changeBackground("", tileGrpid);
  }

  const packSize = PACK_SIZES[draft.set] || 14;
  if (draftPosition < 1) draftPosition = packSize * 6;
  if (draftPosition > packSize * 6) draftPosition = 1;
  const { pa, pi, pack, pick } = getPickData(draft, draftPosition);

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

  window.addEventListener("keydown", function(event) {
    const key = event.key;
    console.log(key);
    if (key == "ArrowLeft") {
      draftPosition -= 1;
      openDraft(id, draftPosition);
    } else if (key == "ArrowRight") {
      draftPosition += 1;
      openDraft(id, draftPosition);
    }
    window.removeEventListener("keydown", arguments.callee);
  });

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

  const cardsCont = createDiv(["flex_item"]);

  const pdiv = createDiv(["draft_pack_container"]);
  pack.forEach(grpId => {
    const card = db.card(grpId);
    const d = createDiv(["draft_card"]);
    d.style.width = pd.cardsSize + "px";

    const img = createImg(["draft_card_img"], "", {
      src: getCardImage(card)
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
  cardsCont.appendChild(pdiv);

  const sz = pd.cardsSize;
  const pickedCards = getPickedCards(draft, draftPosition);
  const sideDiv = createDiv(["draft_pack_container"]);
  sideDiv.style.paddingLeft = "0";
  sideDiv.style.paddingRight = "72px";
  sideDiv.style.alignContent = "start";
  sideDiv.style.width = sz + 60 + "px";
  sideDiv.style.minWidth = sz + 60 + "px";
  pickedCards.forEach((card, _n) => {
    if (!card) return;
    let dfc = "";
    if (card.dfc === "DFC_Back") dfc = "a";
    if (card.dfc === "DFC_Front") dfc = "b";
    if (card.dfc === "SplitHalf") dfc = "a";
    if (dfc !== "b") {
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

      sideDiv.appendChild(d);
    }
  });
  cardsCont.appendChild(sideDiv);

  cont.appendChild(cardsCont);
  container.appendChild(cont);

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
