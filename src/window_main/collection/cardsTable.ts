import db from "../../shared/database";
import pd from "../../shared/player-data";
import { createDiv } from "../../shared/dom-fns";
import { addCardHover, attachOwnerhipStars } from "../../shared/cardHover";
import { getCardImage, openScryfallCard } from "../../shared/util";
import { DbCardData } from "../../shared/types/Metadata";

export function createCardsTable(
  container: HTMLElement,
  cardIds: (string | number)[],
  addCardMenu: (div: HTMLElement, card: DbCardData) => void,
  pageIndex = 0,
  pageSize = 100
): void {
  container.innerHTML = "";
  container.style.display = "flex";

  const paging = createDiv(["paging_container"]);
  container.appendChild(paging);

  function openCollectionPage(newPage: number): void {
    createCardsTable(container, cardIds, addCardMenu, newPage);
  }

  const minCardIndex = pageIndex * pageSize;
  const maxCardIndex = Math.min(minCardIndex + pageSize, cardIds.length);

  for (let n = minCardIndex; n < maxCardIndex; n++) {
    const grpId = cardIds[n];
    const card = db.card(grpId);
    if (!card || !card.images || !card.collectible) {
      continue;
    }

    const cardDiv = createDiv(["inventory_card"]);
    cardDiv.style.width = pd.cardsSize + "px";
    attachOwnerhipStars(card, cardDiv);
    cardDiv.title = card.name;

    const img = document.createElement("img");
    img.style.width = pd.cardsSize + "px";
    img.classList.add("inventory_card_img");
    img.src = getCardImage(card);

    cardDiv.appendChild(img);

    //Don't show card hover, if collection card size is over 340px
    if (!(pd.cardsSize >= 340)) {
      addCardHover(img, card);
    }

    img.addEventListener("click", () => {
      openScryfallCard(card);
    });

    addCardMenu(img, card);

    container.appendChild(cardDiv);
  }

  const pagingBottom = createDiv(["paging_container"]);
  container.appendChild(pagingBottom);
  let but, butClone;
  if (pageIndex <= 0) {
    but = createDiv(["paging_button_disabled"], " < ");
    butClone = but.cloneNode(true);
  } else {
    but = createDiv(["paging_button"], " < ");

    but.addEventListener("click", () => {
      openCollectionPage(pageIndex - 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      openCollectionPage(pageIndex + 1);
    });
  }

  paging.appendChild(but);
  pagingBottom.appendChild(butClone);

  const totalPages = Math.ceil(cardIds.length / pageSize);
  for (let n = 0; n < totalPages; n++) {
    but = createDiv(["paging_button"], String(n + 1));
    if (pageIndex == n) {
      but.classList.add("paging_active");
    }

    const page = n;
    but.addEventListener("click", () => {
      openCollectionPage(page);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      openCollectionPage(page);
    });

    paging.append(but);
    pagingBottom.append(butClone);
  }
  if (pageIndex >= totalPages - 1) {
    but = createDiv(["paging_button_disabled"], " > ");
    butClone = but.cloneNode(true);
  } else {
    but = createDiv(["paging_button"], " > ");
    but.addEventListener("click", () => {
      openCollectionPage(pageIndex + 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      openCollectionPage(pageIndex + 1);
    });
  }
  paging.appendChild(but);
  pagingBottom.appendChild(butClone);
}
