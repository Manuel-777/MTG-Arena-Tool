import _ from "lodash";
import React, { useRef, useState } from "react";
import format from "date-fns/format";
import isValid from "date-fns/isValid";
import styled from "styled-components";
import matchSorter from "match-sorter";

import { MANA, CARD_RARITIES } from "../../../shared/constants";
import { getCardArtCrop, toMMSS, toDDHHMMSS } from "../../../shared/util";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import pd from "../../../shared/player-data";

import {
  formatPercent,
  formatWinrateInterval,
  getWinrateClass,
  getTagColor,
  showColorpicker
} from "../../renderer-util";
import { createInput } from "../../../shared/dom-fns"; // TODO remove this
import ManaFilter, { ColorFilter } from "../../ManaFilter";

import Aggregator from "../../aggregator";
import { CSSTransition } from "react-transition-group";

export interface CellProps {
  cell: any;
  openDeckCallback: (id: string) => void;
  archiveDeckCallback: (id: string) => void;
  tagDeckCallback: (deckid: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
}

export const StyledInputContainer = styled.div.attrs(props => ({
  className: props.className ? props.className : "" + " input_container"
}))`
  display: inline-flex;
  width: inherit;
  margin: inherit;
  height: 26px;
  padding-bottom: 4px;
  &.input_container input {
    margin: inherit;
  }
`;

export const StyledCheckboxContainer = styled.label.attrs(props => ({
  className: props.className
    ? props.className
    : "" + " check_container hover_label"
}))`
  display: inline-flex;
`;

export function TextBoxFilter({
  column: { id, filterValue, preFilteredRows, setFilter }
}: {
  column: any;
}): JSX.Element {
  const count = preFilteredRows.length;
  const prompt =
    id === "deckTileId" ? `Search ${count} decks...` : `Filter ${id}...`;
  return (
    <StyledInputContainer title={prompt}>
      <input
        value={filterValue || ""}
        onChange={(e): void => setFilter(e.target.value || undefined)}
        placeholder={prompt}
        style={{ width: "100%" }}
      />
    </StyledInputContainer>
  );
}

export function NumberRangeColumnFilter({
  column: { filterValue = [], preFilteredRows, setFilter, id }
}: {
  column: any;
}): JSX.Element {
  const [min, max] = React.useMemo(() => {
    let min = preFilteredRows.length ? preFilteredRows[0].values[id] : 0;
    let max = preFilteredRows.length ? preFilteredRows[0].values[id] : 0;
    preFilteredRows.forEach((row: any) => {
      min = Math.min(row.values[id], min);
      max = Math.max(row.values[id], max);
    });
    return [min, max];
  }, [id, preFilteredRows]);

  return (
    <StyledInputContainer>
      <input
        value={filterValue[0] || ""}
        type="number"
        onChange={(e): void => {
          const val = e.target.value;
          setFilter((old: number[] = []) => [
            val ? parseInt(val, 10) : undefined,
            old[1]
          ]);
        }}
        placeholder={`Min (${min})`}
        style={{
          width: "70px",
          marginRight: "0.5rem"
        }}
      />
      to
      <input
        value={filterValue[1] || ""}
        type="number"
        onChange={(e): void => {
          const val = e.target.value;
          setFilter((old: number[] = []) => [
            old[0],
            val ? parseInt(val, 10) : undefined
          ]);
        }}
        placeholder={`Max (${max})`}
        style={{
          width: "70px",
          marginLeft: "0.5rem"
        }}
      />
    </StyledInputContainer>
  );
}

export function fuzzyTextFilterFn(
  rows: any[],
  id: string,
  filterValue: string
): any[] {
  return matchSorter(rows, filterValue, { keys: ["values." + id] });
}

export function uberSearchFilterFn(
  rows: any[],
  id: string,
  filterValue: string
): any[] {
  const tokens = filterValue.split(" ");
  const matches = tokens.map(
    (token: string): any[] =>
      matchSorter(rows, token, {
        keys: [
          "values.deckId",
          "values.name",
          "values.format",
          "values.tags",
          (row: any): string => {
            const { colors } = row.values;
            return colors
              .map((color: number): string => (MANA as any)[color])
              .join(" ");
          }
        ]
      })
  );
  return _.intersection(...matches);
}

const defaultColors = Aggregator.getDefaultColorFilter();

export function ColorColumnFilter({
  column: { filterValue = { ...defaultColors }, setFilter }
}: {
  column: any;
}): JSX.Element {
  return (
    <ManaFilter
      prefixId={"decks_table"}
      filterKey={"colors"}
      filters={{ colors: filterValue }}
      onFilterChanged={(colors): void => {
        if (_.isMatch(colors, defaultColors)) {
          setFilter(undefined); // clear filter
        } else {
          setFilter(colors);
        }
      }}
    />
  );
}

export function colorsFilterFn(
  rows: any[],
  id: string,
  filterValue: ColorFilter
): any[] {
  return rows.filter(row =>
    Aggregator.filterDeckByColors(row.values, filterValue)
  );
}

export function ArchiveColumnFilter({
  column: { filterValue, setFilter }
}: {
  column: any;
}): JSX.Element {
  return (
    <StyledCheckboxContainer>
      show all
      <input
        type="checkbox"
        checked={filterValue !== "hideArchived"}
        onChange={(e): void => {
          const val = e.target.checked;
          setFilter(val ? "showArchived" : "hideArchived");
        }}
      />
      <span className={"checkmark"} />
    </StyledCheckboxContainer>
  );
}

export function archivedFilterFn(
  rows: any[],
  id: string,
  filterValue: string
): any[] {
  if (filterValue === "hideArchived") {
    return rows.filter(row => !row.values[id]);
  }
  return rows;
}

const StyledArtTileHeader = styled.div`
  width: 200px;
  margin: 0;
`;

interface StyledArtTileCellProps {
  url: string;
}

const StyledArtTileCell = styled(StyledArtTileHeader)<StyledArtTileCellProps>`
  cursor: pointer;
  background-image: url("${(props): string => props.url}");
  background-size: 200px;
  background-position-x: center;
  background-position-y: -10px;
  opacity: 0.66;
  height: 64px;
  width: 128px;
  &.deckTileHover-enter {
    opacity: 0.66;
    width: 128px;
  }
  &.deckTileHover-enter-active {
    opacity: 1;
    width: 200px;
    -webkit-transition: opacity 0.2s ease-in, width 0.2s ease-in;
    transition: opacity 0.2s ease-in, width 0.2s ease-in;
  }
  &.deckTileHover-enter-done {
    opacity: 1;
    width: 200px;
  }
  &.deckTileHover-exit {
    opacity: 1;
    width: 200px;
  }
  &.deckTileHover-exit-active {
    opacity: 0.66;
    width: 128px;
    -webkit-transition: opacity 0.2s ease-in, width 0.2s ease-in;
    transition: opacity 0.2s ease-in, width 0.2s ease-in;
  }
  &.deckTileHover-exit-done {
    opacity: 0.66;
    width: 128px;
  }
`;

export function ArtTileHeader(): JSX.Element {
  return <StyledArtTileHeader />;
}

export function ArtTileCell({
  cell,
  openDeckCallback
}: CellProps): JSX.Element {
  const data = cell.row.values;
  const [isHovered, setHovered] = useState(false);
  return (
    <CSSTransition
      classNames="deckTileHover"
      in={!!isHovered}
      timeout={200}
      onMouseEnter={(): void => setHovered(true)}
      onMouseLeave={(): void => setHovered(false)}
    >
      <StyledArtTileCell
        url={getCardArtCrop(cell.value)}
        title={`show ${data.name} details`}
        onClick={(): void => openDeckCallback(data.deckId)}
      />
    </CSSTransition>
  );
}

const StyledFlexLeftCell = styled.div`
  display: flex;
  justify-content: left;
  div {
    :last-child:not(.deck_tag_close) {
      margin-right: auto;
    }
  }
`;

const StyledFlexRightCell = styled.div`
  display: flex;
  justify-content: right;
  div {
    :first-child {
      margin-left: auto;
    }
  }
`;

export function ColorsHeader(): JSX.Element {
  return (
    <div style={{ display: "inline-block", minWidth: "146px" }}>Colors</div>
  );
}

export function ColorsCell({ cell }: CellProps): JSX.Element {
  const data = cell.row.values;
  return (
    <StyledFlexRightCell>
      {data.colors.map((color: number, index: number) => {
        return (
          <div
            key={index}
            className={"mana_s20 mana_" + (MANA as any)[color]}
          />
        );
      })}
    </StyledFlexRightCell>
  );
}

const LabelText = styled.div`
  display: inline-block;
  cursor: pointer;
  width: -webkit-fill-available;
  text-align: left;
`;

export function NameCell({ cell, openDeckCallback }: CellProps): JSX.Element {
  const data = cell.row.values;
  let displayName = cell.value;
  if (displayName.includes("?=?Loc/Decks/Precon/")) {
    displayName = displayName.replace("?=?Loc/Decks/Precon/", "");
  }
  if (displayName.length > 25) {
    displayName = displayName.slice(0, 22) + "...";
  }
  return (
    <LabelText
      title={`show ${cell.value} details`}
      onClick={(): void => openDeckCallback(data.deckId)}
    >
      {displayName}
    </LabelText>
  );
}

export const MetricText = styled.div`
  display: inline-block;
  line-height: 32px;
  font-family: var(--sub-font-name);
  color: var(--color-light);
  font-weight: 300;
`;

export function MetricCell({ cell }: CellProps): JSX.Element {
  return <MetricText>{cell.value}</MetricText>;
}

export function DatetimeCell({ cell }: CellProps): JSX.Element {
  const dateVal = new Date(cell.value);
  if (!isValid(dateVal)) {
    return <MetricText>--</MetricText>;
  }
  return (
    <MetricText>
      <RelativeTime datetime={dateVal.toISOString()} />
    </MetricText>
  );
}

export function WinRateCell({ cell }: CellProps): JSX.Element {
  const { total, interval, winrate, winrateLow, winrateHigh } = cell.row.values;
  if (!total) {
    return <MetricText title={"no data yet"}>--</MetricText>;
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

export function LastEditWinRateCell({ cell }: CellProps): JSX.Element {
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
    value = <span>--</span>;
    tooltip = "no data yet";
  }
  return <MetricText title={tooltip}>{value}</MetricText>;
}

export function DurationCell({ cell }: CellProps): JSX.Element {
  const data = cell.row.values;
  let value, tooltip;
  if (data.total) {
    value = <span>{toMMSS(cell.value)}</span>;
    tooltip = toDDHHMMSS(cell.value);
  } else {
    value = <span>--</span>;
    tooltip = "no data yet";
  }
  return <MetricText title={tooltip}>{value}</MetricText>;
}

interface StyledTagProps {
  backgroundColor: string;
  fontStyle: string;
}

const StyledTag = styled.div<StyledTagProps>`
  font-family: var(--sub-font-name);
  cursor: pointer;
  color: black;
  font-size: 13px;
  opacity: 1;
  margin-right: 12px;
  margin-bottom: 4px;
  height: 20px;
  line-height: 20px;
  text-indent: 8px;
  padding-right: 12px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  -webkit-transition: all 0.2s ease-in-out;
  background-color: ${({ backgroundColor }): string => backgroundColor};
  font-style: ${({ fontStyle }): string => fontStyle};
  :last-child {
    margin-right: 0;
  }
`;

const StyledTagWithClose = styled(StyledTag)`
  padding-right: 0;
`;

interface DeckTagProps {
  deckid: string;
  tag: string;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
}

function useColorpicker(
  containerRef: any,
  tag: string,
  backgroundColor: string,
  editTagCallback: (tag: string, color: string) => void
): (e: any) => void {
  return (e): void => {
    e.stopPropagation();
    showColorpicker(
      backgroundColor,
      (color: any) => {
        const container: any = containerRef.current;
        if (container) {
          container.style.backgroundColor = color.rgbString;
        }
      },
      (color: any) => editTagCallback(tag, color.rgbString),
      () => {
        const container: any = containerRef.current;
        if (container) {
          container.style.backgroundColor = backgroundColor;
        }
      }
    );
  };
}

function DeckTag({
  deckid,
  tag,
  editTagCallback,
  deleteTagCallback
}: DeckTagProps): JSX.Element {
  const backgroundColor = getTagColor(tag);
  const containerRef = useRef(null);
  return (
    <StyledTagWithClose
      backgroundColor={backgroundColor}
      fontStyle={"normal"}
      ref={containerRef}
      onClick={useColorpicker(
        containerRef,
        tag,
        backgroundColor,
        editTagCallback
      )}
    >
      {tag}
      <div
        className={"deck_tag_close"}
        onClick={(e): void => {
          e.stopPropagation();
          deleteTagCallback(deckid, tag);
        }}
      />
    </StyledTagWithClose>
  );
}

export function FormatCell({ cell, editTagCallback }: CellProps): JSX.Element {
  const backgroundColor = getTagColor(cell.value);
  const containerRef = useRef(null);
  return (
    <StyledFlexRightCell>
      <StyledTag
        backgroundColor={backgroundColor}
        fontStyle={"italic"}
        ref={containerRef}
        onClick={useColorpicker(
          containerRef,
          cell.value,
          backgroundColor,
          editTagCallback
        )}
      >
        {cell.value || "unknown"}
      </StyledTag>
    </StyledFlexRightCell>
  );
}

export function TagsCell({
  cell,
  deleteTagCallback,
  editTagCallback,
  tagDeckCallback
}: CellProps): JSX.Element {
  const backgroundColor = getTagColor();
  const data = cell.row.values;
  const containerRef = useRef(null);
  // TODO translate this into React
  const clickHandler = function(e: any): void {
    const container: any = containerRef.current;
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
    <StyledFlexLeftCell>
      {cell.value.map((tag: string) => (
        <DeckTag
          deckid={data.deckId}
          tag={tag}
          key={tag}
          editTagCallback={editTagCallback}
          deleteTagCallback={deleteTagCallback}
        />
      ))}
      <StyledTag
        ref={containerRef}
        backgroundColor={backgroundColor}
        style={{ opacity: 0.6 }}
        fontStyle={"italic"}
        onClick={clickHandler}
      >
        Add
      </StyledTag>
    </StyledFlexLeftCell>
  );
}

export function MissingCardsCell({ cell }: CellProps): JSX.Element {
  if (!cell.value) {
    return <></>;
  }
  const data = cell.row.values;
  const ownedWildcards = {
    common: pd.economy.wcCommon,
    uncommon: pd.economy.wcUncommon,
    rare: pd.economy.wcRare,
    mythic: pd.economy.wcMythic
  };
  return (
    <StyledFlexRightCell>
      {CARD_RARITIES.map(cardRarity => {
        if (cardRarity === "land" || !data[cardRarity]) {
          return;
        }
        return (
          <div
            key={cardRarity}
            className={"wc_explore_cost wc_" + cardRarity}
            title={_.capitalize(cardRarity) + " wildcards needed."}
          >
            {(ownedWildcards[cardRarity] > 0
              ? ownedWildcards[cardRarity] + "/"
              : "") + data[cardRarity]}
          </div>
        );
      })}
      <div
        key={"booster"}
        className={"bo_explore_cost"}
        title={"Boosters needed (estimated)"}
      >
        {Math.round(cell.value)}
      </div>
    </StyledFlexRightCell>
  );
}

interface StyledArchivedCellProps {
  archived: boolean;
}

const StyledArchiveDiv = styled.div`
  display: inline-block;
  cursor: pointer;
  width: 32px;
  min-height: 32px;
  margin-left: 8px;
  overflow: hidden;
  background: url(../images/show.png) no-repeat left;
  -webkit-transition: all 0.25s cubic-bezier(0.2, 0.5, 0.35, 1);
  vertical-align: middle;
`;

export function ArchiveHeader(): JSX.Element {
  return (
    <StyledArchiveDiv
      title={`archive/restore
(deck must no longer be in Arena)`}
    />
  );
}

const StyledArchivedCell = styled(StyledArchiveDiv)<StyledArchivedCellProps>`
  background: var(
      ${(props): string => (props.archived ? "--color-g" : "--color-r")}
    )
    url(../images/${(props): string => (props.archived ? "show.png" : "hide.png")})
    no-repeat left;
`;

export function ArchivedCell({
  cell,
  archiveDeckCallback
}: CellProps): JSX.Element {
  const isArchived = !!cell.value;
  const data = cell.row.values;
  if (!data.custom) {
    return <></>;
  }
  return (
    <StyledArchivedCell
      archived={isArchived}
      title={isArchived ? "restore" : "archive (will not delete data)"}
      onClick={(): void => {
        archiveDeckCallback(data.deckId);
      }}
    />
  );
}
