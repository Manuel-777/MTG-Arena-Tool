import globals from "./globals";
import { hypergeometricRange } from "../shared/stats-fns";

function chanceType(quantity, cardsleft, odds_sample_size) {
  return (
    Math.round(
      hypergeometricRange(
        1,
        Math.min(odds_sample_size, quantity),
        cardsleft,
        odds_sample_size,
        quantity
      ) * 1000
    ) / 10
  );
}

const forceDeckUpdate = function(removeUsed = true) {
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
    globals.currentMatch.playerCardsLeft.mainboard.get().forEach(card => {
      card.total = card.quantity;
      decksize += card.quantity;
      cardsleft += card.quantity;
    });

    if (removeUsed) {
      cardsleft -= globals.currentMatch.playerCardsUsed.length;
      globals.currentMatch.playerCardsUsed.forEach(grpId => {
        globals.currentMatch.playerCardsLeft.mainboard.remove(grpId, 1);
      });
    }
    const main = globals.currentMatch.playerCardsLeft.mainboard;
    main.map(
      card =>
        (card.chance = Math.round(
          hypergeometricRange(
            1,
            Math.min(globals.odds_sample_size, card.quantity),
            cardsleft,
            globals.odds_sample_size,
            card.quantity
          ) * 100
        ))
    );

    typeLan = main.countType("Land");
    typeCre = main.countType("Creature");
    typeArt = main.countType("Artifact");
    typeEnc = main.countType("Enchantment");
    typeIns = main.countType("Instant");
    typeSor = main.countType("Sorcery");
    typePla = main.countType("Planeswalker");

    const chancesObj = { sampleSize: globals.odds_sample_size };

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
    const main = globals.currentMatch.playerCardsLeft.mainboard;
    main.map(card => (card.chance = 1));

    const chancesObj = {};
    chancesObj.landW = 0;
    chancesObj.landU = 0;
    chancesObj.landB = 0;
    chancesObj.landR = 0;
    chancesObj.landG = 0;
    chancesObj.chanceCre = 0;
    chancesObj.chanceIns = 0;
    chancesObj.chanceSor = 0;
    chancesObj.chancePla = 0;
    chancesObj.chanceArt = 0;
    chancesObj.chanceEnc = 0;
    chancesObj.chanceLan = 0;
    globals.currentMatch.playerChances = chancesObj;
  }
};

export default forceDeckUpdate;
