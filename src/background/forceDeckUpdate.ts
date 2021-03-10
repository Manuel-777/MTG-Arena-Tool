import globals from "./globals";
import { hypergeometricRange } from "../shared/utils/statsFns";
import globalStore from "../shared/store";
import { setCardsOdds } from "../shared/store/currentMatchStore";
import { Chances, CardObject } from "mtgatool-shared";

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

const forceDeckUpdate = function (removeUsed = true): void {
  let decksize = 0;
  let cardsleft = 0;
  let typeCre = 0;
  let typeIns = 0;
  let typeSor = 0;
  let typePla = 0;
  let typeArt = 0;
  let typeEnc = 0;
  let typeLan = 0;
  const currentMatch = globalStore.currentMatch;
  const playerCardsUsed = currentMatch.player.cardsUsed;
  const playerCardsBottom = currentMatch.cardsBottom;
  const playerCardsFromSide = currentMatch.cardsFromSideboard;
  const playerCardsLeft = globalStore.currentMatch.currentDeck.clone();

  // Remove cards that came from the sideboard from the list of
  // cards used to remove from the mainboard.
  playerCardsFromSide.forEach((grpId) => {
    playerCardsUsed.splice(playerCardsUsed.indexOf(grpId) + 1, 1);
  });

  if (globals.debugLog || !globals.firstPass) {
    playerCardsLeft
      .getMainboard()
      .get()
      .forEach((card: CardObject) => {
        //card.total = card.quantity;
        decksize += card.quantity;
        cardsleft += card.quantity;
      });

    if (removeUsed) {
      cardsleft -= playerCardsUsed.length;
      playerCardsUsed.forEach((grpId: number) => {
        playerCardsLeft.getMainboard().remove(grpId, 1);
      });
      playerCardsFromSide.forEach((grpId: number) => {
        playerCardsLeft.getSideboard().remove(grpId, 1);
      });
    }
    // Remove cards that were put on the bottom
    playerCardsBottom.forEach((grpId: number) => {
      playerCardsLeft.getMainboard().remove(grpId, 1);
    });
    cardsleft -= playerCardsBottom.length;

    const main = playerCardsLeft.getMainboard();
    main.removeDuplicates();
    main.addChance((card: CardObject) =>
      Math.round(
        hypergeometricRange(
          1,
          Math.min(globals.oddsSampleSize, card.quantity),
          cardsleft,
          globals.oddsSampleSize,
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
    chancesObj.sampleSize = globals.oddsSampleSize;

    const landsCount = main.getLandsAmounts();
    chancesObj.landW = chanceType(
      landsCount.w,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.landU = chanceType(
      landsCount.u,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.landB = chanceType(
      landsCount.b,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.landR = chanceType(
      landsCount.r,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.landG = chanceType(
      landsCount.g,
      cardsleft,
      globals.oddsSampleSize
    );

    chancesObj.chanceCre = chanceType(
      typeCre,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.chanceIns = chanceType(
      typeIns,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.chanceSor = chanceType(
      typeSor,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.chancePla = chanceType(
      typePla,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.chanceArt = chanceType(
      typeArt,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.chanceEnc = chanceType(
      typeEnc,
      cardsleft,
      globals.oddsSampleSize
    );
    chancesObj.chanceLan = chanceType(
      typeLan,
      cardsleft,
      globals.oddsSampleSize
    );

    chancesObj.deckSize = decksize;
    chancesObj.cardsLeft = cardsleft;
    setCardsOdds(chancesObj);

    // Add that that were put on the bottom again, so it
    // doesnt affect the display of the decklist
    playerCardsBottom.forEach((grpId: number) => {
      playerCardsLeft.getMainboard().add(grpId, 1);
    });
    cardsleft += playerCardsBottom.length;
  } else {
    const main = playerCardsLeft.getMainboard();
    main.addChance(() => 1);
    const chancesObj = new Chances();
    setCardsOdds(chancesObj);
  }

  globalStore.currentMatch.cardsLeft = playerCardsLeft;
};

export default forceDeckUpdate;
