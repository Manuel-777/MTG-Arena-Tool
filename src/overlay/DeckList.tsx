import React from "react";

import {
  DRAFT_RANKS,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_MIXED,
  OVERLAY_DRAFT
} from "../shared/constants";
import db from "../shared/database";
import {
  compare_cards as compareCards,
  get_card_type_sort as getCardTypeSort
} from "../shared/util";
import CardTile from "../shared/CardTile";
import Colors from "../shared/colors";
import DeckManaCurve from "../shared/DeckManaCurve";
import DeckTypesStats from "../shared/DeckTypesStats";
import OwnershipStars from "../shared/OwnershipStars";

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

function getRank(cardId: string) {
  const cardObj = db.card(cardId);
  return (cardObj && cardObj.rank) || 0;
}

function compareQuantity(a: any, b: any) {
  return b.quantity - a.quantity;
}

function compareDraftPicks(a: any, b: any) {
  const aCard = db.card(a.id);
  const bCard = db.card(b.id);
  if (!bCard) {
    return -1;
  } else if (!aCard) {
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
  return (
    bCard.rank - aCard.rank ||
    aColors.length - bColors.length ||
    aCard.cmc - bCard.cmc ||
    aType - bType ||
    aCard.name.localeCompare(bCard.name)
  );
}

export interface DeckListProps {
  deck: any;
  subTitle: string;
  highlightCardId: string;
  settings: any;
  tileStyle: number;
  cardOdds: any;
  setOddsCallback: (sampleSize: number) => void;
}

export default function DeckList(props: DeckListProps): JSX.Element {
  const { deck, subTitle, settings, tileStyle, highlightCardId, cardOdds, setOddsCallback } = props;
  if (!deck) return <></>;

  const deckClone = deck.clone();

  let sortFunc: (a: any, b: any) => number = compareCards;
  if (settings.mode === OVERLAY_ODDS || settings.mode == OVERLAY_MIXED) {
    sortFunc = compareQuantity;
  } else if (settings.mode === OVERLAY_DRAFT) {
    sortFunc = compareDraftPicks;
  }

  const mainCardTiles: JSX.Element[] = [];
  const mainCards = deckClone.mainboard;
  mainCards.removeDuplicates();
  // group lands
  if (
    settings.lands &&
    [OVERLAY_FULL, OVERLAY_LEFT, OVERLAY_ODDS, OVERLAY_MIXED].includes(
      settings.mode
    )
  ) {
    let landsNumber = 0;
    let landsChance = 0;
    const landsColors = new Colors();
    mainCards.get().forEach((card: any) => {
      const cardObj = db.card(card.id);
      if (cardObj && cardObj.type.includes("Land", 0)) {
        landsNumber += card.quantity;
        landsChance += card.chance !== undefined ? card.chance : 0;
        delete card.chance;
        card.quantity = 0;
        if (cardObj.frame) {
          landsColors.addFromArray(cardObj.frame);
        }
      }
    });
    const lands = mainCards.add(landsCard, landsNumber, true);
    if (landsChance > 0) {
      lands.chance = landsChance;
    }

    // Set lands frame colors
    landsCard.frame = landsColors.get();
  }
  mainCards.get().sort(sortFunc);
  mainCards.get().forEach((card: any) => {
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

    // This is hackish.. the way we insert our custom elements in the
    // array of cards is wrong in the first place :()
    const isCardGroupedLands =
      card && card.id && card.id.id && card.id.id === 100;

    let fullCard = card;
    if (card && card.id && !isCardGroupedLands) {
      fullCard = db.card(card.id);
    }
    let dfcCard = null;
    if (card && card.dfcId) {
      dfcCard = db.card(card.dfcId);
    }
    if (settings.mode === OVERLAY_DRAFT) {
      mainCardTiles.push(
        <div
          className="overlay_card_quantity"
          key={"maincardtile_owned_" + card.id}
        >
          <OwnershipStars card={fullCard} />
        </div>
      );
    }
    mainCardTiles.push(
      <CardTile
        style={tileStyle}
        card={fullCard}
        dfcCard={dfcCard}
        landOdds={cardOdds}
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
  if (settings.sideboard && deckClone.sideboard.count() > 0) {
    const sideCards = deckClone.sideboard;
    sideCards.removeDuplicates();
    sideCards.get().sort(sortFunc);
    sideCards.get().forEach((card: any) => {
      const quantity =
        settings.mode === OVERLAY_ODDS || settings.mode === OVERLAY_MIXED
          ? "0%"
          : card.quantity;
      let fullCard = card;
      if (card && card.id) {
        fullCard = db.card(card.id);
      }
      let dfcCard;
      if (card && card.dfcId) {
        dfcCard = db.card(card.dfcId);
      }
      sideboardCardTiles.push(
        <CardTile
          style={tileStyle}
          card={fullCard}
          dfcCard={dfcCard}
          landOdds={cardOdds}
          key={"sideboardcardtile_" + card.id}
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

  const arenaDeck = deck.getSave();

  return (
    <div className="overlay_decklist click-on">
      <div className="decklist_title">{subTitle}</div>
      {mainCardTiles}
      {settings.sideboard && sideboardCardTiles.length && (
        <div className="card_tile_separator">Sideboard</div>
      )}
      {settings.sideboard && sideboardCardTiles}
      {settings.type_counts && <DeckTypesStats deck={arenaDeck} />}
      {settings.mana_curve && <DeckManaCurve deck={arenaDeck} />}
      {settings.draw_odds &&
        (settings.mode === OVERLAY_ODDS || settings.mode === OVERLAY_MIXED) && (
          <SampleSizePanel
            cardOdds={cardOdds}
            cardsLeft={deck.mainboard.count()}
            setOddsCallback={setOddsCallback}
          />
        )}
    </div>
  );
}
