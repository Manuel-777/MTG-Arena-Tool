/*
  Not used / deprecated?
*/
import Aggregator from "./aggregator";
import React from "react";
import { getTagColor } from "./rendererUtil";
import { getReadableFormat } from "../shared/util";

export interface TagOptionProps {
  tag: string;
  showCount?: boolean;
  archCounts?: { [key: string]: number };
}

export default function TagOption(props: TagOptionProps) {
  const { tag, showCount, archCounts } = props;
  if (tag === Aggregator.DEFAULT_TAG) return tag;
  if (tag === Aggregator.DEFAULT_ARCH) return tag;
  const color = getTagColor(tag);
  const style: React.CSSProperties = {
    whiteSpace: "nowrap",
    backgroundColor: color,
    color: "black",
    paddingRight: "12px",
    margin: "5px",
    marginRight: "30px"
  };
  let tagString = getReadableFormat(tag);
  if (showCount && archCounts && tag in archCounts) {
    tagString += ` (${archCounts[tag]})`;
  }
  if (tag === Aggregator.NO_ARCH) return tagString;
  return (
    <div className={"deck_tag"} style={style}>
      {tagString}
    </div>
  );
}
