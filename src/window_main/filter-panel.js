import { COLORS_ALL, COLORS_BRIEF, DATE_LAST_30, DATE_LAST_DAY, DATE_ALL_TIME, DATE_SEASON } from 'common/constants';
import pd from 'common/player-data';
import { createDiv, createLabel } from 'common/dom-fns';
import { createSelect } from 'common/select';
import { getReadableEvent, getReadableFormat, getRecentDeckName, timeSince } from 'common/util';
import { getTagColor, ipcSend, showDatepicker } from './renderer-util';
import Aggregator from './aggregator';

class FilterPanel {
  constructor(
    prefixId,
    onFilterChange,
    filters,
    events,
    tags,
    decks,
    showManaFilter,
    archs,
    showOppManaFilter,
    archCounts,
    showArchivedFilter,
    showSortOption
  ) {
    this.prefixId = prefixId;
    this.onFilterChange = onFilterChange;
    this.filters = {
      ...Aggregator.getDefaultFilters(),
      ...filters
    };
    this.events = events || [];
    this.tags = tags || [];
    this.decks = decks || [];
    this.showManaFilter = showManaFilter || false;
    this.archs = archs || [];
    this.showOppManaFilter = showOppManaFilter || false;
    this.archCounts = archCounts || {};
    this.showArchivedFilter = showArchivedFilter || false;
    this.showSortOption = showSortOption || false;
    this.getTagString = this.getTagString.bind(this);
    this.getDeckString = this.getDeckString.bind(this);
    return this;
  }

  getTagString(tag, showCount = false) {
    if (tag === Aggregator.DEFAULT_TAG) return tag;
    if (tag === Aggregator.DEFAULT_ARCH) return tag;
    const color = getTagColor(tag);
    const margins = "margin: 5px; margin-right: 30px;";
    const style = `white-space: nowrap; background-color:${color}; color: black; padding-right: 12px; ${margins}`;
    let tagString = getReadableFormat(tag);
    if (showCount && tag in this.archCounts) {
      tagString += ` (${this.archCounts[tag]})`;
    }
    if (tag === Aggregator.NO_ARCH) return tagString;
    return `<div class="deck_tag" style="${style}">${tagString}</div>`;
  }

  getDeckString(deckId) {
    if (deckId === Aggregator.DEFAULT_DECK) return deckId;
    const matches = this.decks.filter(_deck => _deck.id === deckId);
    if (matches.length === 0) return deckId;
    const deck = matches[0];

    const deckExists = pd.deckExists(deckId);

    let deckName = deckExists ? getRecentDeckName(deckId) : deck.name;
    let maxChars = 10;
    if (deckExists && deck.colors) {
      maxChars = 16 - 2 * deck.colors.length;
    }

    if (deckName.length > maxChars) {
      deckName = `<abbr title="${deckName}">${deckName.slice(
        0,
        maxChars
      )}...</abbr>`;
    }

    if (deckExists) {
      let colorsString = "";
      if (deck.colors) {
        deck.colors.forEach(color => {
          colorsString += `<div class="mana_s16 mana_${
            COLORS_ALL[color - 1]
          }"></div>`;
        });
      }
      if (deck.archived) {
        deckName += "<small><i> (archived)</i></small>";
      }
      deckName += `<div class="flex_item">${colorsString}</div>`;
    } else {
      deckName += "<small><i> (deleted)</i></small>";
    }

    return deckName;
  }

