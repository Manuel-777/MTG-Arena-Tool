import React from "react";
import styled from "styled-components";
import { MANA } from "../../../shared/constants";
import db from "../../../shared/database";
import { get_rank_index_16 as getRankIndex16 } from "../../../shared/util";
import { getTagColor } from "../../rendererUtil";
import AutosuggestInput from "../tables/AutosuggestInput";
import { TagCounts } from "../tables/types";
import useColorPicker from "../../hooks/useColorPicker";

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

export const FlexContainer = styled.div`
  display: flex;
  align-items: center;
  div {
    margin: auto 4px;
  }
`;

export const FlexLeftContainer = styled(FlexContainer)`
  justify-content: flex-start;
  margin-right: auto;
  div {
    :first-child:not(.deck_tag_close) {
      margin-left: 0;
    }
    :last-child:not(.deck_tag_close) {
      margin-right: auto;
    }
  }
`;

export const FlexCenterContainer = styled(FlexContainer)`
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
  div {
    :first-child:not(.deck_tag_close) {
      margin-left: auto;
    }
    :last-child:not(.deck_tag_close) {
      margin-right: auto;
    }
  }
`;

export const FlexRightContainer = styled(FlexContainer)`
  justify-content: flex-end;
  margin-left: auto;
  div {
    :first-child:not(.deck_tag_close) {
      margin-left: auto;
    }
  }
`;

export const LabelText = styled.div`
  display: inline-block;
  text-align: left;
  white-space: nowrap;
  color: var(--color-light);
`;

export interface BriefTextProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  maxLength?: number;
}

export function BriefText({
  value,
  maxLength,
  ...otherProps
}: BriefTextProps): JSX.Element {
  let displayName = value ?? "";
  const cutoff = maxLength ?? 25;
  if (displayName.length > cutoff) {
    displayName = displayName.slice(0, cutoff - 3) + "...";
  }
  return (
    <LabelText title={value} {...otherProps}>
      {displayName}
    </LabelText>
  );
}

export const MetricText = styled.div`
  display: inline-block;
  line-height: 32px;
  font-family: var(--sub-font-name);
  color: var(--color-light);
  font-weight: 300;
`;

interface TagBubbleDivProps {
  backgroundColor: string;
  fontStyle: string;
}

export const TagBubbleDiv = styled.div<TagBubbleDivProps>`
  font-family: var(--sub-font-name);
  cursor: pointer;
  color: black;
  font-size: 13px;
  white-space: nowrap;
  opacity: 0.8;
  margin-right: 12px;
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

const TagBubbleWithCloseDiv = styled(TagBubbleDiv)`
  padding-right: 0;
