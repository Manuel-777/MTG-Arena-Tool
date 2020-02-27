import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  CARD_RARITIES,
  CARD_TILE_FLAT,
  COLORS_ALL,
  FACE_SPLIT_FULL,
  FACE_ADVENTURE_MAIN
} from "./constants";
import {
  get_wc_missing as getWildcardsMissing,
  getCardArtCrop,
  getRankColorClass,
  openScryfallCard
} from "./util";
import { addCardHover } from "./cardHover";
import { DbCardData, Rarity } from "../types/Metadata";
import { InternalDeck } from "../types/Deck";

export interface CardTileProps {
  card: DbCardData;
  deck?: InternalDeck;
  dfcCard?: DbCardData;
  indent: string;
  isHighlighted: boolean;
  isSideboard: boolean;
  quantity: { quantity: string; odds: number } | number | string; // TODO clean this up?
  setHoverCardCallback?: (card?: DbCardData) => void;
  showWildcards: boolean;
  style: number;
}

function isNumber(n: number | string): boolean {
  return !isNaN(parseFloat(n as string)) && isFinite(parseFloat(n as string));
}

function frameClassName(card: DbCardData): string {
  const frame = card?.frame.concat().sort() ?? [];
  if (frame.length === 0) {
    return "tile_c";
  } else if (frame.length <= 2) {
    const colorString = frame.map((i: number) => COLORS_ALL[i - 1]).join("");
    return "tile_" + colorString;
  } else {
    return "tile_multi";
  }
}

function getArenaQuantityDisplay(quantity: any): [number, number, JSX.Element] {
  let ww, ll, quantityElement;
  if (typeof quantity === "object") {
    ww = 64;
    ll = 48;
    const rankClass = getRankColorClass(quantity.quantity);
    quantityElement = (
      <div className={"card_tile_odds " + rankClass}>
        <span>{quantity.quantity}</span>
      </div>
    );
  } else if (!isNumber(quantity)) {
    ww = 64;
    ll = 48;
    const rankClass = getRankColorClass(quantity);
    quantityElement = (
      <div className={"card_tile_odds " + rankClass}>
        <span>{quantity}</span>
      </div>
    );
  } else if (quantity === 9999) {
    ww = 32;
    ll = 17;
    quantityElement = (
      <div
        className="card_tile_quantity"
        style={{
          color: "rgba(255, 255, 255, 0)",
          minWidth: "0px",
          width: "0px"
        }}
      >
        <span>1</span>
      </div>
    );
  } else {
    ww = 64;
    ll = 49;
    quantityElement = (
      <div className="card_tile_quantity">
        <span>{quantity}</span>
      </div>
    );
  }
  return [ww, ll, quantityElement];
}

