import styled from "styled-components";
import { SymbolBase } from "./SymbolBase";

function getTypeIconClass(type: string): string {
  if (type.includes("Land", 0)) return "type_lan";
  else if (type.includes("Creature", 0)) return "type_cre";
  else if (type.includes("Artifact", 0)) return "type_art";
  else if (type.includes("Enchantment", 0)) return "type_enc";
  else if (type.includes("Instant", 0)) return "type_ins";
  else if (type.includes("Sorcery", 0)) return "type_sor";
  else if (type.includes("Planeswalker", 0)) return "type_pla";
  else return "";
}

const TypeSymbolBase = styled(SymbolBase).attrs<TypeSymbolProps>(props => ({
  className: `wc_explore_cost ${getTypeIconClass(
    props.type
  )} ${props.className ?? ""}`
}))``;

interface TypeSymbolProps {
  type: string;
}

export const TypeSymbol = styled(TypeSymbolBase)<TypeSymbolProps>``;
