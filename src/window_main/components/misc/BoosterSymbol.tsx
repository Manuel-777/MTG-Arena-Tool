import styled from "styled-components";
import { SymbolBase } from "./SymbolBase";

export const BoosterSymbol = styled(SymbolBase).attrs(props => ({
  className: `bo_explore_cost ${props.className ?? ""}`
}))``;
