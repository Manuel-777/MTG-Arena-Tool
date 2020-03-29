import styled from "styled-components";
import { SymbolBase } from "./SymbolBase";

export const CalendarSymbol = styled(SymbolBase).attrs(props => ({
  className: `icon_2 ${props.className ?? ""}`
}))``;
