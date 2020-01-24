import React, { ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import { getCardArtCrop } from "../../shared/util";

const NO_IMG_URL = "./images/nocard.png";

export type SplitNode = {
  top: ReactNode;
  bottom: ReactNode;
  after?: ReactNode;
};
export type ListItemSection = ReactNode | SplitNode;
export interface ListItemProps {
  grpId?: number;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  left?: ListItemSection;
  center?: ListItemSection;
  right?: ListItemSection;
  onClickDelete?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  archived?: boolean;
}

function isSplitNode(section: ListItemSection): section is SplitNode {
  return !!section && typeof section === "object" && "top" in section;
}

function ItemSection({
  section,
  className
}: {
  section: ListItemSection;
  className: string;
}): JSX.Element {
  return isSplitNode(section) ? (
    <>
      <div className={className} style={{ flexDirection: "column" }}>
        <div className={"flex_top"}>{section.top}</div>
        <div className={"flex_bottom"}>{section.bottom}</div>
      </div>
      {section.after}
    </>
  ) : (
    <div className={className}>{section}</div>
  );
}

export default function ListItem({
  grpId,
  title,
  onClick,
  left,
  center,
  right,
  onClickDelete,
  archived
}: ListItemProps): JSX.Element {
  const [hover, setHover] = React.useState(false);
  const mouseEnter = React.useCallback(() => {
    setHover(true);
  }, []);
  const mouseLeave = React.useCallback(() => {
    setHover(false);
  }, []);
  const backgroundImage = `url(${grpId ? getCardArtCrop(grpId) : NO_IMG_URL})`;
  const archiveClass = archived ? "list_item_unarchive" : "list_item_archive";
  const archiveTitle = archived ? "restore" : "archive (will not delete data)";
  return (
    <div
      className={"list_item_container"}
      onClick={onClick}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      title={title}
    >
      <CSSTransition
        classNames="list_item_image_hover"
        in={!!hover}
        timeout={0}
      >
        <div className={"list_item_image"} style={{ backgroundImage }} />
      </CSSTransition>
      <ItemSection section={left} className={"list_item_left"} />
      <ItemSection section={center} className={"list_item_center"} />
      <ItemSection section={right} className={"list_item_right"} />
      {!!onClickDelete && (
        <CSSTransition
          classNames="list_item_archive_hover"
          in={!!hover}
          timeout={0}
        >
          <div
            className={archiveClass}
            title={archiveTitle}
            onClick={(
              event: React.MouseEvent<HTMLDivElement, MouseEvent>
            ): void => {
              event.stopPropagation();
              onClickDelete(event);
            }}
          />
        </CSSTransition>
      )}
    </div>
  );
}
