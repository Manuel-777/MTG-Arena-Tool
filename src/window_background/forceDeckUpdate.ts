import globals from "./globals";
import { hypergeometricRange } from "../shared/statsFns";
import { CardObject } from "../shared/types/Deck";
import { Chances } from "./types/decks";

function chanceType(
  quantity: number,
  cardsleft: number,
  oddsSampleSize: number
): number {
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

const forceDeckUpdate = function(removeUsed = true): void {
  let decksize = 0;
  let cardsleft = 0;
  let typeCre = 0;
  let typeIns = 0;
  let typeSor = 0;
  let typePla = 0;
  let typeArt = 0;
  let typeEnc = 0;
  let typeLan = 0;

  globals.currentMatch.playerCardsLeft = globals.currentMatch.player.deck.clone();

  if (globals.debugLog || !globals.firstPass) {
    globals.currentMatch.playerCardsLeft
      .getMainboard()
      .get()
      .forEach((card: CardObject) => {
        //card.total = card.quantity;
        decksize += card.quantity;
        cardsleft += card.quantity;
      });

    if (removeUsed) {
      cardsleft -= globals.currentMatch.playerCardsUsed.length;
      globals.currentMatch.playerCardsUsed.forEach((grpId: number) => {
        globals.currentMatch.playerCardsLeft.getMainboard().remove(grpId, 1);
      });
    }
    const main = globals.currentMatch.playerCardsLeft.getMainboard();
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

    const chancesObj: Chances = new Chances();
    chancesObj.sampleSize = globals.odds_sample_size;

    const landsCount = main.getLandsAmounts();
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
    const main = globals.currentMatch.playerCardsLeft.getMainboard();
    main.addChance(() => 1);

    const chancesObj = new Chances();
    globals.currentMatch.playerChances = chancesObj;
  }
};

export default forceDeckUpdate;
