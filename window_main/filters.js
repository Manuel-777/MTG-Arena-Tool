const format = require("date-fns/format");

const {
  COLORS_ALL,
  COLORS_BRIEF,
  DATE_LAST_30,
  DATE_LAST_DAY,
  DATE_ALL_TIME,
  DATE_SEASON
} = require("../shared/constants");
const pd = require("../shared/player-data");
const { createDiv, createLabel } = require("../shared/dom-fns");
const { createSelect } = require("../shared/select");
const { getReadableFormat, getRecentDeckName } = require("../shared/util");

const { getTagColor, ipcSend, showDatepicker } = require("./renderer-util");
const {
  DEFAULT_ARCH,
  DEFAULT_DECK,
  DEFAULT_TAG,
  NO_ARCH
} = require("./aggregator");

exports.getTagString = getTagString;
function getTagString(tag, archCounts) {
  if (tag === DEFAULT_TAG) return tag;
  if (tag === DEFAULT_ARCH) return tag;
  const color = getTagColor(tag);
  const margins = "margin: 5px; margin-right: 30px;";
  const style = `white-space: nowrap; background-color:${color}; color: black; padding-right: 12px; ${margins}`;
  let tagString = getReadableFormat(tag);
  if (archCounts && tag in archCounts) {
    tagString += ` (${archCounts[tag]})`;
  }
  if (tag === NO_ARCH) return tagString;
  return `<div class="deck_tag" style="${style}">${tagString}</div>`;
}

exports.renderDeckFilter = renderDeckFilter;
function renderDeckFilter(value, decks, onChange, container) {
  const getDeckString = deckId => {
    if (deckId === DEFAULT_DECK) return deckId;
    const matches = decks.filter(_deck => _deck.id === deckId);
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
  };

  return createSelect(
    container,
    decks.map(deck => deck.id),
    value,
    onChange,
    "select_filter",
    getDeckString
  );
}

exports.renderDateFilter = renderDateFilter;
function renderDateFilter(value, onChange, container) {
  const dateOptions = [
    DATE_ALL_TIME,
    DATE_SEASON,
    DATE_LAST_30,
    DATE_LAST_DAY,
    "Custom"
  ];
  let dateSelected = value;
  if (value && !dateOptions.includes(value)) {
    const prettyDate = "Since " + format(new Date(value), "PP");
    dateOptions.unshift(prettyDate);
    dateSelected = prettyDate;
  }
  const dateSelect = createSelect(
    container,
    dateOptions,
    dateSelected,
    filter => {
      if (filter === "Custom") {
        const lastWeek = new Date();
        lastWeek.setDate(new Date().getDate() - 7);
        showDatepicker(lastWeek, date => {
          const filter = date.toISOString();
          onChange(filter);
          ipcSend("save_user_settings", { last_date_filter: filter });
        });
      } else {
        onChange(filter);
        ipcSend("save_user_settings", { last_date_filter: filter });
      }
    },
    "select_filter"
  );
  return dateSelect;
}

exports.renderArchivedFilter = renderArchivedFilter;
function renderArchivedFilter(value, onChange, container) {
  const archiveCont = document.createElement("label");
  archiveCont.style.marginTop = "4px";
  archiveCont.classList.add("check_container", "hover_label");
  archiveCont.innerHTML = "archived";
  const archiveCheckbox = document.createElement("input");
  archiveCheckbox.type = "checkbox";
  archiveCheckbox.addEventListener("click", () => {
    onChange(archiveCheckbox.checked);
  });
  archiveCheckbox.checked = value;
  archiveCont.appendChild(archiveCheckbox);
  const archiveSpan = document.createElement("span");
  archiveSpan.classList.add("checkmark");
  archiveCont.appendChild(archiveSpan);
  if (container) container.appendChild(archiveCont);
  return archiveCont;
}

exports.renderManaFilter = renderManaFilter;
function renderManaFilter(value, onChange, container) {
  const filterLabels = {
    w: "White",
    u: "Blue",
    b: "Black",
    r: "Red",
    g: "Green",
    multi: "Allow unselected colors"
  };
  const colors = { ...value };
  const manas = createDiv([]);
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
      if (onChange) onChange(colors);
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
    if (onChange) onChange(colors);
  });
  manas.appendChild(manabutton);
  if (container) container.appendChild(manas);
  return manas;
}

exports.renderSortOption = renderSortOption;
function renderSortOption(value, onChange, container) {
  const sortDiv = createDiv([]);
  sortDiv.style.display = "flex";
  const sortLabel = createLabel(["filter_label"], "Sort:");
  sortDiv.appendChild(sortLabel);
  const sortSelect = createSelect(
    sortDiv,
    ["By Date", "By Wins", "By Winrate"],
    value,
    onChange
  );
  sortSelect.style.width = "151px";
  if (container) container.appendChild(sortDiv);
  return sortDiv;
}
