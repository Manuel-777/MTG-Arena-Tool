import styled from "styled-components";
import { SymbolBase } from "./SymbolBase";

const RaritySymbolBase = styled(SymbolBase).attrs<RaritySymbolProps>(props => ({
  className: `rarity_filter wc_${props.rarity} ${props.className ?? ""}`
}))``;
interface RaritySymbolProps {
  rarity: string;
}

export const RaritySymbol = styled(RaritySymbolBase)<RaritySymbolProps>``;
