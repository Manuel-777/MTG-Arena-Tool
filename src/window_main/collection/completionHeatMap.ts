import { CARD_RARITIES } from "../../shared/constants";
import db from "../../shared/database";
import { createDiv } from "../../shared/dom-fns";
import { addCardHover } from "../../shared/cardHover";
import {
  MULTI,
  COLORLESS,
  WHITE,
  BLUE,
  BLACK,
  GREEN,
  RED
} from "../../shared/constants";

import { CardStats } from "./collectionStats";

export default function createHeatMap(
  container: HTMLElement,
  cardData: { [key: string]: CardStats[] }[],
  setName: string
): void {
  const label = document.createElement("label");
  const iconSvg = db.sets[setName]?.svg ?? db.defaultSet?.svg;
  const setIcon = createDiv(["stats_set_icon"]);
  setIcon.style.display = "inline-block";
  setIcon.style.backgroundImage = iconSvg
    ? `url(data:image/svg+xml;base64,${iconSvg})`
    : "url(../images/notfound.png)";
  const setIconSpan = document.createElement("span");
  setIconSpan.innerHTML = setName;
  setIcon.appendChild(setIconSpan);
  container.appendChild(setIcon);
  label.appendChild(setIcon);
  container.appendChild(label);

  const table = createDiv(["completion_table"]);
  for (let color = 0; color < 7; color++) {
    let tile = "";
    switch (color + 1) {
      case WHITE:
        tile = "mana_white";
        break;
      case BLUE:
        tile = "mana_blue";
        break;
      case BLACK:
        tile = "mana_black";
        break;
      case RED:
        tile = "mana_red";
        break;
      case GREEN:
        tile = "mana_green";
        break;
      case COLORLESS:
        tile = "mana_colorless";
        break;
      case MULTI:
        tile = "mana_multi";
        break;
    }

    const cell = createDiv(["completion_table_color_title", tile]);
    cell.style.gridArea = `1 / ${color * 5 + 1} / auto / ${color * 5 + 6}`;
    table.appendChild(cell);

    CARD_RARITIES.filter(rarity => rarity !== "land").forEach(rarityCode => {
      const rarityIndex = CARD_RARITIES.indexOf(rarityCode);
      const rarity = rarityCode.toLowerCase();
      const cell = createDiv(["completion_table_rarity_title", rarity]);
      cell.title = rarity;
      cell.style.gridArea = `2 / ${color * 5 +
        1 +
        rarityIndex} / auto / ${color * 5 + 1 + rarityIndex}`;
      table.appendChild(cell);

      // A little hacky to use "c + 1"..
      if (cardData[color + 1]) {
        const cardsArray = cardData[color + 1][rarity];
        if (cardsArray) {
          cardsArray.forEach((card, index) => {
            const dbCard = db.card(card.id);
            const classes = ["completion_table_card", "n" + card.owned];
            if (card.wanted > 0) classes.push("wanted");
            const cell = createDiv(classes, String(card.owned));
            cell.style.gridArea = `${index + 3} / ${color * 5 +
              1 +
              rarityIndex} / auto / ${color * 5 + 1 + rarityIndex}`;
            table.appendChild(cell);

            addCardHover(cell, dbCard);
          });
        }
      }
    });
  }
  container.appendChild(table);
}
