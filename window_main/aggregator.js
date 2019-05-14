"use strict";
/*
globals
  compare_colors,
  compare_winrates,
  doesDeckStillExist,
  get_deck_colors,
  getDeck,
  getReadableEvent,
  getRecentDeckName,
  matchesHistory,
  orderedColorCodes,
  orderedColorCodesCommon,
  rankedEvents,
  season_starts
*/

// Default filter values
const DEFAULT_DECK = "All Decks";
const DEFAULT_EVENT = "All Events";
const DEFAULT_TAG = "All Tags";
const DEFAULT_ARCH = "All Archetypes";
// Ranked constants
const RANKED_CONST = "Ranked Constructed";
const RANKED_DRAFT = "Ranked Limited (Current)";
// Draft-related constants
const ALL_DRAFTS = "All Drafts";
const DRAFT_REPLAYS = "Draft Replays";
// Event-related constant
const ALL_EVENT_TRACKS = "All Event Tracks";
const SINGLE_MATCH_EVENTS = [
  "AIBotMatch",
  "DirectGame",
  "Play",
  "Ladder",
  "Traditional_Ladder"
];
// Date constants
const DATE_LAST_30 = "Last 30 Days";
const DATE_SEASON = "Current Season";
const DATE_ALL_TIME = "All Time";

const now = new Date();
const then = new Date();
then.setDate(now.getDate() - 30);
const DAYS_AGO_30 = then.toISOString();

const CONSTRUCTED_EVENTS = ["Ladder", "Traditional_Ladder"];

class Aggregator {
  constructor(filters) {
    this.filterDate = this.filterDate.bind(this);
    this.filterDeck = this.filterDeck.bind(this);
    this.filterEvent = this.filterEvent.bind(this);
    this.filterMatch = this.filterMatch.bind(this);
    this.updateFilters = this.updateFilters.bind(this);
    this.compareDecks = this.compareDecks.bind(this);
    this.compareEvents = this.compareEvents.bind(this);
    this.updateFilters(filters);
  }

  static createAllMatches() {
    return new Aggregator({ date: DATE_ALL_TIME });
  }

  static getDefaultColorFilter() {
    const colorFilters = {};
    orderedColorCodesCommon.forEach(code => (colorFilters[code] = false));
    return { ...colorFilters };
  }

  static getDefaultFilters() {
    return {
      eventId: DEFAULT_EVENT,
      tag: DEFAULT_TAG,
      colors: Aggregator.getDefaultColorFilter(),
      deckId: DEFAULT_DECK,
      onlyCurrentDecks: false,
      arch: DEFAULT_ARCH,
      oppColors: Aggregator.getDefaultColorFilter(),
      date: DATE_LAST_30,
      showArchived: false
    };
  }

  static isDraftMatch(match) {
    return (
      (match.eventId && match.eventId.includes("Draft")) ||
      (match.type && match.type === "draft")
    );
  }

