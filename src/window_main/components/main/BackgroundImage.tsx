import React, { useCallback } from "react";
import fs from "fs";
import { AppState } from "../../../shared/redux/appState";
import { useSelector, useDispatch } from "react-redux";
import db from "../../../shared/database";
import { getCardArtCrop } from "../../../shared/util";
import { dispatchAction, SET_TOP_ARTIST } from "../../../shared/redux/reducers";
const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";

export default function BackgroundImage(): JSX.Element {
  const dispatcher = useDispatch();
  const backgroundImage = useSelector(
    (state: AppState) => state.settings.back_url
  );
  const backgroundGrpId = useSelector(
    (state: AppState) => state.backgroundGrpId
  );
  const backgroundColor = useSelector(
    (state: AppState) => state.settings.back_color
  );

  const getImage = useCallback(() => {
    let image = backgroundImage;
    const card = db.card(backgroundGrpId);
    if (card) {
      // If card grpId exists
      image = getCardArtCrop(backgroundGrpId);
      dispatchAction(
        dispatcher,
        SET_TOP_ARTIST,
        `${card.name} by ${card.artist}`
      );
    } else if (backgroundImage == "" || backgroundImage == "default") {
      // If we selected default or empty
      image = DEFAULT_BACKGROUND;
      dispatchAction(dispatcher, SET_TOP_ARTIST, "Bedevil by Seb McKinnon");
    } else {
      if (fs.existsSync(backgroundImage)) {
        // Maybe its a local file then
        image = "url(" + backgroundImage + ")";
      } else {
        // Or a URL?
        const xhr = new XMLHttpRequest();
        xhr.open("HEAD", backgroundImage);
        xhr.onload = (): void => {
          if (xhr.status === 200) {
            image = "url(" + backgroundImage + ")";
          } else {
            image = "";
          }
        };
        xhr.send();
      }
      // We dont know who is the artist..
      dispatchAction(dispatcher, SET_TOP_ARTIST, "");
    }
    return `url(${image})`;
  }, [backgroundGrpId, backgroundImage, dispatcher]);

  return (
    <div
      className="main_wrapper main_bg_image"
      style={{ backgroundImage: getImage(), backgroundColor: backgroundColor }}
    ></div>
  );
}
