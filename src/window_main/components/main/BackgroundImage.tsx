import React from "react";
import fs from "fs";
import { AppState } from "../../../shared-redux/stores/rendererStore";
import { useSelector, useDispatch } from "react-redux";
import db from "../../../shared/database";
import { getCardArtCrop } from "../../../shared/util";
import { reduxAction } from "../../../shared-redux/sharedRedux";
import { IPC_NONE } from "../../../shared/constants";
const DEFAULT_BACKGROUND = "../images/Bedevil-Art.jpg";

export default function BackgroundImage(): JSX.Element {
  const dispatcher = useDispatch();
  const backgroundImage = useSelector(
    (state: AppState) => state.settings.back_url
  );
  const backgroundGrpId = useSelector(
    (state: AppState) => state.renderer.backgroundGrpId
  );
  const backgroundColor = useSelector(
    (state: AppState) => state.settings.back_color
  );

  const [image, setImage] = React.useState(DEFAULT_BACKGROUND);
  React.useEffect(() => {
    let image = backgroundImage;
    const card = db.card(backgroundGrpId);

    if (card) {
      // If card grpId exists
      image = getCardArtCrop(backgroundGrpId);
      reduxAction(
        dispatcher,
        "SET_TOPARTIST",
        `${card.name} by ${card.artist}`,
        IPC_NONE
      );
    } else if (backgroundImage == "" || backgroundImage == "default") {
      // If we selected default or empty
      image = DEFAULT_BACKGROUND;
      reduxAction(
        dispatcher,
        "SET_TOPARTIST",
        "Bedevil by Seb McKinnon",
        IPC_NONE
      );
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
      reduxAction(dispatcher, "SET_TOPARTIST", "", IPC_NONE);
    }
    setImage(`url(${image})`);
  }, [backgroundGrpId, backgroundImage, dispatcher]);

  const style = { backgroundImage: image, backgroundColor };

  return <div className="main_wrapper main_bg_image" style={style} />;
}
