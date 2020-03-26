import styled from "styled-components";
import { SymbolBase } from "./SymbolBase";

const BinarySymbolBase = styled(SymbolBase).attrs<BinarySymbolProps>(props => ({
  className: `${props.className ?? ""} rarity_filter ${
    props.isOn ? "ontheplay" : "onthedraw"
  }`
}))``;

interface BinarySymbolProps {
  isOn: boolean;
}

export const BinarySymbol = styled(BinarySymbolBase)<BinarySymbolProps>``;
