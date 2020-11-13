import React from "react";
import styled from "styled-components";
import useColorPicker from "../../hooks/useColorPicker";
import { getTagColor } from "../../rendererUtil";
import AutosuggestInput from "../tables/AutosuggestInput";
import { TagCounts } from "../tables/types";
import indexCss from "../../index.css";

interface TagBubbleDivProps {
  backgroundColor: string;
  fontStyle: string;
}

const TagBubbleDiv = styled.div<TagBubbleDivProps>`
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
    opacity: 0.99;
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
  deleteTagCallback,
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
            className={indexCss.deck_tag_close}
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
  title,
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
