import React from "react";
import { CARD_RARITIES, COLORS_LONG } from "../../../shared/constants";
import db from "../../../shared/database";
import { CardStats } from "./collectionStats";
import useHoverCard from "../../hooks/useHoverCard";

type ColorData = { [key: string]: CardStats[] };
export type CardData = ColorData[];

function CardCell({
  card,
  color,
  rarityIndex,
  index
}: {
  card: CardStats;
  color: number;
  rarityIndex: number;
  index: number;
}): JSX.Element {
  const [hoverIn, hoverOut] = useHoverCard(card.id);
  return (
    <div
      key={index}
      className={
        "completion_table_card n" +
        card.owned +
        (card.wanted > 0 ? " wanted" : "")
      }
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
      style={{
        gridArea: `${index + 3} / ${color * 5 +
          1 +
          rarityIndex} / auto / ${color * 5 + 1 + rarityIndex}`
      }}
    >
      {card.owned}
    </div>
  );
}

function RarityColumn({
  colorData,
  color,
  rarityCode
}: {
  colorData: ColorData;
  color: number;
  rarityCode: string;
}): JSX.Element {
  const rarityIndex = CARD_RARITIES.indexOf(rarityCode as any);
  const rarity = rarityCode.toLowerCase();
  const cardsArray = colorData && colorData[rarity] ? colorData[rarity] : [];
  return (
    <>
      <div
        className={"completion_table_rarity_title " + rarity}
        title={rarity}
        style={{
          gridArea: `2 / ${color * 5 + 1 + rarityIndex} / auto / ${color * 5 +
            1 +
            rarityIndex}`
        }}
      />
      {cardsArray.map((card, index) => {
        const props = {
          card,
          color,
          rarityIndex,
          index
        };
        return <CardCell key={index} {...props} />;
      })}
    </>
  );
}

function ColorColumn({
  cardData,
  colorCode,
  color
}: {
  cardData: CardData;
  colorCode: string;
  color: number;
}): JSX.Element {
  // A little hacky to use "c + 1"..
  const colorIndex = color + 1;
  const colorData = cardData[colorIndex];
  return (
    <>
      <div
        key={color}
        className={"completion_table_color_title mana_" + colorCode}
        style={{
          gridArea: `1 / ${color * 5 + 1} / auto / ${color * 5 + 6}`
        }}
      />
      {CARD_RARITIES.filter(rarity => rarity !== "land").map(rarityCode => {
        const props = {
          colorData,
          color,
          rarityCode
        };
        return <RarityColumn key={rarityCode} {...props} />;
      })}
    </>
  );
}

export default function CompletionHeatMap({
  cardData,
  setName
}: {
  cardData: CardData;
  setName: string;
}): JSX.Element {
  const iconSvg = db.sets[setName]?.svg ?? db.defaultSet?.svg;
  const setIcon = iconSvg
    ? `url(data:image/svg+xml;base64,${iconSvg})`
    : "url(../images/notfound.png)";
  return (
    <>
      <div className={"stats_set_icon"} style={{ backgroundImage: setIcon }}>
        <span>{setName}</span>
      </div>
      <div className={"completion_table"}>
        {COLORS_LONG.map((code, color) => {
          return (
            <ColorColumn
              key={color}
              cardData={cardData}
              colorCode={code}
              color={color}
            />
          );
        })}
      </div>
    </>
  );
}
