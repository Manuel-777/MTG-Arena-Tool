import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import db from "../../../shared/database-wrapper";
import { AppState } from "../../../shared/redux/stores/rendererStore";
import OwnershipStars from "../../../shared/OwnershipStars";

import notFound from "../../../assets/images/notfound.png";
import NoCard from "../../../assets/images/nocard.png";
import sharedCss from "../../../shared/shared.css";
import { constants } from "mtgatool-shared";
const {
  FACE_DFC_FRONT,
  FACE_DFC_BACK,
  FACE_MODAL_BACK,
  FACE_MODAL_FRONT,
} = constants;

function getFrontUrl(hoverGrpId: number, quality: string): string {
  const cardObj = db.card(hoverGrpId);
  let newImg;
  try {
    newImg = cardObj?.images[quality] || notFound;
  } catch (e) {
    newImg = notFound;
  }
  return newImg;
}

function getBackUrl(hoverGrpId: number, quality: string): string {
  let cardObj = db.card(hoverGrpId);
  let newImg;
  if (
    cardObj &&
    (cardObj.dfc == FACE_DFC_BACK ||
      cardObj.dfc == FACE_DFC_FRONT ||
      cardObj.dfc == FACE_MODAL_BACK ||
      cardObj.dfc == FACE_MODAL_FRONT) &&
    cardObj.dfcId &&
    cardObj.dfcId !== true
  ) {
    cardObj = db.card(cardObj.dfcId);
    try {
      newImg = cardObj?.images[quality];
    } catch (e) {
      newImg = notFound;
    }
  }
  return newImg || notFound;
}

export default function CardHover(): JSX.Element {
  const { grpId, opacity, wanted } = useSelector(
    (state: AppState) => state.hover
  );

  const quality = useSelector(
    (state: AppState) => state.settings.cards_quality
  );
  const hoverSize = useSelector(
    (state: AppState) => state.settings.cards_size_hover_card
  );
  const card = db.card(grpId);
  const [frontLoaded, setFrontLoaded] = useState(0);
  const [backLoaded, setBackLoaded] = useState(0);
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");

  const size = 100 + hoverSize * 15;

  const styleFront = useMemo((): React.CSSProperties => {
    return {
      width: size + "px",
      height: size / 0.71808510638 + "px",
      top: `calc(100% - ${size / 0.71808510638 + 32}px)`,
      opacity: opacity,
      backgroundImage: `url(${frontLoaded == grpId ? frontUrl : NoCard})`,
    };
  }, [frontUrl, opacity, grpId, frontLoaded, size]);

  const styleDfc = useMemo((): React.CSSProperties => {
    const cardObj = db.card(grpId);
    let op = opacity;
    if (
      !(
        cardObj &&
        (cardObj.dfc == FACE_DFC_BACK ||
          cardObj.dfc == FACE_DFC_FRONT ||
          cardObj.dfc == FACE_MODAL_BACK ||
          cardObj.dfc == FACE_MODAL_FRONT) &&
        cardObj.dfcId
      )
    ) {
      op = 0;
    }

    return {
      width: size + "px",
      right: size + 48 + "px",
      height: size / 0.71808510638 + "px",
      top: `calc(100% - ${size / 0.71808510638 + 32}px)`,
      opacity: op,
      backgroundImage: `url(${backLoaded == grpId ? backUrl : NoCard})`,
    };
  }, [backUrl, opacity, grpId, backLoaded, size]);

  useEffect(() => {
    // Reset the image, begin new loading and clear state
    const front = getFrontUrl(grpId, quality);
    const back = getBackUrl(grpId, quality);
    const img = new Image();
    img.src = front;
    img.onload = (): void => {
      setFrontUrl(front);
      setFrontLoaded(grpId);
    };
    const imgb = new Image();
    imgb.src = back;
    imgb.onload = (): void => {
      if (back) {
        setBackUrl(back);
        setBackLoaded(grpId);
      }
    };
    return (): void => {
      img.onload = (): void => {};
      imgb.onload = (): void => {};
    };
  }, [grpId, quality]);

  return (
    <>
      <div style={styleDfc} className={sharedCss.cardHoverDfc} />
      <div style={styleFront} className={sharedCss.cardHoverMain}>
        {card ? (
          <div className={sharedCss.ownershipStarsContainer}>
            <OwnershipStars card={card} wanted={wanted} />
          </div>
        ) : (
          <></>
        )}
      </div>
    </>
  );
}
