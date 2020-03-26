import styled from "styled-components";
import { MANA } from "../../../shared/constants";

const ManaSymbolBase = styled.div.attrs<ManaSymbolProps>(props => ({
  className: `mana_s16 mana_${MANA[props.colorIndex]} ${props.className ?? ""}`
}))``;
interface ManaSymbolProps {
  colorIndex: number;
}

export const ManaSymbol = styled(ManaSymbolBase)<ManaSymbolProps>``;
