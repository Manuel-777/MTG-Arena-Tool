import db from "../shared/database-wrapper";
import {
  InternalDeck, InternalMatch,
} from "mtgatool-shared";
import globalStore from "../shared/store";

function isLimited(format: string): boolean {
  if(!format) {
    return false;
  }
  return format.indexOf("Draft") !== -1 || format.indexOf("Sealed") !== -1;
}

function isBrawl(format: string): boolean {
  if(!format) {
    return false;
  }
  return format.indexOf("Brawl") !== -1;
}

export default function getClosestMatch(oppDeck: InternalDeck): InternalMatch | undefined {
  const limited = isLimited(oppDeck.format);
  const brawl = isBrawl(oppDeck.format);
  const cards = oppDeck.mainDeck.map(d => {
    const cardData = db.card(d.id);
    return cardData?.name;
  }).filter(d => d);

  let ret: InternalMatch | undefined = undefined;
  let degree = 2;
  let date = "";
  for (const i in globalStore.matches) {
    const match = globalStore.matches[i];
    if(limited && !isLimited(match.oppDeck.format)) {
      continue;
    }
    if(brawl && !isBrawl(match.oppDeck.format)) {
      continue;
    }

    const matchCards = match.oppDeck.mainDeck.map(d => {
      const cardData = db.card(d.id);
      return cardData?.name;
    });

    const count = cards.filter(d => matchCards.indexOf(d) !== -1).length;
    if(count > degree || count === degree && date < match.date) {
      ret = match;
      degree = count;
      date = match.date;
    }
  }
  return ret;
}
