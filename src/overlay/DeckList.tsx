import React from "react";
import CardTile from "../shared/CardTile";
import Colors from "../shared/colors";
import {
  DRAFT_RANKS,
  OVERLAY_DRAFT,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_MIXED,
  OVERLAY_ODDS
} from "../shared/constants";
import db from "../shared/database";
import Deck from "../shared/deck";
import DeckManaCurve from "../shared/DeckManaCurve";
import DeckTypesStats from "../shared/DeckTypesStats";
import OwnershipStars from "../shared/OwnershipStars";
import {
  compare_cards as compareCards,
  get_card_type_sort as getCardTypeSort,
  objectClone
} from "../shared/util";
import { Chances } from "../types/Chances";
import { CardObject } from "../types/Deck";
import { DbCardData } from "../types/Metadata";
import { OverlaySettingsData } from "../types/settings";
import SampleSizePanel from "./SampleSizePanel";

const landsCard = {
  id: 100,
  name: "Lands",
  set: "",
  artid: 0,
  type: "Special",
  cost: [],
  cmc: 0,
  rarity: "",
  cid: 0,
  frame: [1, 2, 3, 4, 5],
  artist: "",
  dfc: "None",
  collectible: false,
  craftable: false,
  images: {
    art_crop: "../images/type_land.png"
  },
  dfcId: 0
};

function getRank(cardId: string): number {
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

  const rankDiff = bCard.rank - aCard.rank;
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

export interface DeckListProps {
  deck: Deck;
  subTitle: string;
  highlightCardId?: string;
  settings: OverlaySettingsData;
  tileStyle: number;
  cardOdds?: Chances;
  setHoverCardCallback: (card?: DbCardData) => void;
  setOddsCallback?: (sampleSize: number) => void;
}

export default function DeckList(props: DeckListProps): JSX.Element {
  const {
    deck,
    subTitle,
    settings,
    tileStyle,
    highlightCardId,
    cardOdds,
    setHoverCardCallback,
    setOddsCallback
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
  if (shouldDoGroupLandsHack) {
    let landsNumber = 0;
    let landsChance = 0;
    const landsColors = new Colors();
    mainCards.get().forEach((card: CardObject) => {
      const cardObj = db.card(card.id);
      if (cardObj && cardObj.type.includes("Land", 0)) {
        landsNumber += card.quantity;
        landsChance += card.chance !== undefined ? card.chance : 0;
        if (cardObj.frame) {
          landsColors.addFromArray(cardObj.frame);
        }
      }
    });
    const groupedLandsCard = objectClone(landsCard);
    groupedLandsCard.quantity = landsNumber;
    groupedLandsCard.chance = landsChance;
    groupedLandsCard.frame = landsColors.get();
    mainCards.add(groupedLandsCard, landsNumber, true);
  }
  mainCards.get().sort(sortFunc);
  mainCards.get().forEach((card: any, index: number) => {
    // TODO remove group lands hack
    const isCardGroupedLands =
      card && card.id && card.id.id && card.id.id === 100;
    if (isCardGroupedLands) {
      card = card.id;
    }
    let quantity = card.quantity;
    if (settings.mode === OVERLAY_MIXED) {
      const odds = (card.chance !== undefined ? card.chance : "0") + "%";
      const q = card.quantity;
      if (!settings.lands || (settings.lands && odds !== "0%")) {
        quantity = {
          quantity: q,
          odds: odds
        };
      }
    } else if (settings.mode === OVERLAY_ODDS) {
      quantity = ((card.chance || 0) / 100).toLocaleString([], {
        style: "percent",
        maximumSignificantDigits: 2
      });
    } else if (settings.mode === OVERLAY_DRAFT) {
      const rank = getRank(card.id);
      quantity = DRAFT_RANKS[rank];
    }

    let fullCard = card;
    if (card?.id && !isCardGroupedLands) {
      fullCard = db.card(card.id);
    }

    if (settings.mode === OVERLAY_DRAFT) {
      mainCardTiles.push(
        <div
          className="overlay_card_quantity"
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

    let dfcCard = card?.dfcId ? db.card(card.dfcId) : undefined;
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
  });

  const sideboardCardTiles: JSX.Element[] = [];
  if (settings.sideboard && deckClone.getSideboard().count() > 0) {
    const sideCards = deckClone.getSideboard();
    sideCards.removeDuplicates();
    sideCards.get().sort(sortFunc);
    sideCards.get().forEach((card: any, index: number) => {
      const quantity =
        settings.mode === OVERLAY_ODDS || settings.mode === OVERLAY_MIXED
          ? "0%"
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
    <div className="overlay_decklist click-on">
      <div className="decklist_title">{subTitle}</div>
      {!!settings.deck && mainCardTiles}
      {!!settings.sideboard && sideboardCardTiles.length && (
        <div className="card_tile_separator">Sideboard</div>
      )}
      {!!settings.sideboard && sideboardCardTiles}
      {!!settings.type_counts && <DeckTypesStats deck={deck} />}
      {!!settings.mana_curve && <DeckManaCurve deck={deck} />}
      {!!settings.draw_odds &&
        (settings.mode === OVERLAY_ODDS || settings.mode === OVERLAY_MIXED) &&
        cardOdds &&
        setOddsCallback && (
          <SampleSizePanel
            cardOdds={cardOdds}
            cardsLeft={deck.getMainboard().count()}
            setOddsCallback={setOddsCallback}
          />
        )}
    </div>
  );
}
