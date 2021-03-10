import styled from "styled-components";

import showPng from "../../../assets/images/show.png";
import hidePng from "../../../assets/images/hide.png";

export const ArchiveSymbol = styled.div`
  border-radius: 50%;
  cursor: pointer;
  width: 30px;
  min-height: 24px;
  margin: auto;
  overflow: hidden;
  background: url(${showPng}) no-repeat center;
  background-size: contain;
  -webkit-transition: all 0.25s cubic-bezier(0.2, 0.5, 0.35, 1);
  vertical-align: middle;
  opacity: 0.8;
  &:hover {
    opacity: 1;
  }
`;

interface ColoredArchivedSymbolProps {
  archived: boolean;
}

export const ColoredArchivedSymbol = styled(
  ArchiveSymbol
)<ColoredArchivedSymbolProps>`
  background: var(
      ${(props): string => (props.archived ? "--color-g" : "--color-r")}
    )
    url(${(props): string => (props.archived ? showPng : hidePng)}) no-repeat
    center;
`;
