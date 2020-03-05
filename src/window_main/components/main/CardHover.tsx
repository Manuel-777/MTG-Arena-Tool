/* eslint-disable react/prop-types */
import React, { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import db from "../../../shared/database";
import pd from "../../../shared/PlayerData";
import { AppState } from "../../app/appState";
import { FACE_DFC_FRONT, FACE_DFC_BACK } from "../../../shared/constants";
const NotFound = "../images/notfound.png";
const NoCard = "../images/nocard.png";

function getFrontUrl(hoverGrpId: number): string {
  const cardObj = db.card(hoverGrpId);
  let newImg;
  try {
    const quality = pd.settings.cards_quality;
    newImg = `https://img.scryfall.com/cards${cardObj?.images[quality]}`;
  } catch (e) {
    newImg = NotFound;
  }
  return newImg;
}

function getBackUrl(hoverGrpId: number): string {
  let cardObj = db.card(hoverGrpId);
  let newImg;
  if (
    cardObj &&
    (cardObj.dfc == FACE_DFC_BACK || cardObj.dfc == FACE_DFC_FRONT) &&
    cardObj.dfcId
  ) {
    cardObj = db.card(cardObj.dfcId);
    try {
      const quality = pd.settings.cards_quality;
      newImg = `https://img.scryfall.com/cards${cardObj?.images[quality]}`;
    } catch (e) {
      newImg = NotFound;
    }
  }
  return newImg || NotFound;
}

export default function CardHover(): JSX.Element {
  const grpId = useSelector((state: AppState) => state.hover.grpId);
  const opacity = useSelector((state: AppState) => state.hover.opacity);
  const hoverSize = useSelector((state: AppState) => state.hover.size);
  const [frontLoaded, setFrontLoaded] = useState(false);
  const [backLoaded, setBackLoaded] = useState(false);

  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");

  const getStyle = useCallback(
    (
      hoverGrpId: number,
      hoverSize: number,
      opacity: number
    ): React.CSSProperties => {
      return {
        width: hoverSize + "px",
        height: hoverSize / 0.71808510638 + "px",
        top: `calc(100% - ${hoverSize / 0.71808510638 + 32}px)`,
        opacity: opacity,
        backgroundImage: `url(${frontLoaded ? frontUrl : NoCard})`
      };
    },
    [frontUrl, frontLoaded]
  );

  const getStyleDfc = useCallback(
    (
      hoverGrpId: number,
      hoverSize: number,
      opacity: number
    ): React.CSSProperties => {
      const cardObj = db.card(hoverGrpId);
      if (
        !(
          cardObj &&
          (cardObj.dfc == FACE_DFC_BACK || cardObj.dfc == FACE_DFC_FRONT) &&
          cardObj.dfcId
        )
      ) {
        opacity = 0;
      }

      return {
        width: hoverSize + "px",
        right: hoverSize + 48 + "px",
        height: hoverSize / 0.71808510638 + "px",
        top: `calc(100% - ${hoverSize / 0.71808510638 + 32}px)`,
        opacity: opacity,
        backgroundImage: `url(${backLoaded ? backUrl : NoCard})`
      };
    },
    [backUrl, backLoaded]
  );

  useEffect(() => {
    // Reset the image, begin new loading and clear state
    const front = getFrontUrl(grpId);
    const back = getBackUrl(grpId);
    setFrontLoaded(false);
    setBackLoaded(false);
    setFrontUrl("");
    setBackUrl("");
    const img = new Image();
    img.src = front;
    img.onload = (): void => {
      setFrontUrl(front);
      setFrontLoaded(true);
    };
    const imgb = new Image();
    imgb.src = back;
    imgb.onload = (): void => {
      setBackUrl(back);
      setBackLoaded(true);
    };
    return (): void => {
      img.onload = (): void => {};
      imgb.onload = (): void => {};
    };
  }, [grpId]);

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
