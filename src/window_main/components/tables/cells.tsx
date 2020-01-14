import isValid from "date-fns/isValid";
import React from "react";
import { Cell, CellProps } from "react-table";
import LocalTime from "../../../shared/time-components/LocalTime";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import { toDDHHMMSS, toMMSS } from "../../../shared/util";
import { formatNumber, formatPercent, getTagColor } from "../../renderer-util";
import {
  ArchiveSymbol,
  ColoredArchivedSymbol,
  FlexLeftContainer,
  LabelText,
  ManaSymbol,
  MetricText,
  TagBubble,
  TagBubbleWithClose,
  useColorpicker
} from "../display";
import { TableData, TagCounts } from "./types";

export function ColorsCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  const data = cell.row.values;
  // assume data key is fooColors and cell.column.id is fooColorSortVal
  const key = cell.column.id.replace("SortVal", "s");
  const colors = data[key] ?? cell.value;
  return (
    <FlexLeftContainer>
      {colors.map((color: number, index: number) => {
        return <ManaSymbol key={index} colorIndex={color} />;
      })}
    </FlexLeftContainer>
  );
}

export function ShortTextCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  let displayName = cell.value ?? "";
  if (displayName.includes("?=?Loc/Decks/Precon/")) {
    displayName = displayName.replace("?=?Loc/Decks/Precon/", "");
  }
  if (displayName.length > 25) {
    displayName = displayName.slice(0, 22) + "...";
  }
  return <LabelText title={cell.value}>{displayName}</LabelText>;
}

export function TextCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  return <LabelText>{cell.value}</LabelText>;
}

export function MetricCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  return (
    <MetricText style={cell.value === 0 ? { opacity: 0.6 } : undefined}>
      {cell.value && formatNumber(cell.value)}
    </MetricText>
  );
}

export function PercentCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  const value = (cell.value ?? 0) / (cell.column.divideBy100 ? 100 : 1);
  return (
    <MetricText style={cell.value === 0 ? { opacity: 0.6 } : undefined}>
      {formatPercent(value, cell.column.percentFormatOptions)}
    </MetricText>
  );
}

export function LocalDateCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  const dateVal = new Date(cell.value);
  if (!isValid(dateVal)) {
    return <MetricText>-</MetricText>;
  }
  return (
    <MetricText>
      <LocalTime
        datetime={dateVal.toISOString()}
        year={"numeric"}
        month={"long"}
        day={"numeric"}
      />
    </MetricText>
  );
}

export function LocalTimeCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  const dateVal = new Date(cell.value);
  if (!isValid(dateVal)) {
    return <MetricText>-</MetricText>;
  }
  return (
    <MetricText>
      <LocalTime
        datetime={dateVal.toISOString()}
        hour={"numeric"}
        minute={"numeric"}
        second={"numeric"}
      />
    </MetricText>
  );
}

export function RelativeTimeCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
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

export function DurationCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  let value, tooltip;
  if (cell.value) {
    value = <span>{toMMSS(cell.value)}</span>;
    tooltip = toDDHHMMSS(cell.value);
  } else {
    value = <span>-</span>;
    tooltip = "no data yet";
  }
  return <MetricText title={tooltip}>{value}</MetricText>;
}

export function FormatCell<D extends TableData>({
  cell,
  editTagCallback
}: {
  cell: Cell<D>;
  editTagCallback: (tag: string, color: string) => void;
}): JSX.Element {
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

export function NewTag({
  parentId,
  addTagCallback,
  tagPrompt,
  tags,
  title
}: {
  parentId: string;
  addTagCallback: (id: string, tag: string) => void;
  tagPrompt: string;
  tags: TagCounts;
  title: string;
}): JSX.Element {
  const backgroundColor = getTagColor();
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <TagBubble
      backgroundColor={backgroundColor}
      style={{ opacity: 0.6 }}
      fontStyle={"italic"}
      title={title}
      onClick={(e): void => {
        inputRef.current?.focus();
        e.stopPropagation();
      }}
    >
      <input
        ref={inputRef}
        className={"deck_tag_input"}
        type={"text"}
        autoComplete={"off"}
        placeholder={tagPrompt}
        size={1}
        onBlur={(e): void => {
          const val = e.target.value;
          if (val && val !== tagPrompt) {
            addTagCallback(parentId, val);
          }
          e.target.value = "";
        }}
        onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>): void => {
          if (e.keyCode === 13) {
            inputRef.current?.blur();
            e.stopPropagation();
          } else {
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.style.width =
                  inputRef.current.value.length * 8 + "px";
              }
            }, 10);
          }
        }}
      />
    </TagBubble>
  );
}

export function TagsCell<D extends TableData>({
  cell,
  deleteTagCallback,
  editTagCallback,
  addTagCallback,
  disallowMultiple = false,
  tagPrompt = "Add",
  tags = [],
  title = "add new tag"
}: {
  cell: Cell<D>;
  addTagCallback: (id: string, tag: string) => void;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
  disallowMultiple?: boolean;
  tagPrompt?: string;
  tags?: TagCounts;
  title?: string;
}): JSX.Element {
  const parentId = cell.row.original.id;
  return (
    <FlexLeftContainer style={{ flexWrap: "wrap" }}>
      {cell.value.map((tag: string) => (
        <TagBubbleWithClose
          key={tag}
          tag={tag}
          parentId={parentId}
          editTagCallback={editTagCallback}
          deleteTagCallback={deleteTagCallback}
        />
      ))}
      {(cell.value.length === 0 || !disallowMultiple) && (
        <NewTag
          parentId={parentId}
          addTagCallback={addTagCallback}
          tagPrompt={tagPrompt}
          tags={tags}
          title={title}
        />
      )}
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

export function ArchivedCell<D extends TableData>({
  cell,
  archiveCallback
}: {
  cell: Cell<D>;
  archiveCallback: (id: string) => void;
}): JSX.Element {
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
        archiveCallback(data.id);
      }}
    />
  );
}

export function AggregatedContextCell<D extends TableData>({
  cell,
  countLabel
}: {
  cell: Cell<D>;
  countLabel: string;
}): JSX.Element {
  return (
    <LabelText>
      {cell.value} {countLabel}
    </LabelText>
  );
}
