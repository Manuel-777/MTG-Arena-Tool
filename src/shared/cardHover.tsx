import * as React from "react";
import * as ReactDOM from "react-dom";

import db from "./database";
import { queryElements as $$ } from "./dom-fns";
import { getCardImage } from "./util";
import { FACE_DFC_BACK, FACE_DFC_FRONT } from "./constants";
import OwnershipStars from "./OwnershipStars";
import { DbCardData } from "./types/Metadata";

// controls when to auto-hide hover display
// workaround for edge case bugs that cause hover to "get stuck"
const MAX_HOVER_TIME = 10000; // 10 seconds

let lastHoverStart: number | undefined = undefined;

export function attachOwnerhipStars(
  card: false | DbCardData,
  starContainer: HTMLDivElement
): void {
  if (!card) {
    return;
  }

  starContainer.style.opacity = "1";
  ReactDOM.render(<OwnershipStars card={card} />, starContainer);
}

export function addCardHover(element: HTMLElement, card?: DbCardData): void {
  if (!card) return;

  const dbCard = card;
  if (!dbCard.images || dbCard.type === "Special") return;

  const hideHover = (): void => {
    $$(
      ".hover_card_quantity, .main_hover, .main_hover_ratings, .main_hover_dfc, .loader, .loader_dfc"
    ).forEach((element: HTMLElement) => (element.style.opacity = "0"));
    lastHoverStart = undefined;
  };

  element.addEventListener("mouseover", () => {
    $$(".loader, .main_hover").forEach(
      (element: HTMLElement) => (element.style.opacity = "1")
    );
    // Split cards are readable both halves, no problem
    if (
      dbCard.dfcId &&
      (dbCard.dfc === FACE_DFC_BACK || dbCard.dfc === FACE_DFC_FRONT)
    ) {
      $$(".loader_dfc, .main_hover_dfc").forEach((el: HTMLElement) => {
        el.style.display = "block";
        el.style.opacity = "1";
      });

      const dfcCard = db.card(dbCard.dfcId);
      const dfcCardImage = getCardImage(dfcCard);

      const dfcImageElement = $$(".main_hover_dfc")[0];
      dfcImageElement.src = dfcCardImage;
      dfcImageElement.addEventListener("load", () => {
        $$(".loader_dfc").forEach(
          (el: HTMLElement) => (el.style.opacity = "0")
        );
      });
    } else {
      $$(".main_hover_dfc, .loader_dfc").forEach(
        (el: HTMLElement) => (el.style.display = "none")
      );
    }

    const mainImageElement = $$(".main_hover")[0];
    mainImageElement.src = getCardImage(dbCard);
    mainImageElement.addEventListener("load", () => {
      $$(".loader").forEach((el: HTMLElement) => (el.style.opacity = "0"));
    });

    // show card quantity
    attachOwnerhipStars(dbCard, $$(".hover_card_quantity")[0]);

    lastHoverStart = Date.now();
    setTimeout(() => {
      if (lastHoverStart && Date.now() - lastHoverStart > MAX_HOVER_TIME) {
        hideHover();
      }
    }, MAX_HOVER_TIME + 1);
  });

  element.addEventListener("mouseleave", hideHover);
}
