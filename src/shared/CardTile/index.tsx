import React, { useCallback, useState, CSSProperties } from "react";
import { constants, Deck, DbCardData, Rarity } from "mtgatool-shared";
import { getRankColorClass } from "../utils/getRankColorClass";
import { openScryfallCard } from "../utils/openScryfallCard";
import { getCardArtCrop } from "../utils/getCardArtCrop";
import useHoverCard from "../../renderer/hooks/useHoverCard";
import { getWildcardsMissing } from "../../renderer/rendererUtil";
import debugLog from "../debugLog";
import css from "./CardTile.css";
import sharedCss from "../shared.css";
import typeLand from "../../assets/images/type_land.png";

const {
  CARD_RARITIES,
  COLORS_ALL,
  FACE_SPLIT_FULL,
  FACE_ADVENTURE_MAIN,
  LANDS_HACK,
} = constants;

const mana: Record<string, string> = {};
mana["w"] = sharedCss.mana_w;
mana["u"] = sharedCss.mana_u;
mana["b"] = sharedCss.mana_b;
mana["r"] = sharedCss.mana_r;
mana["g"] = sharedCss.mana_g;
mana["c"] = sharedCss.mana_c;
mana["wu"] = sharedCss.mana_wu;
mana["wb"] = sharedCss.mana_wb;
mana["ur"] = sharedCss.mana_ur;
mana["ub"] = sharedCss.mana_ub;
mana["br"] = sharedCss.mana_br;
mana["bg"] = sharedCss.mana_bg;
mana["gw"] = sharedCss.mana_gw;
mana["gu"] = sharedCss.mana_gu;
mana["rw"] = sharedCss.mana_rw;
mana["rg"] = sharedCss.mana_rg;
mana["x"] = sharedCss.mana_x;
mana["0"] = sharedCss.mana_0;
mana["1"] = sharedCss.mana_1;
mana["2"] = sharedCss.mana_2;
mana["3"] = sharedCss.mana_3;
mana["4"] = sharedCss.mana_4;
mana["5"] = sharedCss.mana_5;
mana["6"] = sharedCss.mana_6;
mana["7"] = sharedCss.mana_7;
mana["8"] = sharedCss.mana_8;
mana["9"] = sharedCss.mana_9;
mana["10"] = sharedCss.mana_10;
mana["11"] = sharedCss.mana_11;
mana["12"] = sharedCss.mana_12;
mana["13"] = sharedCss.mana_13;
mana["14"] = sharedCss.mana_14;
mana["15"] = sharedCss.mana_15;
mana["16"] = sharedCss.mana_16;
mana["17"] = sharedCss.mana_17;
mana["18"] = sharedCss.mana_18;
mana["19"] = sharedCss.mana_19;
mana["20"] = sharedCss.mana_20;

export type CardTileQuantity =
  | { quantity: number; odds: string }
  | number
  | string;

interface CardTileProps {
  card: DbCardData;
  deck?: Deck;
  dfcCard?: DbCardData;
  indent: string;
  isHighlighted: boolean;
  isSideboard: boolean;
  quantity: CardTileQuantity;
  showWildcards: boolean;
}

function isNumber(n: number | string): boolean {
  return !isNaN(parseFloat(n as string)) && isFinite(parseFloat(n as string));
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
          costSymbols.push(
            <span key={card.id + "_cost_separator"}>{`//`}</span>
          );
        }
        prevc = /^\d+$/.test(cost);
      }
      costSymbols.push(
        <div
          style={{
            justifyContent: "flex-end",
          }}
          key={card.id + "_" + index}
          className={`${sharedCss.manaS16} ${mana[cost]}`}
        />
      );
    });
  }
  if (card.dfc === FACE_ADVENTURE_MAIN && dfcCard && dfcCard.cost) {
    costSymbols.push(<span key={dfcCard.id + "_cost_separator"}>{`//`}</span>);
    dfcCard.cost.forEach((cost: string, index: number) => {
      costSymbols.push(
        <div
          style={{
            justifyContent: "flex-end",
          }}
          key={dfcCard.id + "_" + index}
          className={`${sharedCss.manaS16} ${mana[cost]}`}
        />
      );
    });
  }
  return <>{costSymbols}</>;
}

function CardQuantityDisplay(props: {
  quantity: CardTileQuantity;
}): JSX.Element {
  const { quantity } = props;
  if (typeof quantity === "object") {
    // Mixed quantity (odds and quantity)
    return (
      <div className={css.card_tile_odds_flat}>
        <div className={css.card_tile_odds_flat_half}>{quantity.quantity}</div>
        <div className={css.card_tile_odds_flat_half_dark}>{quantity.odds}</div>
      </div>
    );
  } else if (!isNumber(quantity)) {
    // Text quantity, presumably rank
    const rankClass = getRankColorClass(quantity as string);
    return (
      <div className={css.card_tile_odds_flat + " " + rankClass}>
        {quantity}
      </div>
    );
  } else if (quantity === 9999) {
    // Undefined Quantity
    return <div className={css.card_tile_quantity_flat}>1</div>;
  } else {
    // Normal Quantity
    return <div className={css.card_tile_quantity_flat}>{quantity}</div>;
  }
}

