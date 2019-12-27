import { createDiv } from "../shared/dom-fns";
import {
  setLocalState,
  showLoadingBars,
  hideLoadingBars
} from "./renderer-util";

class DataScroller {
  private container: HTMLElement;
  private renderData: (container: HTMLElement, index: number) => number;
  private loadAmount: number;
  private maxDataIndex: number;
  private loaded: number;
  private dataIndex: number;

  constructor(
    container: HTMLElement,
    renderData: (container: HTMLElement, index: number) => number,
    loadAmount = 20,
    maxDataIndex = 0
  ) {
    this.container = container;
    this.renderData = renderData;
    this.loadAmount = loadAmount;
    this.maxDataIndex = maxDataIndex;
    this.renderRows = this.renderRows.bind(this);

    this.loaded = 0;
    this.dataIndex = 0;

    return this;
  }

  render(loadMore: number, scrollTop: number): void {
    const d = createDiv(["list_fill"]);
    this.container.appendChild(d);
    this.loaded = 0;
    this.dataIndex = 0;

    this.renderRows(loadMore === 0 ? this.loadAmount : loadMore);

    this.container.scrollTop = scrollTop;

    const handler = (): void => {
      const newLs: { lastDataIndex: number; lastScrollTop: number } = {
        lastDataIndex: 0,
        lastScrollTop: 0
      };
      const desiredHeight = Math.round(
        this.container.scrollTop + this.container.offsetHeight
      );
      if (desiredHeight >= this.container.scrollHeight) {
        this.renderRows(this.loadAmount);
        newLs.lastDataIndex = this.dataIndex;
      }
      newLs.lastScrollTop = this.container.scrollTop;
      setLocalState(newLs);
    };
    this.container.addEventListener("scroll", handler);
    setLocalState({ lastScrollHandler: handler });
  }

  renderRows(loadMore: number): void {
    showLoadingBars();
    const loadEnd = this.loaded + loadMore;
    while (this.loaded < loadEnd && this.dataIndex < this.maxDataIndex) {
      this.loaded += this.renderData(this.container, this.dataIndex);
      this.dataIndex++;
    }
    hideLoadingBars();
  }
}

export default DataScroller;
