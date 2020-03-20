/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { ipcSend } from "../../rendererUtil";
import pd from "../../../shared/PlayerData";
import _ from "lodash";
import ReactSelect from "../../../shared/ReactSelect";
import { CARD_TILE_ARENA, CARD_TILE_FLAT } from "../../../shared/constants";
import CardTile from "../../../shared/CardTile";
import db from "../../../shared/database";
import Input from "../misc/Input";
import useColorPicker from "../../hooks/useColorPicker";
import Slider from "../misc/Slider";
import { getCardImage } from "../../../shared/util";
import { AppState } from "../../../shared/redux/reducers";
import { useSelector } from "react-redux";

function getCardStyleName(style: any): string {
  if (style == CARD_TILE_FLAT) return "Flat";
  return "Arena";
}

function setCardStyle(style: string): void {
  ipcSend("save_user_settings", { card_tile_style: style });
}

function changeBackgroundImage(value: string): void {
  ipcSend("save_user_settings", {
    back_url: value || "default"
  });
}

function backColorPicker(color: string): void {
  ipcSend("save_user_settings", { back_color: color });
}

function setCardQuality(filter: string): void {
  ipcSend("save_user_settings", { cards_quality: filter });
}

const card = db.card(70344);

export default function SectionVisual(): JSX.Element {
  const settings = useSelector((state: AppState) => state.settings);
  const containerRef: React.MutableRefObject<HTMLInputElement | null> = React.useRef(
    null
  );

  const [pickerColor, pickerDoShow, pickerElement] = useColorPicker(
    settings.back_color,
    undefined,
    backColorPicker
  );

  // Hover card size slider
  const [hoverCardSize, setHoverCardSize] = React.useState(
    settings.cards_size_hover_card
  );

  const hoverCardSizeDebouce = React.useCallback(
    _.debounce((value: number) => {
      ipcSend("save_user_settings", {
        cards_size_hover_card: value
      });
    }, 1000),
    []
  );

  const hoverCardSizeHandler = (value: number): void => {
    setHoverCardSize(value);
    hoverCardSizeDebouce(value);
  };

  // Collection card size slider
  const [collectionCardSize, setCollectionCardSize] = React.useState(
    settings.cards_size
  );

  const collectionCardSizeDebouce = React.useCallback(
    _.debounce((value: number) => {
      ipcSend("save_user_settings", {
        cards_size: value
      });
    }, 1000),
    []
  );

  const collectionCardSizeHandler = (value: number): void => {
    setCollectionCardSize(value);
    collectionCardSizeDebouce(value);
  };

  return (
    <>
      <div className="centered_setting_container">
        <label>Background URL:</label>
        <Input
          value={settings.back_url !== "default" ? settings.back_url : ""}
          placeholder="https://example.com/photo.png"
          callback={changeBackgroundImage}
        />
      </div>

      <label className="centered_setting_container">
        <span style={{ marginRight: "32px" }}>Background shade:</span>
        <input
          onClick={pickerDoShow}
          ref={containerRef}
          style={{ backgroundColor: pickerColor }}
          className="color_picker"
          id="flat"
          type="text"
          defaultValue=""
        ></input>
      </label>
      {pickerElement}
      <div className="centered_setting_container">
        <label>List style:</label>
        <ReactSelect
          options={[CARD_TILE_ARENA, CARD_TILE_FLAT]}
          current={settings.card_tile_style + ""}
          optionFormatter={getCardStyleName}
          callback={setCardStyle}
        />
      </div>
      <div className="centered_setting_container">
        {!!card && (
          <CardTile
            card={card}
            indent="a"
            isHighlighted={false}
            isSideboard={false}
            quantity={4}
            showWildcards={false}
          />
        )}
      </div>
      <div className="centered_setting_container">
        <label>Image quality:</label>
        <ReactSelect
          options={["small", "normal", "large"]}
          current={settings.cards_quality}
          callback={setCardQuality}
        />
      </div>
      <div className="centered_setting_container">
        <label style={{ width: "400px" }} className="card_size_container">
          {`Hover card size: ${100 + Math.round(hoverCardSize) * 15}px`}
        </label>
        <Slider
          min={0}
          max={20}
          step={1}
          value={settings.cards_size_hover_card}
          onChange={hoverCardSizeHandler}
        />
      </div>

      <div className="centered_setting_container">
        <label style={{ width: "400px" }} className="card_size_container">
          {`Collection card size: ${100 +
            Math.round(collectionCardSize) * 15}px`}
        </label>
        <Slider
          min={0}
          max={20}
          step={1}
          value={settings.cards_size}
          onChange={collectionCardSizeHandler}
        />
      </div>

      <label style={{ marginLeft: "16px" }}>
        Example collection card:
        <div
          className="inventory_card_settings"
          style={{
            marginTop: "16px",
            width: pd.cardsSize + "px",
            alignSelf: "flex-start"
          }}
        >
          <img
            className="inventory_card_settings_img"
            style={{ width: pd.cardsSize + "px" }}
            src={getCardImage(card)}
          />
        </div>
      </label>
    </>
  );
}
