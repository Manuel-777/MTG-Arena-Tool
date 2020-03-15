import isValid from "date-fns/isValid";
import _ from "lodash";
import React from "react";
import { Cell, CellProps } from "react-table";
import LocalTime from "../../../shared/time-components/LocalTime";
import RelativeTime from "../../../shared/time-components/RelativeTime";
import { toDDHHMMSS, toMMSS } from "../../../shared/util";
import { formatNumber, formatPercent } from "../../rendererUtil";
import {
  ArchiveSymbol,
  BriefText,
  ColoredArchivedSymbol,
  FlexLeftContainer,
  LabelText,
  ManaSymbol,
  MetricText,
  NewTag,
  TagBubble
} from "../misc/display";
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
  return <BriefText value={cell.value} />;
}

export function TextCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  return <BriefText value={cell.value} maxLength={50} />;
}

export function SubTextCell<D extends TableData>({
  cell
}: CellProps<D>): JSX.Element {
  return (
    <BriefText
      value={cell.value}
      maxLength={50}
      style={{ fontFamily: "var(--main-font-name-it)", opacity: 0.5 }}
    />
  );
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
  return (
    <FlexLeftContainer>
      <TagBubble
        tag={cell.value}
        fontStyle={"italic"}
        hideCloseButton
        parentId={cell.row.original.id}
        editTagCallback={editTagCallback}
      />
    </FlexLeftContainer>
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
  const parent = cell.row.original;
  const parentId = parent.id;
  const [tagState, setTagState] = React.useState<Array<string>>(cell.value);
  React.useEffect(() => setTagState(cell.value), [cell.value]);
  const deleteTag = React.useCallback(
    (id: string, tag: string): void => {
      setTagState(_.without(tagState, tag));
      deleteTagCallback(id, tag);
    },
    [deleteTagCallback, tagState]
  );
  const addTag = React.useCallback(
    (id: string, tag: string): void => {
      setTagState([...tagState, tag]);
      addTagCallback(id, tag);
    },
    [addTagCallback, tagState]
  );
  return (
    <FlexLeftContainer style={{ flexWrap: "wrap" }}>
      {tagState.map((tag: string) => (
        <TagBubble
          key={tag}
          tag={tag}
          parentId={parentId}
          editTagCallback={editTagCallback}
          deleteTagCallback={deleteTag}
        />
      ))}
      {(tagState.length === 0 || !disallowMultiple) && (
        <NewTag
          parentId={parentId}
          addTagCallback={addTag}
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
