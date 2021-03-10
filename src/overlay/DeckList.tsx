import React from "react";
import CardTile, { LandsTile, CardTileQuantity } from "../shared/CardTile";
import {
  constants,
  Colors,
  compareCards,
  Deck,
  Chances,
  CardObject,
  OverlaySettingsData,
} from "mtgatool-shared";
import db from "../shared/database-wrapper";
import DeckManaCurve from "../shared/ManaCurve";
import DeckTypesStats from "../shared/TypesStats";
import OwnershipStars from "../shared/OwnershipStars";
import SampleSizePanel from "./SampleSizePanel";
import { getCardTypeSort } from "../shared/utils/getCardTypeSort";
import css from "./index.css";

const {
  DRAFT_RANKS,
  DRAFT_RANKS_LOLA,
  OVERLAY_DRAFT,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_MIXED,
  OVERLAY_ODDS,
  LANDS_HACK,
} = constants;

function getRank(cardId: number): number {
  const cardObj = db.card(cardId);
  return cardObj?.rank || 0;
}

function compareQuantity(a: CardObject, b: CardObject): -1 | 0 | 1 {
  if (b.quantity - a.quantity < 0) return -1;
  if (b.quantity - a.quantity > 0) return 1;
  return 0;
}

function compareDraftPicks(a: CardObject, b: CardObject): -1 | 0 | 1 {
  const aCard = db.card(a.id);
  const bCard = db.card(b.id);
  if (bCard === undefined) {
    return -1;
  } else if (aCard === undefined) {
    return 1;
  }
  const aColors = new Colors();
  if (aCard.cost) {
    aColors.addFromCost(aCard.cost);
  }
  const bColors = new Colors();
  if (bCard.cost) {
    bColors.addFromCost(bCard.cost);
  }
  const aType = getCardTypeSort(aCard.type);
  const bType = getCardTypeSort(bCard.type);

  const rankDiff =
    aCard.source == 0 ? bCard.rank - aCard.rank : aCard.rank - bCard.rank;
  const colorsLengthDiff = aColors.length - bColors.length;
  const cmcDiff = aCard.cmc - bCard.cmc;
  const typeDiff = aType - bType;
  const localeCompare = aCard.name.localeCompare(bCard.name);
  const compare =
    rankDiff || colorsLengthDiff || cmcDiff || typeDiff || localeCompare;

  if (compare < 0) {
    return -1;
  }
  if (compare > 0) {
    return 1;
  }
  return 0;
}

interface DeckListProps {
  deck: Deck;
  subTitle: string;
  highlightCardId?: number;
  settings: OverlaySettingsData;
  cardOdds?: Chances;
  setOddsCallback?: (sampleSize: number) => void;
}

