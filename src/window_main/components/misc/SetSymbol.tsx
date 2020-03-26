import React from "react";
import styled from "styled-components";
import db from "../../../shared/database";
import { SymbolBase } from "./SymbolBase";

const SetSymbolBase = styled(SymbolBase).attrs(props => ({
  className: `set_filter ${props.className ?? ""}`
}))``;

interface SetSymbolProps extends React.HTMLAttributes<HTMLDivElement> {
  set: string;
}

export function SetSymbol({
  set,
  style,
  ...otherProps
}: SetSymbolProps): JSX.Element {
  const setSvg =
    set === "other" || db.sets[set] == undefined
      ? db.defaultSet?.svg
      : db.sets[set].svg;
  return (
    <SetSymbolBase
      style={{
        ...style,
        backgroundImage: `url(data:image/svg+xml;base64,${setSvg})`
      }}
      {...otherProps}
    />
  );
}
