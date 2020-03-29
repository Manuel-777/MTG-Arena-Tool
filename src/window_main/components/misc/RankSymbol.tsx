import styled from "styled-components";
import { get_rank_index_16 as getRankIndex16 } from "../../../shared/util";
import { SymbolBase } from "./SymbolBase";

const RankSymbolBase = styled(SymbolBase).attrs<RankSymbolProps>(props => ({
  className: `${props.className ?? ""} rarity_filter ranks_16`,
  title: props.rank,
  style: {
    ...props.style,
    marginRight: "2px",
    height: "16px",
    width: "16px",
    backgroundSize: "initial",
    backgroundPosition: getRankIndex16(props.rank) * -16 + "px 0px"
  }
}))``;
interface RankSymbolProps {
  rank: string;
}

export const RankSymbol = styled(RankSymbolBase)<RankSymbolProps>``;