  static gatherTags(_decks) {
    const tagSet = new Set();
    const formatSet = new Set();
    const counts = {};
    _decks.forEach(deck => {
      if (deck.tags) {
        deck.tags.forEach(tag => {
          tagSet.add(tag);
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
      if (deck.format) {
        formatSet.add(deck.format);
        counts[deck.format] = (counts[deck.format] || 0) + 1;
      }
    });
    const tagList = [...tagSet].filter(tag => tag && !formatSet.has(tag));
    tagList.sort(); // alpha sort instead of counts for now
    const formatList = [...formatSet];
    formatList.sort((a, b) => counts[b] - counts[a]);

    return [DEFAULT_TAG, ...tagList, ...formatList];
  }

  filterDate(_date) {
    const { date } = this.filters;
    let dateFilter = null;
    if (date === DATE_SEASON) {
      dateFilter = season_starts;
    } else if (date === DATE_LAST_30) {
      dateFilter = DAYS_AGO_30;
    } else {
      dateFilter = date;
    }
    return (
      date === DATE_ALL_TIME ||
      dateFilter === null ||
      new Date(_date) >= new Date(dateFilter)
    );
  }

  _filterDeckByColors(deck, _colors) {
    if (!deck) return true;

    // All decks pass when no colors are selected
    if (Object.values(_colors).every(val => val === false)) return true;

    // Normalize deck colors into matching data format
    let deckColorCodes = Aggregator.getDefaultColorFilter();
    if (deck.colors instanceof Array) {
      deck.colors.forEach(
        i => (deckColorCodes[orderedColorCodes[i - 1]] = true)
      );
    } else if (deck.colors instanceof Object) {
      deckColorCodes = deck.colors;
    }

    // If at least one color is selected, deck must match exactly
    for (const code in _colors) {
      if (_colors[code] !== deckColorCodes[code]) return false;
    }

    return true;
  }

  filterDeck(deck) {
    const {
      tag,
      colors,
      deckId,
      onlyCurrentDecks,
      showArchived
    } = this.filters;
    if (!deck) return deckId === DEFAULT_DECK;
    const passesDeckFilter = deckId === DEFAULT_DECK || deckId === deck.id;
    if (!passesDeckFilter) return false;

    const currentDeck = getDeck(deck.id);
    const passesArchiveFilter =
      !onlyCurrentDecks ||
      (currentDeck && (showArchived || !currentDeck.archived));
    if (!passesArchiveFilter) return false;

    const deckTags = [deck.format];
    if (deck.tags) {
      deckTags.push(...deck.tags);
    }
    if (currentDeck) {
      deckTags.push(currentDeck.format);
      if (currentDeck.tags) {
        deckTags.push(...currentDeck.tags);
      }
    }
    const passesTagFilter = tag === DEFAULT_TAG || deckTags.includes(tag);
    if (!passesTagFilter) return false;

    const passesColorFilter = this._filterDeckByColors(deck, colors);
    if (!passesColorFilter) return false;

    return true;
  }

  filterEvent(_eventId) {
    const { eventId } = this.filters;
    return (
      (eventId === DEFAULT_EVENT && _eventId !== "AIBotMatch") ||
      (eventId === ALL_EVENT_TRACKS &&
        !SINGLE_MATCH_EVENTS.includes(_eventId)) ||
      (eventId === RANKED_CONST && CONSTRUCTED_EVENTS.includes(_eventId)) ||
      (eventId === RANKED_DRAFT && rankedEvents.includes(_eventId)) ||
      eventId === _eventId
    );
  }

  filterMatch(match) {
    if (!match) return false;
    const { eventId, oppColors, arch, date, showArchived } = this.filters;
    if (!showArchived && match.archived && match.archived) return false;

    const passesEventFilter =
      this.filterEvent(match.eventId) ||
      (eventId === ALL_DRAFTS && Aggregator.isDraftMatch(match)) ||
      (eventId === DRAFT_REPLAYS && match.type === "draft");
    if (!passesEventFilter) return false;

    const passesPlayerDeckFilter = this.filterDeck(match.playerDeck);
    if (!passesPlayerDeckFilter) return false;

    const passesOppDeckFilter = this._filterDeckByColors(
      match.oppDeck,
      oppColors
    );
    if (!passesOppDeckFilter) return false;

    const matchTags = match.tags || ["Unknown"];
    const passesArchFilter =
      arch === DEFAULT_ARCH || (matchTags.length && arch === matchTags[0]);
    if (!passesArchFilter) return false;

    return this.filterDate(match.date);
  }

  updateFilters(filters = {}) {
    this.filters = {
      ...Aggregator.getDefaultFilters(),
      ...this.filters,
      ...filters
    };
    this._matches = matchesHistory.matches
      .map(matchId => matchesHistory[matchId])
      .filter(this.filterMatch);

    this._eventIds = [];
    const eventLastPlayed = {};
    this._decks = [];
    const deckMap = {};
    const deckLastPlayed = {};
    const deckWinrates = {};
    const deckRecentWinrates = {};
    const archCounts = {};
    let wins = 0;
    let loss = 0;
    let playWins = 0;
    let playLoss = 0;
    let drawWins = 0;
    let drawLoss = 0;
    let winrate = 0;
    let duration = 0;
    const colorsWinrates = [];
    const tagsWinrates = [];
    this._matches.forEach(match => {
      if (match.eventId) {
        let eventIsMoreRecent = true;
        if (match.eventId in eventLastPlayed) {
          eventIsMoreRecent = match.date > eventLastPlayed[match.eventId];
        }
        if (eventIsMoreRecent) {
          eventLastPlayed[match.eventId] = match.date;
        }
      }
      if (match.playerDeck && match.playerDeck.id) {
        const id = match.playerDeck.id;
        let deckIsMoreRecent = true;
        if (id in deckLastPlayed) {
          deckIsMoreRecent = match.date > deckLastPlayed[id];
        }
        if (deckIsMoreRecent) {
          deckMap[id] = match.playerDeck;
          deckLastPlayed[id] = match.date;
        }
      }
      // some of the data is wierd. Games which last years or have no data.
      if (match.duration && match.duration < 3600) {
        duration += match.duration;
      }
      if (match.player && match.opponent) {
        const computeDeckWinrate =
          match.playerDeck && doesDeckStillExist(match.playerDeck.id);
        let lastEdit, dId;
        if (computeDeckWinrate) {
          const currentDeck = getDeck(match.playerDeck.id);
          lastEdit = currentDeck.lastUpdated;
          dId = match.playerDeck.id;
          if (!(dId in deckWinrates)) {
            deckWinrates[dId] = { wins: 0, losses: 0, winrate: 0 };
          }
          if (!(dId in deckRecentWinrates)) {
            deckRecentWinrates[dId] = { wins: 0, losses: 0, winrate: 0 };
          }
        }
        if (match.player.win > match.opponent.win) {
          wins++;
          if (match.onThePlay) {
            let onThePlay = match.onThePlay == match.player.seat ? true : false;
            if (onThePlay) playWins++;
            else drawWins++;
          }
          if (computeDeckWinrate) {
            deckWinrates[dId].wins++;
            if (lastEdit && match.date > lastEdit) {
              deckRecentWinrates[dId].wins++;
            }
          }
        }
        if (match.player.win < match.opponent.win) {
          loss++;
          if (match.onThePlay) {
            let onThePlay = match.onThePlay == match.player.seat ? true : false;
            if (onThePlay) playLoss++;
            else drawLoss++;
          }
          if (computeDeckWinrate) {
            deckWinrates[dId].losses++;
            if (lastEdit && match.date > lastEdit) {
              deckRecentWinrates[dId].losses++;
            }
          }
        }
      }
      // color win/loss
      if (match.oppDeck) {
        const oppDeckColors = get_deck_colors(match.oppDeck);
        if (oppDeckColors && oppDeckColors.length > 0) {
          let added = -1;
          colorsWinrates.forEach((wr, index) => {
            if (compare_colors(wr.colors, oppDeckColors)) {
              added = index;
            }
          });
          if (added === -1) {
            added =
              colorsWinrates.push({
                colors: oppDeckColors,
                wins: 0,
                losses: 0
              }) - 1;
          }
          if (match.player.win > match.opponent.win) {
            colorsWinrates[added].wins++;
          }
          if (match.player.win < match.opponent.win) {
            colorsWinrates[added].losses++;
          }
        }
        // tag win/loss
        if (match.tags !== undefined && match.tags.length > 0) {
          const tag = match.tags[0] || "Unknown";
          archCounts[tag] = (archCounts[tag] || 0) + 1;
          let added = -1;
          tagsWinrates.forEach((wr, index) => {
            if (wr.tag === tag) {
              added = index;
            }
          });
          if (added === -1) {
            added = tagsWinrates.push({ tag: tag, wins: 0, losses: 0 }) - 1;
          }
          tagsWinrates[added].colors = oppDeckColors;
          if (match.player.win > match.opponent.win) {
            tagsWinrates[added].wins += 1;
          }
          if (match.player.win < match.opponent.win) {
            tagsWinrates[added].losses += 1;
          }
        }
      }
    });
    this.deckLastPlayed = deckLastPlayed;
    this.eventLastPlayed = eventLastPlayed;
    this._eventIds = [...Object.keys(eventLastPlayed)];
    this._eventIds.sort(this.compareEvents);
    this._stats = {
      wins,
      losses: loss,
      duration,
      colors: colorsWinrates,
      tags: tagsWinrates,
      playWins: playWins,
      playLosses: playLoss,
      drawWins: drawWins,
      drawLosses: drawLoss
    };
    const finishStats = stats => {
      const wins = stats.wins;
      const loss = stats.losses;
      const total = wins + loss;
      let winrate = 0;
      if (total) {
        winrate = winrate = Math.round((wins / total) * 100) / 100;
      }

      const playWins = stats.playWins;
      const playLoss = stats.playLosses;
      const playTotal = playWins + playLoss;
      let playWinrate = 0;
      if (playTotal) {
        playWinrate = Math.round((playWins / playTotal) * 100) / 100;
      }

      const drawWins = stats.drawWins;
      const drawLoss = stats.drawLosses;
      const drawTotal = drawWins + drawLoss;
      let drawWinrate = 0;
      if (drawTotal) {
        drawWinrate = Math.round((drawWins / drawTotal) * 100) / 100;
      }

      stats.playWinrate = playWinrate;
      stats.drawWinrate = drawWinrate;

      stats.winrate = winrate;
      stats.total = total;
    };
    finishStats(this._stats);
    Object.values(deckWinrates).forEach(finishStats);
    this.deckWinrates = deckWinrates;
    Object.values(deckRecentWinrates).forEach(finishStats);
    this.deckRecentWinrates = deckRecentWinrates;

    colorsWinrates.sort(compare_winrates);
    tagsWinrates.sort(compare_winrates);

    this.archCounts = archCounts;
    const archList = [...Object.keys(archCounts)];
    archList.sort();
    this.archs = [DEFAULT_ARCH, ...archList];

    for (const deckId in deckMap) {
      const deck = getDeck(deckId) || deckMap[deckId];
      if (deck) {
        this._decks.push(deck);
      }
    }
    this._decks.sort(this.compareDecks);
  }

  compareDecks(a, b) {
    const dateMax = (a, b) => (a > b ? a : b);
    const aDate = dateMax(this.deckLastPlayed[a.id], a.lastUpdated);
    const bDate = dateMax(this.deckLastPlayed[b.id], b.lastUpdated);
    if (aDate && bDate && aDate !== bDate) {
      return new Date(bDate) - new Date(aDate);
    }
    const aName = getRecentDeckName(a.id);
    const bName = getRecentDeckName(b.id);
    if (aName) {
      return aName.localeCompare(bName);
    }
    // a is invalid, sort b first
    if (bName) return 1;
    // neither valid, leave in place
    return 0;
  }

  compareEvents(a, b) {
    const aDate = this.eventLastPlayed[a];
    const bDate = this.eventLastPlayed[b];
    if (aDate && bDate && aDate !== bDate) {
      return new Date(bDate) - new Date(aDate);
    }
    const aName = getReadableEvent(a);
    const bName = getReadableEvent(b);
    if (aName) {
      return aName.localeCompare(bName);
    }
    // a is invalid, sort b first
    if (bName) return 1;
    // neither valid, leave in place
    return 0;
  }

  get matches() {
    return this._matches;
  }

  get events() {
    return [
      DEFAULT_EVENT,
      RANKED_CONST,
      RANKED_DRAFT,
      ALL_DRAFTS,
      DRAFT_REPLAYS,
      ...this._eventIds
    ];
  }

  get trackEvents() {
    return [
      ALL_EVENT_TRACKS,
      RANKED_DRAFT,
      ...this._eventIds.filter(
        eventId => !SINGLE_MATCH_EVENTS.includes(eventId)
      )
    ];
  }

  get decks() {
    return [{ id: DEFAULT_DECK, name: DEFAULT_DECK }, ...this._decks];
  }

  get stats() {
    return this._stats;
  }

  get tags() {
    return Aggregator.gatherTags(this.decks);
  }
}

Aggregator.DEFAULT_DECK = DEFAULT_DECK;
Aggregator.DEFAULT_EVENT = DEFAULT_EVENT;
Aggregator.DEFAULT_TAG = DEFAULT_TAG;
Aggregator.DEFAULT_ARCH = DEFAULT_ARCH;
Aggregator.RANKED_CONST = RANKED_CONST;
Aggregator.RANKED_DRAFT = RANKED_DRAFT;
Aggregator.ALL_DRAFTS = ALL_DRAFTS;
Aggregator.DRAFT_REPLAYS = DRAFT_REPLAYS;
Aggregator.ALL_EVENT_TRACKS = ALL_EVENT_TRACKS;
Aggregator.DATE_LAST_30 = DATE_LAST_30;
Aggregator.DATE_SEASON = DATE_SEASON;
Aggregator.DATE_ALL_TIME = DATE_ALL_TIME;

module.exports = Aggregator;
