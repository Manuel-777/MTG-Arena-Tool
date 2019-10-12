import { createDiv } from 'common/dom-fns';
import { setLocalState, showLoadingBars, hideLoadingBars } from './renderer-util';

class DataScroller {
  constructor(container, renderData, loadAmount, maxDataIndex) {
    this.container = container;
    this.renderData = renderData;
    this.loadAmount = loadAmount || 20;
    this.maxDataIndex = maxDataIndex || 0;
    this.renderRows = this.renderRows.bind(this);
    return this;
  }

  render(loadMore, scrollTop) {
    const d = createDiv(["list_fill"]);
    this.container.appendChild(d);
    this.loaded = 0;
    this.dataIndex = 0;

    this.renderRows(loadMore || this.loadAmount);

    if (scrollTop) {
      this.container.scrollTop = scrollTop;
    }
    const handler = () => {
      const newLs = {};
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

  renderRows(loadMore) {
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