  render() {
    const container = createDiv([this.prefixId + "_filter"]);
    container.style.display = "flex";
    container.style.width = "100%";
    container.style.alignItems = "center";
    container.style.justifyContent = "space-between";

    const columnA = createDiv([]);

    const dataCont = createDiv([]);

    const dateOptions = [
      DATE_ALL_TIME,
      DATE_SEASON,
      DATE_LAST_30,
      DATE_LAST_DAY,
      "Custom"
    ];
    let dateSelected = this.filters.date;
    if (this.filters.date && !dateOptions.includes(this.filters.date)) {
      const prettyDate = `Since ${new Date(this.filters.date).toDateString()}`;
      dateOptions.unshift(prettyDate);
      dateSelected = prettyDate;
    }

    dataCont.style.display = "flex";
    const dateSelect = createSelect(
      dataCont,
      dateOptions,
      dateSelected,
      filter => {
        if (filter === "Custom") {
          const lastWeek = new Date();
          lastWeek.setDate(new Date().getDate() - 7);
          showDatepicker(lastWeek, date => {
            const filter = date.toISOString();
            this.onFilterChange({ date: filter }, this.filters);
            ipcSend("save_user_settings", {
              last_date_filter: filter,
              skip_refresh: true
            });
          });
        } else {
          this.filters.date = filter;
          this.onFilterChange({ date: filter }, this.filters);
          ipcSend("save_user_settings", {
            last_date_filter: filter,
            skip_refresh: true
          });
        }
      },
      this.prefixId + "_query_date"
    );
    dateSelect.style.marginBottom = "8px";

    if (this.showArchivedFilter) {
      const archiveCont = document.createElement("label");
      archiveCont.style.marginTop = "4px";
      archiveCont.classList.add("check_container", "hover_label");
      archiveCont.innerHTML = "archived";
      const archiveCheckbox = document.createElement("input");
      archiveCheckbox.type = "checkbox";
      archiveCheckbox.id = this.prefixId + "_query_archived";
      archiveCheckbox.addEventListener("click", () => {
        const showArchived = archiveCheckbox.checked;
        this.filters.showArchived = showArchived;
        this.onFilterChange({ showArchived }, this.filters);
      });
      archiveCheckbox.checked = this.filters.showArchived;
      archiveCont.appendChild(archiveCheckbox);
      const archiveSpan = document.createElement("span");
      archiveSpan.classList.add("checkmark");
      archiveCont.appendChild(archiveSpan);
      dataCont.appendChild(archiveCont);
    }

    columnA.appendChild(dataCont);

    if (this.events.length) {
      const eventSelect = createSelect(
        columnA,
        this.events,
        this.filters.eventId,
        filter => {
          this.filters.eventId = filter;
          this.onFilterChange({ eventId: filter }, this.filters);
        },
        this.prefixId + "_query_event",
        getReadableEvent
      );
      eventSelect.style.marginBottom = "8px";
    }
    container.appendChild(columnA);

    const filterLabels = {
      w: "White",
      u: "Blue",
      b: "Black",
      r: "Red",
      g: "Green",
      multi: "Allow unselected colors"
    };
    const renderManaFilter = (filterKey, cont) => {
      const colors = this.filters[filterKey];
      const manas = createDiv([this.prefixId + "_query_mana"]);
      manas.style.display = "flex";
      manas.style.margin = "8px";
      manas.style.width = "150px";
      manas.style.height = "32px";
      COLORS_BRIEF.forEach(code => {
        const filterClasses = ["mana_filter"];
        if (!colors[code]) {
          filterClasses.push("mana_filter_on");
        }
        const manabutton = createDiv(filterClasses, "", {
          title: filterLabels[code]
        });
        manabutton.style.backgroundImage = `url(../images/${code}20.png)`;
        manabutton.style.width = "30px";
        manabutton.addEventListener("click", () => {
          if (manabutton.classList.contains("mana_filter_on")) {
            manabutton.classList.remove("mana_filter_on");
            colors[code] = true;
          } else {
            manabutton.classList.add("mana_filter_on");
            colors[code] = false;
          }
          this.onFilterChange({ [filterKey]: colors }, this.filters);
        });
        manas.appendChild(manabutton);
      });
      const code = "multi";
      const filterClasses = ["mana_filter", "icon_search_inclusive"];
      if (!colors[code]) {
        filterClasses.push("mana_filter_on");
      }
      const manabutton = createDiv(filterClasses, "", {
        title: filterLabels[code]
      });
      manabutton.style.width = "30px";
      manabutton.addEventListener("click", () => {
        if (manabutton.classList.contains("mana_filter_on")) {
          manabutton.classList.remove("mana_filter_on");
          colors[code] = true;
        } else {
          manabutton.classList.add("mana_filter_on");
          colors[code] = false;
        }
        this.onFilterChange({ [filterKey]: colors }, this.filters);
      });
      manas.appendChild(manabutton);
      cont.appendChild(manas);
    };

    const showColumnB = this.tags.length || this.showManaFilter;
    if (showColumnB) {
      const columnB = createDiv([]);

      if (this.tags.length || this.decks.length) {
        const deckFiltersCont = createDiv([]);
        deckFiltersCont.style.display = "flex";
        deckFiltersCont.style.width = "100%";
        deckFiltersCont.style.alignItems = "center";
        deckFiltersCont.style.justifyContent = "space-between";
        deckFiltersCont.style.marginBottom = "8px";

        if (this.tags.length) {
          const tagSelect = createSelect(
            deckFiltersCont,
            this.tags,
            this.filters.tag,
            filter => {
              this.filters.tag = filter;
              this.onFilterChange({ tag: filter }, this.filters);
            },
            this.prefixId + "_query_tag",
            this.getTagString
          );
          tagSelect.style.width = "180px";
        }
        if (this.decks.length) {
          const deckSelect = createSelect(
            deckFiltersCont,
            this.decks.map(deck => deck.id),
            this.filters.deckId,
            filter => {
              this.filters.deckId = filter;
              this.onFilterChange({ deckId: filter }, this.filters);
            },
            this.prefixId + "_query_deck",
            this.getDeckString
          );
          deckSelect.style.width = "180px";
        } else {
          const deckSpacer = createDiv([]);
          deckSpacer.style.width = "180px";
          deckFiltersCont.appendChild(deckSpacer);
        }

        columnB.appendChild(deckFiltersCont);
      }

      if (this.showManaFilter) {
        renderManaFilter("colors", columnB);
      }
      container.appendChild(columnB);
    }

    const showColumnC = this.archs.length || this.showOppManaFilter;
    if (showColumnC) {
      const columnC = createDiv([]);

      if (this.archs.length) {
        const archSelect = createSelect(
          columnC,
          this.archs,
          this.filters.arch,
          filter => {
            this.filters.arch = filter;
            this.onFilterChange({ arch: filter }, this.filters);
          },
          this.prefixId + "_query_optag",
          tag => this.getTagString(tag, true)
        );
        archSelect.style.width = "180px";
        archSelect.style.marginBottom = "8px";
      }

      if (this.showOppManaFilter) {
        renderManaFilter("oppColors", columnC);
      }
      container.appendChild(columnC);
    } else if (this.showSortOption) {
      const columnC = createDiv([]);

      const sortDiv = createDiv([]);
      sortDiv.style.display = "flex";
      const sortLabel = createLabel([], "Sort");
      sortLabel.style.marginTop = "7px";
      sortDiv.appendChild(sortLabel);
      const sortSelect = createSelect(
        sortDiv,
        ["By Date", "By Wins", "By Winrate", "By Incomplete"],
        this.filters.sort,
        filter => {
          this.filters.sort = filter;
          this.onFilterChange({ sort: filter }, this.filters);
        },
        this.prefixId + "_query_sort"
      );
      sortSelect.style.width = "150px";
      sortSelect.style.marginBottom = "8px";
      columnC.appendChild(sortDiv);

      const spacer = createDiv(["select_container"]);
      spacer.style.marginBottom = "8px";
      columnC.appendChild(spacer);

      container.appendChild(columnC);
    } else {
      // spacer
      const opSpacer = createDiv([]);
      opSpacer.style.width = "180px";
      container.appendChild(opSpacer);
    }

    return container;
  }
}

export default FilterPanel;
