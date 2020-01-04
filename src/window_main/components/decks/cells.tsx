import _ from "lodash";
import React from "react";
import format from "date-fns/format";
import isValid from "date-fns/isValid";

import { CARD_RARITIES } from "../../../shared/constants";
import { toMMSS, toDDHHMMSS } from "../../../shared/util";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import pd from "../../../shared/player-data";
import { createInput } from "../../../shared/dom-fns"; // TODO remove this

import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass,
  getTagColor
} from "../../renderer-util";
import {
  ArtTile,
  FlexLeftContainer,
  LabelText,
  MetricText,
  TagBubble,
  TagBubbleWithClose,
  ArchiveSymbol,
  useColorpicker,
  ColoredArchivedSymbol,
  ManaSymbol,
  RaritySymbol,
  BoosterSymbol
} from "../display";
import { DecksTableCellProps } from "./types";

interface ArtTileCellProps {
  url: string;
  className?: string;
}

export function ArtTileCell({
  url,
  ...otherProps
}: ArtTileCellProps): JSX.Element {
  return (
    <ArtTile style={{ backgroundImage: `url("${url}")` }} {...otherProps} />
  );
}

export function ColorsCell({ cell }: DecksTableCellProps): JSX.Element {
  const data = cell.row.values;
  return (
    <FlexLeftContainer>
      {data.colors.map((color: number, index: number) => {
        return <ManaSymbol key={index} colorIndex={color} />;
      })}
    </FlexLeftContainer>
  );
}

export function NameCell({ cell }: DecksTableCellProps): JSX.Element {
  let displayName = cell.value;
  if (displayName.includes("?=?Loc/Decks/Precon/")) {
    displayName = displayName.replace("?=?Loc/Decks/Precon/", "");
  }
  if (displayName.length > 25) {
    displayName = displayName.slice(0, 22) + "...";
  }
  return <LabelText>{displayName}</LabelText>;
}

export function MetricCell({ cell }: DecksTableCellProps): JSX.Element {
  return <MetricText>{cell.value}</MetricText>;
}

export function DatetimeCell({ cell }: DecksTableCellProps): JSX.Element {
  const dateVal = new Date(cell.value);
  if (!isValid(dateVal)) {
    return <MetricText>-</MetricText>;
  }
  return (
    <MetricText>
      <RelativeTime datetime={dateVal.toISOString()} />
    </MetricText>
  );
}

export function WinRateCell({ cell }: DecksTableCellProps): JSX.Element {
  const { total, interval, winrate, winrateLow, winrateHigh } = cell.row.values;
  if (!total) {
    return <MetricText title={"no data yet"}>-</MetricText>;
  }
  let intervalDisplay, tooltip;
  if (total >= 20) {
    // sample size is large enough to use Wald Interval
    intervalDisplay = formatPercent(interval);
    tooltip = formatWinrateInterval(
      formatPercent(winrateLow),
      formatPercent(winrateHigh)
    );
  } else {
    // sample size is too small (garbage results)
    intervalDisplay = "???";
    tooltip = "play at least 20 matches to estimate actual winrate";
  }
  return (
    <MetricText title={tooltip}>
      <span className={getWinrateClass(winrate) + "_bright"}>
        {formatPercent(winrate)}
      </span>{" "}
      <i style={{ opacity: "0.6" }}>&plusmn; {intervalDisplay}</i>
    </MetricText>
  );
}

export function LastEditWinRateCell({
  cell
}: DecksTableCellProps): JSX.Element {
  const data = cell.row.values;
  let value, tooltip;
  if (data.lastEditTotal) {
    value = (
      <>
        {data.lastEditWins}:{data.lastEditLosses} (
        <span className={getWinrateClass(cell.value) + "_bright"}>
          {formatPercent(cell.value)}
        </span>
        )
      </>
    );
    tooltip = `${formatPercent(cell.value)} winrate since ${format(
      new Date(data.timeUpdated),
      "Pp"
    )}`;
  } else {
    value = <span>-</span>;
    tooltip = "no data yet";
  }
  return <MetricText title={tooltip}>{value}</MetricText>;
}

export function DurationCell({ cell }: DecksTableCellProps): JSX.Element {
  const data = cell.row.values;
  let value, tooltip;
  if (data.total) {
    value = <span>{toMMSS(cell.value)}</span>;
    tooltip = toDDHHMMSS(cell.value);
  } else {
    value = <span>-</span>;
    tooltip = "no data yet";
  }
  return <MetricText title={tooltip}>{value}</MetricText>;
}

