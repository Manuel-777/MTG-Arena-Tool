import { getCardArtCrop } from "../shared/util";
import { createDiv } from "../shared/dom-fns";

class ListItem {
  private id: string;
  private container: HTMLDivElement;
  private left: HTMLDivElement;
  private right: HTMLDivElement;
  private center: HTMLDivElement;
  private deleteButton: HTMLDivElement;
  private imageContainer: HTMLDivElement;

  private leftTop: HTMLDivElement;
  private leftBottom: HTMLDivElement;

  private centerTop: HTMLDivElement;
  private centerBottom: HTMLDivElement;

  private rightTop: HTMLDivElement;
  private rightBottom: HTMLDivElement;

  constructor(
    grpId: number,
    id: string,
    onClick: (id: number | string) => void,
    onDelete?: (id: number | string) => void,
    isArchived = false
  ) {
    this.id = id;

    this.container = createDiv(["list_item_container", id]);
    this.left = createDiv(["list_item_left"]);
    this.center = createDiv(["list_item_center"]);
    this.right = createDiv(["list_item_right"]);
    const archiveClass = isArchived
      ? "list_item_unarchive"
      : "list_item_archive";
    this.deleteButton = createDiv([archiveClass]);
    this.deleteButton.title = isArchived
      ? "restore"
      : "archive (will not delete data)";
    this.imageContainer = createDiv(["list_item_image"]);
    this.imageContainer.style.backgroundImage = `url(${getCardArtCrop(grpId)})`;

    this.container.appendChild(this.imageContainer);
    this.container.appendChild(this.left);
    this.container.appendChild(this.center);
    this.container.appendChild(this.right);

    // Add event listeners
    // All of these should be stored and removed when we 'unmount' the class
    if (onDelete !== undefined) {
      this.container.appendChild(this.deleteButton);
      this.deleteButton.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        onDelete(this.id);
        if (!isArchived) {
          this.container.style.height = "0px";
          this.container.style.overflow = "hidden";
        }
        this.deleteButton.classList.add("hidden");
      });
    }

    this.imageContainer.style.opacity = "0.66";
    this.imageContainer.style.width = "128px";

    this.container.addEventListener("mouseover", () => {
      this.imageContainer.style.opacity = "1";
      this.imageContainer.style.width = "200px";
      this.deleteButton.style.width = "32px";
    });

    this.container.addEventListener("mouseout", () => {
      this.imageContainer.style.opacity = "0.66";
      this.imageContainer.style.width = "128px";
      this.deleteButton.style.width = "4px";
    });

    this.container.addEventListener("click", () => {
      onClick(this.id);
    });

    this.leftTop = createDiv(["flex_top"]);
    this.leftBottom = createDiv(["flex_bottom"]);

    this.centerTop = createDiv(["flex_top"]);
    this.centerBottom = createDiv(["flex_bottom"]);

    this.rightTop = createDiv(["flex_top"]);
    this.rightBottom = createDiv(["flex_bottom"]);

    return this;
  }

  divideLeft(): void {
    this.left.style.flexDirection = "column";
    this.left.appendChild(this.leftTop);
    this.left.appendChild(this.leftBottom);
  }

  divideCenter(): void {
    this.center.style.flexDirection = "column";
    this.center.appendChild(this.centerTop);
    this.center.appendChild(this.centerBottom);
  }

  divideRight(): void {
    this.right.style.flexDirection = "column";
    this.right.appendChild(this.rightTop);
    this.right.appendChild(this.rightBottom);
  }
}

export default ListItem;
