import db from "../shared/database-wrapper";
import {
  InternalDeck, InternalMatch,
} from "mtgatool-shared";
import globalStore from "../shared/store";

export default function getClosestMatch(oppDeck: InternalDeck): InternalMatch | undefined {
  const cards = oppDeck.mainDeck.map(d => {
    const cardData = db.card(d.id);
    return cardData?.name;
  }).filter(d => d);

  let ret: InternalMatch | undefined = undefined;
  let degree = 2;
  let date = "";
  for (const i in globalStore.matches) {
    const match = globalStore.matches[i];
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