export default function DeckList(props: DeckListProps): JSX.Element {
  const {
    deck,
    subTitle,
    settings,
    highlightCardId,
    cardOdds,
    setOddsCallback,
  } = props;
  if (!deck) return <></>;
  const deckClone = deck.clone();

  let sortFunc = compareCards;
  if (settings.mode === OVERLAY_ODDS || settings.mode == OVERLAY_MIXED) {
    sortFunc = compareQuantity;
  } else if (settings.mode === OVERLAY_DRAFT) {
    sortFunc = compareDraftPicks;
  }

  const mainCardTiles: JSX.Element[] = [];
  const mainCards = deckClone.getMainboard();
  mainCards.removeDuplicates();

  const shouldDoGroupLandsHack =
    settings.lands &&
    [OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
      settings.mode
    );

  let landsNumber = 0;
  const landsColors = new Colors();
  mainCards.get().forEach((card: CardObject) => {
    const cardObj = db.card(card.id);
    if (cardObj && cardObj.type.includes("Land", 0)) {
      landsNumber += card.quantity;
      if (cardObj.frame) {
        landsColors.addFromArray(cardObj.frame);
      }
    }
  });
  const landsFrame = landsColors.get();

  let landsQuantity: CardTileQuantity = landsNumber;
  if (settings.mode === OVERLAY_MIXED) {
    landsQuantity = {
      quantity: landsNumber,
      odds: ((cardOdds?.chanceLan || 0) / 100).toLocaleString([], {
        style: "percent",
        maximumSignificantDigits: 2,
      }),
    };
  } else if (settings.mode === OVERLAY_ODDS) {
    landsQuantity = ((cardOdds?.chanceLan || 0) / 100).toLocaleString([], {
      style: "percent",
      maximumSignificantDigits: 2,
    });
  }

  if (shouldDoGroupLandsHack) {
    mainCards.add(LANDS_HACK, 1, true);
  }
  mainCards.get().sort(sortFunc);
  mainCards.get().forEach((card: CardObject, index: number) => {
    if (card.id === LANDS_HACK) {
      mainCardTiles.push(
        <LandsTile
          key={"maincardtile_" + index + "_lands"}
          quantity={landsQuantity}
          frame={landsFrame}
        />
      );
    } else {
      let quantity: CardTileQuantity = card.quantity;
      const fullCard = db.card(card.id);

      if (fullCard) {
        if (settings.mode === OVERLAY_MIXED) {
          const odds = (card.chance || 0) + "%";
          const q = card.quantity;
          if (!settings.lands || (settings.lands && odds !== "0%")) {
            quantity = {
              quantity: q,
              odds: odds,
            };
          }
        } else if (settings.mode === OVERLAY_ODDS) {
          quantity = ((card.chance || 0) / 100).toLocaleString([], {
            style: "percent",
            maximumSignificantDigits: 2,
          });
        } else if (settings.mode === OVERLAY_DRAFT) {
          const rank = getRank(card.id);
          quantity =
            fullCard.source == 0 ? DRAFT_RANKS[rank] : DRAFT_RANKS_LOLA[rank];
        }

        if (settings.mode === OVERLAY_DRAFT) {
          mainCardTiles.push(
            <div
              className={css.overlayCardQuantity}
              key={"maincardtile_owned_" + index + "_" + card.id}
            >
              <OwnershipStars card={fullCard} />
            </div>
          );
        } else if (
          shouldDoGroupLandsHack &&
          fullCard &&
          fullCard.type &&
          fullCard.type.includes("Land", 0)
        ) {
          // skip land cards while doing group lands hack
          return;
        }

        const dfcCard = card?.dfcId ? db.card(parseInt(card.dfcId)) : undefined;
        mainCardTiles.push(
          <CardTile
            card={fullCard}
            dfcCard={dfcCard}
            key={"maincardtile_" + card.id}
            indent="a"
            isSideboard={false}
            quantity={quantity}
            showWildcards={false}
            deck={deck}
            isHighlighted={card.id === highlightCardId}
          />
        );
      }
    }
  });

  const sideboardCardTiles: JSX.Element[] = [];
  const sideboardCards = deckClone.getSideboard().count();
  if (settings.sideboard && sideboardCards > 0) {
    const sideCards = deckClone.getSideboard();
    sideCards.removeDuplicates();
    sideCards.get().sort(sortFunc);
    sideCards.get().forEach((card: any, index: number) => {
      const quantity =
        settings.mode === OVERLAY_ODDS || settings.mode === OVERLAY_MIXED
          ? settings.mode === OVERLAY_ODDS
            ? "0%"
            : {
                quantity: card.quantity,
                odds: "0%",
              }
          : card.quantity;
      let fullCard = card;
      if (card?.id) {
        fullCard = db.card(card.id);
      }
      let dfcCard;
      if (card?.dfcId) {
        dfcCard = db.card(card.dfcId);
      }
      sideboardCardTiles.push(
        <CardTile
          card={fullCard}
          dfcCard={dfcCard}
          key={"sideboardcardtile_" + index + "_" + card.id}
          indent="a"
          isSideboard={true}
          quantity={quantity}
          showWildcards={false}
          deck={deck}
          isHighlighted={false}
        />
      );
    });
  }

  return (
    <div className={`${css.overlayDecklist} ${css.clickOn}`}>
      <div className={css.decklistTitle}>{subTitle}</div>
      {!!settings.deck && mainCardTiles}
      {!!settings.sideboard && sideboardCardTiles.length && (
        <div className={css.decklistTitle}>
          Sideboard ({sideboardCards} cards)
        </div>
      )}
      {!!settings.sideboard && sideboardCardTiles}
      {!!settings.type_counts && (
        <DeckTypesStats className={css.overlayDeckTypeStats} deck={deck} />
      )}
      {!!settings.mana_curve && (
        <DeckManaCurve className={css.overlayDeckManaCurve} deck={deck} />
      )}
      {!!settings.draw_odds &&
      (settings.mode === OVERLAY_ODDS || settings.mode === OVERLAY_MIXED) &&
      cardOdds &&
      setOddsCallback ? (
        <SampleSizePanel
          cardOdds={cardOdds}
          cardsLeft={deck.getMainboard().count()}
          setOddsCallback={setOddsCallback}
        />
      ) : (
        <></>
      )}
    </div>
  );
}
