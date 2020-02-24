/* eslint-disable react/prop-types */
import React from "react";
import db from "../../../shared/database";
const NotFound = "../../../images/notfound.png";
import { useContext, AppState } from "../../app/ContextProvider";
import { FACE_DFC_FRONT, FACE_DFC_BACK } from "../../../shared/constants";

export default function CardHover(): JSX.Element {
  const webContext = useContext();

  const getStyle = (ctx: AppState): React.CSSProperties => {
    const cardObj = db.card(ctx.hoverGrpId);

    let newImg;
    try {
      newImg = `url(https://img.scryfall.com/cards${cardObj.images.normal}`;
    } catch (e) {
      newImg = `url(${NotFound})`;
    }
    return {
      opacity: ctx.hoverOpacity,
      backgroundImage: newImg
    };
  };

  const getStyleDfc = (ctx: AppState): React.CSSProperties => {
    let cardObj = db.card(ctx.hoverGrpId);
    let newImg = `url(${NotFound})`;
    let opacity = ctx.hoverOpacity;
    if (
      cardObj &&
      (cardObj.dfc == FACE_DFC_BACK || cardObj.dfc == FACE_DFC_FRONT) &&
      cardObj.dfcId
    ) {
      cardObj = db.card(cardObj.dfcId);
      try {
        newImg = `url(https://img.scryfall.com/cards${cardObj.images.normal}`;
      } catch (e) {
        newImg = `url(${NotFound})`;
      }
    } else {
      opacity = 0;
    }

    return {
      opacity: opacity,
      backgroundImage: newImg
    };
  };

  return (
    <>
      <div style={getStyleDfc(webContext)} className="card-hover-dfc" />
      <div style={getStyle(webContext)} className="card-hover-main" />
    </>
  );
}
