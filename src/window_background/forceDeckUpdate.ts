import globals from "./globals";
import { hypergeometricRange } from "../shared/stats-fns";
import { CardObject } from "../shared/types/Deck";

class Chances {
  sampleSize: number;
  landW: number;
  landU: number;
  landB: number;
  landR: number;
  landG: number;
  chanceCre: number;
  chanceIns: number;
  chanceSor: number;
  chancePla: number;
  chanceArt: number;
  chanceEnc: number;
  chanceLan: number;
  deckSize: number;
  cardsLeft: number;

  constructor() {
    this.sampleSize = 0;
    this.landW = 0;
    this.landU = 0;
    this.landB = 0;
    this.landR = 0;
    this.landG = 0;
    this.chanceCre = 0;
    this.chanceIns = 0;
    this.chanceSor = 0;
    this.chancePla = 0;
    this.chanceArt = 0;
    this.chanceEnc = 0;
    this.chanceLan = 0;
    this.deckSize = 0;
    this.cardsLeft = 0;
  }
}

const forceDeckUpdate = function (removeUsed = true) {
  var decksize = 0;
  var cardsleft = 0;
  var typeCre = 0;
  var typeIns = 0;
  var typeSor = 0;
  var typePla = 0;
  var typeArt = 0;
  var typeEnc = 0;
  var typeLan = 0;

  globals.currentMatch.playerCardsLeft = globals.currentMatch.player.deck.clone();

  if (globals.debugLog || !globals.firstPass) {
    globals.currentMatch.playerCardsLeft.mainboard.get().forEach((card: CardObject) => {
      //card.total = card.quantity;
      decksize += card.quantity;
      cardsleft += card.quantity;
    });

    if (removeUsed) {
      cardsleft -= globals.currentMatch.playerCardsUsed.length;
      globals.currentMatch.playerCardsUsed.forEach((grpId: number) => {
        globals.currentMatch.playerCardsLeft.mainboard.remove(grpId, 1);
      });
    }
    let main = globals.currentMatch.playerCardsLeft.mainboard;
    //main.addProperty("chance", card =>
    main.addChance((card: CardObject) =>
      Math.round(
        hypergeometricRange(
          1,
          Math.min(globals.odds_sample_size, card.quantity),
          cardsleft,
          globals.odds_sample_size,
          card.quantity
        ) * 100
      )
    );

    typeLan = main.countType("Land");
    typeCre = main.countType("Creature");
    typeArt = main.countType("Artifact");
    typeEnc = main.countType("Enchantment");
    typeIns = main.countType("Instant");
    typeSor = main.countType("Sorcery");
    typePla = main.countType("Planeswalker");

    let chancesObj: Chances = new Chances();
    chancesObj.sampleSize = globals.odds_sample_size;

    let landsCount = main.getLandsAmounts();
    chancesObj.landW = chanceType(
      landsCount.w,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.landU = chanceType(
      landsCount.u,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.landB = chanceType(
      landsCount.b,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.landR = chanceType(
      landsCount.r,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.landG = chanceType(
      landsCount.g,
      cardsleft,
      globals.odds_sample_size
    );

    chancesObj.chanceCre = chanceType(
      typeCre,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.chanceIns = chanceType(
      typeIns,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.chanceSor = chanceType(
      typeSor,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.chancePla = chanceType(
      typePla,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.chanceArt = chanceType(
      typeArt,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.chanceEnc = chanceType(
      typeEnc,
      cardsleft,
      globals.odds_sample_size
    );
    chancesObj.chanceLan = chanceType(
      typeLan,
      cardsleft,
      globals.odds_sample_size
    );

    chancesObj.deckSize = decksize;
    chancesObj.cardsLeft = cardsleft;
    globals.currentMatch.playerChances = chancesObj;
  } else {
    let main = globals.currentMatch.playerCardsLeft.mainboard;
    main.addChance((card: CardObject) => 1);

    let chancesObj = new Chances();
    globals.currentMatch.playerChances = chancesObj;
  }
};

function chanceType(quantity: number, cardsleft: number, oddsSampleSize: number) {
  return (
    Math.round(
      hypergeometricRange(
        1,
        Math.min(oddsSampleSize, quantity),
        cardsleft,
        oddsSampleSize,
        quantity
      ) * 1000
    ) / 10
  );
}

export default forceDeckUpdate;
