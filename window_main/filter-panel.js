"use strict";
/*
globals
  Aggregator,
  createDivision,
  createSelect,
  doesDeckStillExist,
  getReadableEvent,
  getReadableFormat,
  getRecentDeckName,
  getTagColor,
  orderedColorCodes,
  orderedColorCodesCommon
*/

const {
  DEFAULT_ARCH,
  DEFAULT_DECK,
  DEFAULT_TAG,
  DATE_LAST_30,
  DATE_ALL_TIME,
  DATE_SEASON
} = Aggregator;

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
    showArchivedFilter
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
    this.getTagString = this.getTagString.bind(this);
    this.getDeckString = this.getDeckString.bind(this);
    return this;
  }

  getTagString(tag, showCount = false) {
    if (tag === DEFAULT_TAG) return tag;
    if (tag === DEFAULT_ARCH) return tag;
    const color = getTagColor(tag);
    const margins = "margin: 5px; margin-right: 30px;";
    const style = `white-space: nowrap; background-color:${color}; color: black; padding-right: 12px; ${margins}`;
    let tagString = getReadableFormat(tag);
    if (showCount && tag in this.archCounts) {
      tagString += ` (${this.archCounts[tag]})`;
    }
    return `<div class="deck_tag" style="${style}">${tagString}</div>`;
  }

  getDeckString(deckId) {
    if (deckId === DEFAULT_DECK) return deckId;
    const matches = this.decks.filter(_deck => _deck.id === deckId);
    if (matches.length === 0) return deckId;
    const deck = matches[0];

    const deckExists = doesDeckStillExist(deckId);

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
            orderedColorCodes[color - 1]
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
    const container = createDivision([this.prefixId + "_filter"]);
    container.style.display = "flex";
    container.style.width = "100%";
    container.style.alignItems = "center";
    container.style.justifyContent = "space-between";

    const columnA = createDivision([]);

    const dataCont = createDivision([]);

    dataCont.style.display = "flex";
    const dateSelect = createSelect(
      dataCont,
      [DATE_ALL_TIME, DATE_SEASON, DATE_LAST_30],
      this.filters.date,
      filter => {
        this.filters.date = filter;
        this.onFilterChange({ date: filter }, this.filters);
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

    const showColumnB = this.tags.length || this.showManaFilter;
    if (showColumnB) {
      const columnB = createDivision([]);

      if (this.tags.length || this.decks.length) {
        const deckFiltersCont = createDivision([]);
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
          const deckSpacer = createDivision([]);
          deckSpacer.style.width = "180px";
          deckFiltersCont.appendChild(deckSpacer);
        }

        columnB.appendChild(deckFiltersCont);
      }

      if (this.showManaFilter) {
        const manas = createDivision([this.prefixId + "_query_mana"]);
        manas.style.display = "flex";
        manas.style.margin = "8px";
        manas.style.width = "150px";
        manas.style.height = "32px";
        orderedColorCodesCommon.forEach(code => {
          const filterClasses = ["mana_filter"];
          if (!this.filters.colors[code]) {
            filterClasses.push("mana_filter_on");
          }
          var manabutton = createDivision(filterClasses);
          manabutton.style.backgroundImage = `url(../images/${code}20.png)`;
          manabutton.style.width = "30px";
          manabutton.addEventListener("click", () => {
            if (manabutton.classList.contains("mana_filter_on")) {
              manabutton.classList.remove("mana_filter_on");
              this.filters.colors[code] = true;
            } else {
              manabutton.classList.add("mana_filter_on");
              this.filters.colors[code] = false;
            }
            const colors = this.filters.colors;
            this.onFilterChange({ colors }, this.filters);
          });
          manas.appendChild(manabutton);
        });
        columnB.appendChild(manas);
      }
      container.appendChild(columnB);
    }

    const showColumnC = this.archs.length || this.showOppManaFilter;
    if (showColumnC) {
      const columnC = createDivision([]);

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
        const manas = createDivision([this.prefixId + "_query_mana"]);
        manas.style.display = "flex";
        manas.style.margin = "8px";
        manas.style.width = "150px";
        manas.style.height = "32px";
        orderedColorCodesCommon.forEach(code => {
          const filterClasses = ["mana_filter"];
          if (!this.filters.oppColors[code]) {
            filterClasses.push("mana_filter_on");
          }
          var manabutton = createDivision(filterClasses);
          manabutton.style.backgroundImage = `url(../images/${code}20.png)`;
          manabutton.style.width = "30px";
          manabutton.addEventListener("click", () => {
            if (manabutton.classList.contains("mana_filter_on")) {
              manabutton.classList.remove("mana_filter_on");
              this.filters.oppColors[code] = true;
            } else {
              manabutton.classList.add("mana_filter_on");
              this.filters.oppColors[code] = false;
            }
            const oppColors = this.filters.oppColors;
            this.onFilterChange({ oppColors }, this.filters);
          });
          manas.appendChild(manabutton);
        });
        columnC.appendChild(manas);
      }
      container.appendChild(columnC);
    } else {
      // spacer
      const opSpacer = createDivision([]);
      opSpacer.style.width = "180px";
      container.appendChild(opSpacer);
    }

    return container;
  }
}

module.exports = FilterPanel;
