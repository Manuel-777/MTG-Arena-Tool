import styled from "styled-components";
import { SymbolBase } from "./SymbolBase";

export const TicketSymbol = styled(SymbolBase).attrs(props => ({
  className: `economy_ticket ${props.className ?? ""}`
}))``;