interface WildcardsNeededProps {
  card: DbCardData;
  deck: Deck;
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

function MissingCardSprite(props: MissingCardsProps): JSX.Element {
  const { missing, cardRarity, listStyle, ww } = props;

  const xoff =
    CARD_RARITIES.filter((r) => r !== "token" && r !== "land").indexOf(
      cardRarity
    ) * -24;
  const yoff = missing * -24;

  let className = css.notOwnedSprite;
  if (listStyle === "flat") {
    className = css.notOwnedSpriteFlat;
  }

  const style: React.CSSProperties = {
    backgroundPosition: `${xoff}px ${yoff}px`,
  };
  if (ww) {
    style.left = `calc(0px - 100% + ${ww - 14}px)`;
  }

  return (
    <div className={className} title={missing + " missing"} style={style} />
  );
}

function WildcardsNeeded(props: WildcardsNeededProps): JSX.Element {
  const { card, deck, isSideboard, listStyle, ww } = props;
  if (
    card.type.indexOf("Basic Land") === -1 &&
    card.type.indexOf("Basic Snow Land") === -1
  ) {
    const missing = getWildcardsMissing(deck, card.id, isSideboard);
    const cardRarity = card.rarity;

    if (missing > 0) {
      return MissingCardSprite({ missing, cardRarity, listStyle, ww });
    }
  }
  return <div className={css.notOwnedSpriteEmpty}></div>;
}

export default function CardTile(props: CardTileProps): JSX.Element {
  const {
    card,
    deck,
    dfcCard,
    indent,
    isHighlighted,
    isSideboard,
    quantity,
    showWildcards,
  } = props;
  const [isMouseHovering, setMouseHovering] = useState(false);
  const [hoverIn, hoverOut] = useHoverCard(card.id);

  const handleMouseEnter = useCallback((): void => {
    setMouseHovering(true);
    hoverIn();
  }, [hoverIn]);
  const handleMouseLeave = useCallback((): void => {
    setMouseHovering(false);
    hoverOut();
  }, [hoverOut]);

  const handleMouseClick = useCallback((): void => {
    let _card = card;
    if (card.dfc === FACE_SPLIT_FULL) {
      _card = dfcCard || card;
    }
    openScryfallCard(_card);
  }, [card, dfcCard]);

  const cardTileStyle = { backgroundImage: "", borderImage: "" };
  try {
    if (card.type == "Special") {
      cardTileStyle.backgroundImage = `url(${card.images["art_crop"]})`;
    } else {
      cardTileStyle.backgroundImage = `url(${getCardArtCrop(card)})`;
    }
  } catch (e) {
    debugLog(e, "error");
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

  const tileStyle: CSSProperties = {
    backgroundColor: "var(--color-card-tile)",
  };
  if (isHighlighted) {
    tileStyle.backgroundColor = "var(--color-card-tile-active)";
  } else if (isMouseHovering) {
    tileStyle.backgroundColor = "var(--color-card-tile-hover)";
  }

  const phyrexianName = `|Ceghm.`; // Swamp
  const isPhyrexian = card.id == 72578;

  return (
    <div className={css.card_tile_container_outer}>
      <div
        className={`${css.card_tile_container_flat} ${sharedCss.clickOn}`}
        data-grp-id={card.id}
        data-id={indent}
        data-quantity={quantity}
        style={tileStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleMouseClick}
      >
        <CardQuantityDisplay quantity={quantity} />
        <div className={css.card_tile_crop_flat} style={cardTileStyle} />
        <div
          className={css.card_tile_name_flat}
          style={isPhyrexian ? { fontFamily: "PhyrexianHorizontal" } : {}}
        >
          {isPhyrexian ? phyrexianName : card.name || "Unknown"}
        </div>
        <div className={css.cart_tile_mana_flat}>
          <CostSymbols card={card} dfcCard={dfcCard} />
        </div>
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

interface LandsTileProps {
  quantity: CardTileQuantity;
  isHighlighted?: boolean;
  frame: number[];
}

export function LandsTile(props: LandsTileProps): JSX.Element {
  const { quantity, frame, isHighlighted } = props;
  const [isMouseHovering, setMouseHovering] = useState(false);
  const [hoverIn, hoverOut] = useHoverCard(LANDS_HACK);

  const handleMouseEnter = useCallback((): void => {
    setMouseHovering(true);
    hoverIn();
  }, [hoverIn]);
  const handleMouseLeave = useCallback((): void => {
    setMouseHovering(false);
    hoverOut();
  }, [hoverOut]);

  const cardTileStyle = {
    backgroundImage: `url(${typeLand})`,
    borderImage: "",
  };

  let colorA = "c";
  let colorB = "c";

  if (frame.length == 1) {
    colorA = COLORS_ALL[frame[0] - 1];
    colorB = COLORS_ALL[frame[0] - 1];
  } else if (frame.length == 2) {
    colorA = COLORS_ALL[frame[0] - 1];
    colorB = COLORS_ALL[frame[1] - 1];
  } else if (frame.length > 2) {
    colorA = "m";
    colorB = "m";
  }

  cardTileStyle.borderImage = `linear-gradient(to bottom, var(--color-${colorA}) 30%, var(--color-${colorB}) 70%) 1 100%`;

  const tileStyle = { backgroundColor: "var(--color-card-tile)" };
  if (isHighlighted) {
    tileStyle.backgroundColor = "var(--color-card-tile-active)";
  } else if (isMouseHovering) {
    tileStyle.backgroundColor = "var(--color-card-tile-hover)";
  }

  return (
    <div className={css.card_tile_container_outer}>
      <div
        className={`${css.card_tile_container_flat} ${sharedCss.clickOn}`}
        data-quantity={quantity}
        style={tileStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CardQuantityDisplay quantity={quantity} />
        <div className={css.card_tile_crop_flat} style={cardTileStyle} />
        <div className={css.card_tile_name_flat}>Lands</div>
      </div>
    </div>
  );
}
