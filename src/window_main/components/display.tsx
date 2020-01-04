import React from "react";
import styled from "styled-components";

import { MANA } from "../../shared/constants";

import { getTagColor, showColorpicker } from "../renderer-util";

export const ArtTileHeader = styled.div`
  width: 200px;
  margin: 0 8px;
`;

export const ArtTile = styled(ArtTileHeader)`
  background-size: 200px;
  background-position-x: center;
  background-position-y: -10px;
  opacity: 0.66;
  height: 64px;
  width: 160px;
  &.deckTileHover-enter {
    opacity: 0.66;
    width: 160px;
  }
  &.deckTileHover-enter-active {
    opacity: 1;
    width: 200px;
    -webkit-transition: opacity 0.2s ease-in, width 0.2s ease-in;
    transition: opacity 0.2s ease-in, width 0.2s ease-in;
  }
  &.deckTileHover-enter-done {
    opacity: 1;
    width: 200px;
  }
  &.deckTileHover-exit {
    opacity: 1;
    width: 200px;
  }
  &.deckTileHover-exit-active {
    opacity: 0.66;
    width: 160px;
    -webkit-transition: opacity 0.2s ease-in, width 0.2s ease-in;
    transition: opacity 0.2s ease-in, width 0.2s ease-in;
  }
  &.deckTileHover-exit-done {
    opacity: 0.66;
    width: 160px;
  }
`;

export const FlexLeftContainer = styled.div`
  display: flex;
  justify-content: left;
  div {
    :last-child:not(.deck_tag_close) {
      margin-right: auto;
    }
  }
`;

export const FlexRightContainer = styled.div`
  display: flex;
  justify-content: right;
  div {
    :first-child {
      margin-left: auto;
    }
  }
`;

export const LabelText = styled.div`
  display: inline-block;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
`;

export const MetricText = styled.div`
  display: inline-block;
  line-height: 32px;
  font-family: var(--sub-font-name);
  color: var(--color-light);
  font-weight: 300;
`;

interface TagBubbleProps {
  backgroundColor: string;
  fontStyle: string;
}

export const TagBubble = styled.div<TagBubbleProps>`
  font-family: var(--sub-font-name);
  cursor: pointer;
  color: black;
  font-size: 13px;
  opacity: 0.8;
  margin-right: 12px;
  margin-bottom: 4px;
  height: 20px;
  line-height: 20px;
  text-indent: 8px;
  padding-right: 12px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  -webkit-transition: all 0.2s ease-in-out;
  background-color: ${({ backgroundColor }): string => backgroundColor};
  font-style: ${({ fontStyle }): string => fontStyle};
  :last-child {
    margin-right: 0;
  }
  &:hover {
    opacity: 1;
  }
`;

const TagBubbleWithCloseContainer = styled(TagBubble)`
  padding-right: 0;
`;

export function useColorpicker(
  containerRef: React.MutableRefObject<HTMLElement | null>,
  tag: string,
  backgroundColor: string,
  editTagCallback: (tag: string, color: string) => void
): (e: React.MouseEvent) => void {
  return (e): void => {
    e.stopPropagation();
    showColorpicker(
      backgroundColor,
      (color: { rgbString: string }) => {
        const container = containerRef.current;
        if (container) {
          container.style.backgroundColor = color.rgbString;
        }
      },
      (color: { rgbString: string }) => editTagCallback(tag, color.rgbString),
      () => {
        const container = containerRef.current;
        if (container) {
          container.style.backgroundColor = backgroundColor;
        }
      }
    );
  };
}

interface TagBubbleWithCloseProps {
  deckid: string;
  tag: string;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback: (deckid: string, tag: string) => void;
}

export function TagBubbleWithClose({
  deckid,
  tag,
  editTagCallback,
  deleteTagCallback
}: TagBubbleWithCloseProps): JSX.Element {
  const backgroundColor = getTagColor(tag);
  const containerRef: React.MutableRefObject<HTMLDivElement | null> = React.useRef(
    null
  );
  return (
    <TagBubbleWithCloseContainer
      backgroundColor={backgroundColor}
      fontStyle={"normal"}
      ref={containerRef}
      title={"change tag color"}
      onClick={useColorpicker(
        containerRef,
        tag,
        backgroundColor,
        editTagCallback
      )}
    >
      {tag}
      <div
        className={"deck_tag_close"}
        title={"delete tag"}
        onClick={(e): void => {
          e.stopPropagation();
          deleteTagCallback(deckid, tag);
        }}
      />
    </TagBubbleWithCloseContainer>
  );
}

const ManaSymbolBase = styled.div.attrs<ManaSymbolProps>(props => ({
  className: `mana_s16 mana_${MANA[props.colorIndex]} ${props.className ?? ""}`
}))``;

interface ManaSymbolProps {
  colorIndex: number;
}

export const ManaSymbol = styled(ManaSymbolBase)<ManaSymbolProps>``;

export const ArchiveSymbol = styled.div`
  border-radius: 50%;
  cursor: pointer;
  width: 32px;
  min-height: 32px;
  margin: auto;
  overflow: hidden;
  background: url(../images/show.png) no-repeat left;
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

export const ColoredArchivedSymbol = styled(ArchiveSymbol)<
  ColoredArchivedSymbolProps
>`
  background: var(
      ${(props): string => (props.archived ? "--color-g" : "--color-r")}
    )
    url(../images/${(props): string => (props.archived ? "show.png" : "hide.png")})
    no-repeat left;
`;

export const InputContainer = styled.div.attrs(props => ({
  className: (props.className ?? "") + " input_container"
}))`
  display: inline-flex;
  margin: inherit;
  position: relative;
  width: 100%;
  height: 26px;
  padding-bottom: 4px;
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &.input_container input {
    margin: 0;
    width: calc(100% - 10px);
    padding: 2px 4px;
    position: absolute;
    left: 0;
    right: 0;
  }
  &:hover input {
    color: rgba(255, 255, 255, 1);
    background-color: var(--color-mid-50);
    border: 1px solid var(--color-light);
  }
`;

export const CheckboxContainer = styled.label.attrs(props => ({
  className: (props.className ?? "") + " check_container hover_label"
}))`
  display: inline-flex;
`;

export const SmallTextButton = styled(MetricText).attrs(props => ({
  className: (props.className ?? "") + " button_simple"
}))`
  margin: 0 4px 5px 4px;
  width: 90px;
`;

interface PagingButtonProps {
  selected?: boolean;
}

export const PagingButtonBase = styled.button.attrs<PagingButtonProps>(
  props => ({
    className:
      (props.className ?? "") +
      (props.disabled ? " paging_button_disabled" : " paging_button") +
      (props.selected ? " paging_active" : "")
  })
)`
  width: initial;
  height: initial;
  minwidth: 30px;
`;

export const PagingButton = styled(PagingButtonBase)<PagingButtonProps>``;
