/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { ipcSend } from "../../renderer-util";
import pd from "../../../shared/player-data";
import _ from "lodash";
import { WrappedReactSelect } from "../../../shared/ReactSelect";
import { CARD_TILE_ARENA, CARD_TILE_FLAT } from "../../../shared/constants";
import CardTile from "../../../shared/CardTile";
import db from "../../../shared/database";
import Input from "../Input";
import useColorpicker from "../../hooks/useColorPicker";
import Slider from "../Slider";
import { getCardImage } from "../../../shared/util";

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
  const containerRef: React.MutableRefObject<HTMLInputElement | null> = React.useRef(
    null
  );
  const colorPicker = useColorpicker(
    containerRef,
    pd.settings.back_color,
    backColorPicker,
    { alpha: true }
  );

  // Hover card size slider
  const [hoverCardSize, setHoverCardSize] = React.useState(
    pd.settings.cards_size_hover_card
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
    pd.settings.cards_size
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
      <Input
        label="Background URL:"
        value={pd.settings.back_url !== "default" ? pd.settings.back_url : ""}
        placeholder="https://example.com/photo.png"
        callback={changeBackgroundImage}
      />

      <label className="but_container_label">
        <span style={{ marginRight: "32px" }}>Background shade:</span>
        <input
          onClick={colorPicker}
          ref={containerRef}
          style={{ backgroundColor: pd.settings.back_color }}
          className="color_picker"
          id="flat"
          type="text"
          defaultValue=""
        ></input>
      </label>

      <label className="but_container_label">
        List style:
        <WrappedReactSelect
          style={{ width: "180px", marginLeft: "32px" }}
          options={[CARD_TILE_ARENA, CARD_TILE_FLAT]}
          current={pd.settings.card_tile_style}
          optionFormatter={getCardStyleName}
          callback={setCardStyle}
        />
        <div style={{ width: "50%" }}>
          {!!card && (
            <CardTile
              card={card}
              indent="a"
              isHighlighted={false}
              isSideboard={false}
              quantity={4}
              showWildcards={false}
              style={parseInt(pd.settings.card_tile_style)}
            />
          )}
        </div>
      </label>

      <label className="but_container_label">
        Image quality:
        <WrappedReactSelect
          style={{ width: "180px", marginLeft: "32px" }}
          options={["small", "normal", "large"]}
          current={pd.settings.cards_quality}
          callback={setCardQuality}
        />
      </label>

      <div className="slidecontainer_settings">
        <label style={{ width: "400px" }} className="card_size_container">
          {`Hover card size: ${100 +
            Math.round(parseInt(hoverCardSize)) * 15}px`}
        </label>
        <Slider
          min={0}
          max={20}
          step={1}
          value={pd.settings.cards_size_hover_card}
          onChange={hoverCardSizeHandler}
        />
      </div>

      <div className="slidecontainer_settings">
        <label style={{ width: "400px" }} className="card_size_container">
          {`Collection card size: ${100 +
            Math.round(parseInt(collectionCardSize)) * 15}px`}
        </label>
        <Slider
          min={0}
          max={20}
          step={1}
          value={pd.settings.cards_size}
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
