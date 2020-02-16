/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { ipcSend } from "../../renderer-util";
import pd from "../../../shared/player-data";
import _ from "lodash";
import { ReactSelect } from "../../../shared/ReactSelect";
import { CARD_TILE_ARENA, CARD_TILE_FLAT } from "../../../shared/constants";
import CardTile from "../../../shared/CardTile";
import db from "../../../shared/database";

function getCardStyleName(style: any): string {
  if (style == CARD_TILE_FLAT) return "Flat";
  return "Arena";
}

function setCardStyle(style: string): void {
  ipcSend("save_user_settings", { card_tile_style: style });
}

const card = db.card(67518);

export default function SectionVisual(): JSX.Element {
  return (
    <>
      <label className="but_container_label">
        List style:
        <ReactSelect
          style={{ width: "180px", marginLeft: "32px" }}
          options={[CARD_TILE_ARENA, CARD_TILE_FLAT]}
          current={pd.settings.card_tile_style}
          optionFormatter={getCardStyleName}
          callback={setCardStyle}
        />
        <div style={{ width: "auto" }}>
          {card ? (
            <CardTile
              card={card}
              indent="a"
              isHighlighted={false}
              isSideboard={false}
              quantity={4}
              showWildcards={false}
              style={pd.settings.card_tile_style}
            />
          ) : (
            <></>
          )}
        </div>
      </label>
    </>
  );
}