export function FormatCell({
  cell,
  editTagCallback
}: DecksTableCellProps): JSX.Element {
  const backgroundColor = getTagColor(cell.value);
  const containerRef: React.MutableRefObject<HTMLDivElement | null> = React.useRef(
    null
  );
  return (
    <FlexLeftContainer>
      <TagBubble
        backgroundColor={backgroundColor}
        fontStyle={"italic"}
        ref={containerRef}
        title={"change tag color"}
        onClick={useColorpicker(
          containerRef,
          cell.value,
          backgroundColor,
          editTagCallback
        )}
      >
        {cell.value || "unknown"}
      </TagBubble>
    </FlexLeftContainer>
  );
}

export function TagsCell({
  cell,
  deleteTagCallback,
  editTagCallback,
  tagDeckCallback
}: DecksTableCellProps): JSX.Element {
  const backgroundColor = getTagColor();
  const data = cell.row.values;
  const containerRef: React.MutableRefObject<HTMLDivElement | null> = React.useRef(
    null
  );
  // TODO translate this into React
  const clickHandler = function(e: React.MouseEvent): void {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.innerHTML = "";
    const input = createInput(["deck_tag_input"], "", {
      type: "text",
      autocomplete: "off",
      placeholder: "Add",
      size: 1
    });
    input.addEventListener("keyup", function(e) {
      setTimeout(() => {
        input.style.width = input.value.length * 8 + "px";
      }, 10);
      if (e.keyCode === 13) {
        e.stopPropagation();
        input.blur();
      }
    });
    input.addEventListener("focusout", function() {
      const val = input.value;
      if (val && val !== "Add") {
        tagDeckCallback(data.deckId, val);
      }
    });
    container.appendChild(input);
    input.focus();
    e.stopPropagation();
  };
  return (
    <FlexLeftContainer>
      {cell.value.map((tag: string) => (
        <TagBubbleWithClose
          deckid={data.deckId}
          tag={tag}
          key={tag}
          editTagCallback={editTagCallback}
          deleteTagCallback={deleteTagCallback}
        />
      ))}
      <TagBubble
        ref={containerRef}
        backgroundColor={backgroundColor}
        style={{ opacity: 0.6 }}
        fontStyle={"italic"}
        title={"add new tag"}
        onClick={clickHandler}
      >
        Add
      </TagBubble>
    </FlexLeftContainer>
  );
}

export function MissingCardsCell({ cell }: DecksTableCellProps): JSX.Element {
  if (!cell.value) {
    return (
      <FlexLeftContainer style={{ visibility: "hidden" }}>
        <MetricText>
          <BoosterSymbol /> 0
        </MetricText>
      </FlexLeftContainer>
    );
  }
  const data = cell.row.values;
  const ownedWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };
  return (
    <FlexLeftContainer>
      {CARD_RARITIES.map(cardRarity => {
        if (cardRarity === "land" || !data[cardRarity]) {
          return;
        }
        return (
          <MetricText
            key={cardRarity}
            title={_.capitalize(cardRarity) + " wildcards needed."}
            style={{ marginRight: "4px" }}
          >
            <RaritySymbol rarity={cardRarity} />{" "}
            {(ownedWildcards[cardRarity] > 0
              ? ownedWildcards[cardRarity] + "/"
              : "") + data[cardRarity]}
          </MetricText>
        );
      })}
      <MetricText title={"Boosters needed (estimated)"}>
        <BoosterSymbol /> {Math.round(cell.value)}
      </MetricText>
    </FlexLeftContainer>
  );
}

export function ArchiveHeader(): JSX.Element {
  return (
    <ArchiveSymbol
      title={`archive/restore
(deck must no longer be in Arena)`}
    />
  );
}

export function ArchivedCell({
  cell,
  archiveDeckCallback
}: DecksTableCellProps): JSX.Element {
  const data = cell.row.values;
  const isArchived = data.archived;
  if (!data.custom) {
    return <ArchiveSymbol style={{ visibility: "hidden" }} />;
  }
  return (
    <ColoredArchivedSymbol
      archived={isArchived}
      title={isArchived ? "restore" : "archive (will not delete data)"}
      onClick={(e): void => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        archiveDeckCallback(data.deckId);
      }}
    />
  );
}
