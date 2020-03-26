import styled from "styled-components";

export const ArtTileHeader = styled.div`
  width: 200px;
  margin: 0 8px;
`;

export const ArtTile = styled(ArtTileHeader)`
  background-size: 100%;
  background-position-x: center;
  background-position-y: 10%;
  opacity: 0.7;
  height: 64px;
  width: 200px;
  -webkit-transition: all 0.2s cubic-bezier(0.35, 0.12, 0.5, 1);
  transition: all 0.2s cubic-bezier(0.35, 0.12, 0.5, 1);
  &.deckTileHover-enter {
    opacity: 0.7;
    background-size: 110%;
    background-position-y: 16%;
  }
  &.deckTileHover-enter-active {
    opacity: 1;
    background-size: 110%;
    background-position-y: 16%;
  }
  &.deckTileHover-enter-done {
    opacity: 1;
    background-size: 110%;
    background-position-y: 16%;
  }
  &.deckTileHover-exit {
    opacity: 1;
    background-size: 110%;
    background-position-y: 16%;
  }
  &.deckTileHover-exit-active {
    opacity: 0.7;
    background-size: 100%;
    background-position-y: 10%;
  }
  &.deckTileHover-exit-done {
    opacity: 0.75;
    background-size: 100%;
    background-position-y: 10%;
  }
`;