function CostSymbols(props: {
  card: DbCardData;
  dfcCard?: DbCardData;
}): JSX.Element {
  const { card, dfcCard } = props;
  const costSymbols: JSX.Element[] = [];
  let prevc = true;
  const hasSplitCost = card.dfc === FACE_SPLIT_FULL;
  if (card.cost) {
    card.cost.forEach((cost: string, index: number) => {
      if (hasSplitCost) {
        if (/^(x|\d)+$/.test(cost) && prevc === false) {
          costSymbols.push(<span key={card.id + "_cost_separator"}>//</span>);
        }
        prevc = /^\d+$/.test(cost);
      }
      costSymbols.push(
        <div
          key={card.id + "_" + index}
          className={"mana_s16 flex_end mana_" + cost}
        />
      );
    });
  }
  if (card.dfc === FACE_ADVENTURE_MAIN && dfcCard && dfcCard.cost) {
    costSymbols.push(<span key={dfcCard.id + "_cost_separator"}>//</span>);
    dfcCard.cost.forEach((cost: string, index: number) => {
      costSymbols.push(
        <div
          key={dfcCard.id + "_" + index}
          className={"mana_s16 flex_end mana_" + cost}
        />
      );
    });
  }
  return <>{costSymbols}</>;
}

function ArenaCardTile(props: CardTileProps): JSX.Element {
  const {
    card,
    deck,
    dfcCard,
    indent,
    isHighlighted,
    isSideboard,
    quantity,
    setHoverCardCallback,
    showWildcards
  } = props;

  const [isMouseHovering, setMouseHovering] = useState(false);
  const handleMouseEnter = useCallback((): void => {
    setMouseHovering(true);
    setHoverCardCallback && setHoverCardCallback(card);
  }, [card, setHoverCardCallback]);
  const handleMouseLeave = useCallback((): void => {
    setMouseHovering(false);
    setHoverCardCallback && setHoverCardCallback();
  }, [setHoverCardCallback]);
  const handleMouseClick = useCallback((): void => {
    let _card = card;
    if (card.dfc === FACE_SPLIT_FULL) {
      _card = dfcCard || card;
    }
    openScryfallCard(_card);
  }, [card, dfcCard]);

  const containerEl = useRef(null);
  useEffect(() => {
    if (setHoverCardCallback) {
      return; // React handles hover
    }
    // Legacy code support
    const containerDiv = containerEl.current;
    if (containerDiv) {
      addCardHover(containerDiv, card);
    }
  }, [card, setHoverCardCallback]);

  const [ww, ll, quantityElement] = getArenaQuantityDisplay(quantity);

  return (
    <div
      className="card_tile_container click-on"
      data-grp-id={card.id}
      data-id={indent}
      data-quantity={quantity}
      ref={containerEl}
      style={{
        backgroundColor: isHighlighted ? "rgba(250, 229, 210, 0.66)" : ""
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMouseClick}
    >
      {quantityElement}
      <div
        className={"card_tile " + (card.frame ? frameClassName(card) : "")}
        style={{
          minWidth: `calc(100% - ${ww}px)`,
          marginTop: isMouseHovering ? 0 : "3px"
        }}
      >
        <div className="flex_item">
          <div className="card_tile_name">{card.name || "Unknown"}</div>
        </div>
        <div className="flex_item" style={{ lineHeight: "26px" }}>
          <CostSymbols card={card} dfcCard={dfcCard} />
        </div>
      </div>
      <div
        className="card_tile_glow"
        style={{
          minWidth: `calc(100% - ${ww}px)`,
          left: `calc(0px - 100% + ${ll}px)`
        }}
      />
      {showWildcards && deck && (
        <WildcardsNeeded
          card={card}
          deck={deck}
          isSideboard={isSideboard}
          listStyle="arena"
          ww={ww}
        />
      )}
    </div>
  );
}

function FlatQuantityDisplay(props: { quantity: any }): JSX.Element {
  const { quantity } = props;
  if (typeof quantity === "object") {
    // Mixed quantity (odds and quantity)
    return (
      <div className="card_tile_odds_flat">
        <div className="card_tile_odds_flat_half">{quantity.quantity}</div>
        <div className="card_tile_odds_flat_half_dark">{quantity.odds}</div>
      </div>
    );
  } else if (!isNumber(quantity)) {
    // Text quantity
    const rankClass = getRankColorClass(quantity);
    return <div className={"card_tile_odds_flat " + rankClass}>{quantity}</div>;
  } else if (quantity === 9999) {
    // Undefined Quantity
    return <div className="card_tile_quantity_flat">1</div>;
  } else {
    // Normal Quantity
    return <div className="card_tile_quantity_flat">{quantity}</div>;
  }
}

interface WildcardsNeededProps {
  card: DbCardData;
  deck: InternalDeck;
  isSideboard: boolean;
  listStyle: "flat" | "arena";
  ww?: number;
}

interface MissingCardsProps {
  missing: number;
  cardRarity: Rarity;
  listStyle: "flat" | "arena";
  ww?: number;
}

function WildcardsNeeded(props: WildcardsNeededProps): JSX.Element {
  const { card, deck, isSideboard, listStyle, ww } = props;
  if (card.type.indexOf("Basic Land") === -1) {
    const missing = getWildcardsMissing(deck, card.id, isSideboard);
    const cardRarity = card.rarity;

    if (missing > 0) {
      return MissingCardSprite({ missing, cardRarity, listStyle, ww });
    }
  }
  return <></>;
}

function MissingCardSprite(props: MissingCardsProps): JSX.Element {
  const { missing, cardRarity, listStyle, ww } = props;

  const xoff = CARD_RARITIES.indexOf(cardRarity) * -24;
  const yoff = missing * -24;

  let className = "not_owned_sprite";
  if (listStyle === "flat") {
    className += "_flat";
  }

  const style: React.CSSProperties = {
    backgroundPosition: `${xoff}px ${yoff}px`
  };
  if (ww) {
    style.left = `calc(0px - 100% + ${ww - 14}px)`;
  }

  return (
    <div className={className} title={missing + " missing"} style={style} />
  );
}

function FlatCardTile(props: CardTileProps): JSX.Element {
  const {
    card,
    deck,
    dfcCard,
    indent,
    isHighlighted,
    isSideboard,
    quantity,
    setHoverCardCallback,
    showWildcards
  } = props;
  const [isMouseHovering, setMouseHovering] = useState(false);
  const handleMouseEnter = useCallback((): void => {
    setMouseHovering(true);
    setHoverCardCallback && setHoverCardCallback(card);
  }, [card, setHoverCardCallback]);
  const handleMouseLeave = useCallback((): void => {
    setMouseHovering(false);
    setHoverCardCallback && setHoverCardCallback();
  }, [setHoverCardCallback]);
  const handleMouseClick = useCallback((): void => {
    let _card = card;
    if (card.dfc === FACE_SPLIT_FULL) {
      _card = dfcCard || card;
    }
    openScryfallCard(_card);
  }, [card, dfcCard]);

  const containerEl = useRef(null);
  useEffect(() => {
    if (setHoverCardCallback) {
      return; // React handles hover
    }
    // Legacy code support
    const containerDiv = containerEl.current;
    if (containerDiv) {
      addCardHover(containerDiv, card);
    }
  }, [card, setHoverCardCallback]);

  const cardTileStyle = { backgroundImage: "", borderImage: "" };
  try {
    if (card.type == "Special") {
      cardTileStyle.backgroundImage = `url(${card.images["art_crop"]})`;
    } else {
      cardTileStyle.backgroundImage = `url(${getCardArtCrop(card)})`;
    }
  } catch (e) {
    console.log(e);
  }

  let colorA = "c";
  let colorB = "c";
  if (card.frame) {
    if (card.frame.length == 1) {
      colorA = COLORS_ALL[card.frame[0] - 1];
      colorB = COLORS_ALL[card.frame[0] - 1];
    } else if (card.frame.length == 2) {
      colorA = COLORS_ALL[card.frame[0] - 1];
      colorB = COLORS_ALL[card.frame[1] - 1];
    } else if (card.frame.length > 2) {
      colorA = "m";
      colorB = "m";
    }
  }
  cardTileStyle.borderImage = `linear-gradient(to bottom, var(--color-${colorA}) 30%, var(--color-${colorB}) 70%) 1 100%`;

  const tileStyle = { backgroundColor: "rgba(0, 0, 0, 0.75)" };
  if (isHighlighted) {
    tileStyle.backgroundColor = "rgba(250, 229, 210, 0.66)";
  } else if (isMouseHovering) {
    tileStyle.backgroundColor = "rgba(65, 50, 40, 0.75)";
  }

  return (
    <div
      className="card_tile_container_flat click-on"
      data-grp-id={card.id}
      data-id={indent}
      data-quantity={quantity}
      ref={containerEl}
      style={tileStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMouseClick}
    >
      <FlatQuantityDisplay quantity={quantity} />
      <div className="card_tile_crop_flat" style={cardTileStyle} />
      <div className="card_tile_name_flat">{card.name || "Unknown"}</div>
      <div className="cart_tile_mana_flat">
        <CostSymbols card={card} dfcCard={dfcCard} />
      </div>
      {showWildcards && deck && (
        <WildcardsNeeded
          card={card}
          deck={deck}
          isSideboard={isSideboard}
          listStyle="flat"
        />
      )}
    </div>
  );
}

export default function CardTile(props: CardTileProps): JSX.Element {
  const { card, quantity } = props;
  if (!card || quantity === 0) {
    return <></>;
  }
  if (props.style === CARD_TILE_FLAT) {
    return FlatCardTile(props);
  }
  return ArenaCardTile(props);
}
