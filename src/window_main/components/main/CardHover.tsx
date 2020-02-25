/* eslint-disable react/prop-types */
import React from "react";
import { useSelector } from "react-redux";
import db from "../../../shared/database";
import pd from "../../../shared/player-data";
import { AppState } from "../../app/appState";
import { FACE_DFC_FRONT, FACE_DFC_BACK } from "../../../shared/constants";
const NotFound = "../images/notfound.png";

export default function CardHover(): JSX.Element {
  const grpId = useSelector((state: AppState) => state.hover.grpId);
  const opacity = useSelector((state: AppState) => state.hover.opacity);
  const hoverSize = useSelector((state: AppState) => state.hover.size);

  const getStyle = (
    hoverGrpId: number,
    hoverSize: number,
    opacity: number
  ): React.CSSProperties => {
    const cardObj = db.card(hoverGrpId);

    let newImg;
    try {
      const quality = pd.settings.cards_quality;
      newImg = `url(https://img.scryfall.com/cards${cardObj?.images[quality]}`;
    } catch (e) {
      newImg = `url(${NotFound})`;
    }
    return {
      width: hoverSize + "px",
      height: hoverSize / 0.71808510638 + "px",
      top: `calc(100% - ${hoverSize / 0.71808510638 + 32}px)`,
      opacity: opacity,
      backgroundImage: newImg
    };
  };

  const getStyleDfc = (
    hoverGrpId: number,
    hoverSize: number,
    opacity: number
  ): React.CSSProperties => {
    let cardObj = db.card(hoverGrpId);
    let newImg = `url(${NotFound})`;
    if (
      cardObj &&
      (cardObj.dfc == FACE_DFC_BACK || cardObj.dfc == FACE_DFC_FRONT) &&
      cardObj.dfcId
    ) {
      cardObj = db.card(cardObj.dfcId);
      try {
        const quality = pd.settings.cards_quality;
        newImg = `url(https://img.scryfall.com/cards${cardObj?.images[quality]}`;
      } catch (e) {
        newImg = `url(${NotFound})`;
      }
    } else {
      opacity = 0;
    }

    return {
      width: hoverSize + "px",
      right: hoverSize + 48 + "px",
      height: hoverSize / 0.71808510638 + "px",
      top: `calc(100% - ${hoverSize / 0.71808510638 + 32}px)`,
      opacity: opacity,
      backgroundImage: newImg
    };
  };

  return (
    <>
      <div
        style={getStyleDfc(grpId, hoverSize, opacity)}
        className="card-hover-dfc"
      />
      <div
        style={getStyle(grpId, hoverSize, opacity)}
        className="card-hover-main"
      />
    </>
  );
}