`;

interface TagBubbleProps {
  parentId: string;
  fontStyle?: string;
  hideCloseButton?: boolean;
  title?: string;
  tag: string;
  editTagCallback: (tag: string, color: string) => void;
  deleteTagCallback?: (deckid: string, tag: string) => void;
}

export function TagBubble({
  parentId,
  fontStyle,
  hideCloseButton,
  title,
  tag,
  editTagCallback,
  deleteTagCallback
}: TagBubbleProps): JSX.Element {
  const backgroundColor = getTagColor(tag);
  const containerRef: React.MutableRefObject<HTMLDivElement | null> = React.useRef(
    null
  );

  const editTag = (color: string): void => {
    editTagCallback(tag, color);
  };

  const [pickerColor, pickerDoShow, pickerElement] = useColorPicker(
    backgroundColor,
    editTag
  );

  const Renderer = hideCloseButton ? TagBubbleDiv : TagBubbleWithCloseDiv;
  return (
    <>
      <Renderer
        backgroundColor={pickerColor}
        fontStyle={fontStyle ?? "normal"}
        ref={containerRef}
        title={title ?? "change tag color"}
        onClick={(e): void => {
          e.stopPropagation();
          pickerDoShow();
        }}
      >
        {tag}
        {deleteTagCallback && !hideCloseButton && (
          <div
            className={"deck_tag_close"}
            title={"delete tag"}
            onClick={(e): void => {
              e.stopPropagation();
              deleteTagCallback(parentId, tag);
            }}
          />
        )}
      </Renderer>
      {pickerElement}
    </>
  );
}

interface NewTagProps {
  parentId: string;
  addTagCallback: (id: string, tag: string) => void;
  tagPrompt: string;
  tags: TagCounts;
  title?: string;
}

export function NewTag({
  parentId,
  addTagCallback,
  tagPrompt,
  tags,
  title
}: NewTagProps): JSX.Element {
  const backgroundColor = getTagColor();
  return (
    <TagBubbleDiv
      backgroundColor={backgroundColor}
      fontStyle={"italic"}
      title={title}
      onClick={(e): void => e.stopPropagation()}
    >
      <AutosuggestInput
        id={parentId}
        placeholder={tagPrompt}
        submitCallback={(val: string): void => addTagCallback(parentId, val)}
        tags={tags}
      />
    </TagBubbleDiv>
  );
}

const ManaSymbolBase = styled.div.attrs<ManaSymbolProps>(props => ({
  className: `mana_s16 mana_${MANA[props.colorIndex]} ${props.className ?? ""}`
}))``;

interface ManaSymbolProps {
  colorIndex: number;
}

export const ManaSymbol = styled(ManaSymbolBase)<ManaSymbolProps>``;

const SymbolBase = styled.div`
  line-height: initial;
  height: 20px;
  width: 20px;
  display: inline-block;
  background-size: contain;
  background-position: center;
  margin: auto 2px;
  vertical-align: middle;
`;

const RaritySymbolBase = styled(SymbolBase).attrs<RaritySymbolProps>(props => ({
  className: `rarity_filter wc_${props.rarity} ${props.className ?? ""}`
}))``;

interface RaritySymbolProps {
  rarity: string;
}

export const RaritySymbol = styled(RaritySymbolBase)<RaritySymbolProps>``;

const SetSymbolBase = styled(SymbolBase).attrs(props => ({
  className: `set_filter ${props.className ?? ""}`
}))``;

interface SetSymbolProps extends React.HTMLAttributes<HTMLDivElement> {
  set: string;
}

export function SetSymbol({
  set,
  style,
  ...otherProps
}: SetSymbolProps): JSX.Element {
  const setSvg =
    set === "other" || db.sets[set] == undefined
      ? db.defaultSet?.svg
      : db.sets[set].svg;
  return (
    <SetSymbolBase
      style={{
        ...style,
        backgroundImage: `url(data:image/svg+xml;base64,${setSvg})`
      }}
      {...otherProps}
    />
  );
}

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

const BinarySymbolBase = styled(SymbolBase).attrs<BinarySymbolProps>(props => ({
  className: `${props.className ?? ""} rarity_filter ${
    props.isOn ? "ontheplay" : "onthedraw"
  }`
}))``;

interface BinarySymbolProps {
  isOn: boolean;
}

export const BinarySymbol = styled(BinarySymbolBase)<BinarySymbolProps>``;

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

export const BoosterSymbol = styled(SymbolBase).attrs(props => ({
  className: `bo_explore_cost ${props.className ?? ""}`
}))``;

export const TicketSymbol = styled(SymbolBase).attrs(props => ({
  className: `economy_ticket ${props.className ?? ""}`
}))``;

export const CalendarSymbol = styled(SymbolBase).attrs(props => ({
  className: `icon_2 ${props.className ?? ""}`
}))``;

export const ArchiveSymbol = styled.div`
  border-radius: 50%;
  cursor: pointer;
  width: 30px;
  min-height: 24px;
  margin: auto;
  overflow: hidden;
  background: url(../images/show.png) no-repeat center;
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
    no-repeat center;
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

export const MediumTextButton = styled(SmallTextButton)`
  width: 180px;
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
