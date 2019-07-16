const { COLORS_ALL, COLORS_BRIEF } = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const {
  get_deck_colors,
  getReadableEvent,
  getRecentDeckName
} = require("../shared/util");

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
    this._processMatch = this._processMatch.bind(this);
    this.compareDecks = this.compareDecks.bind(this);
    this.compareEvents = this.compareEvents.bind(this);
    this.updateFilters(filters);
  }

  static getDefaultStats() {
    return { wins: 0, losses: 0, total: 0, duration: 0 };
  }

  static finishStats(stats) {
    const { wins, total } = stats;
    let winrate = 0;
    if (total) {
      winrate = Math.round((wins / total) * 100) / 100;
    }
    stats.winrate = winrate;
  }

  static createAllMatches() {
    return new Aggregator({ date: DATE_ALL_TIME });
  }

  static getDefaultColorFilter() {
    const colorFilters = {};
    COLORS_BRIEF.forEach(code => (colorFilters[code] = false));
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
      date: null, // take default later from player config
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
      dateFilter = db.season_starts;
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
      deck.colors.forEach(i => (deckColorCodes[COLORS_ALL[i - 1]] = true));
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

    const currentDeck = pd.deck(deck.id);
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
      (eventId === RANKED_DRAFT && db.ranked_events.includes(_eventId)) ||
      eventId === _eventId
    );
  }

  filterMatch(match) {
    if (!match) return false;
    const { eventId, oppColors, arch, showArchived } = this.filters;
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
    this._eventIds = [];
    this.eventLastPlayed = {};
    this._decks = [];
    this.deckMap = {};
    this.deckLastPlayed = {};
    this.eventLastPlayed = {};
    this.archCounts = {};
    this.stats = Aggregator.getDefaultStats();
    this.playStats = Aggregator.getDefaultStats();
    this.drawStats = Aggregator.getDefaultStats();
    this.deckStats = {};
    this.deckRecentStats = {};
    this.colorStats = {};
    this.tagStats = {};
    this.constructedStats = {};
    this.limitedStats = {};

    this._matches = pd.history.filter(this.filterMatch);
    this._matches.forEach(this._processMatch);

    [
      this.stats,
      this.playStats,
      this.drawStats,
      ...Object.values(this.deckStats),
      ...Object.values(this.deckRecentStats),
      ...Object.values(this.colorStats),
      ...Object.values(this.tagStats),
      ...Object.values(this.constructedStats),
      ...Object.values(this.limitedStats)
    ].forEach(Aggregator.finishStats);

    this._eventIds = [...Object.keys(this.eventLastPlayed)];
    this._eventIds.sort(this.compareEvents);

    const archList = [...Object.keys(this.archCounts)];
    archList.sort();
    this.archs = [DEFAULT_ARCH, ...archList];

    for (const deckId in this.deckMap) {
      const deck = pd.deck(deckId) || this.deckMap[deckId];
      if (deck) {
        this._decks.push(deck);
      }
    }
    this._decks.sort(this.compareDecks);
  }

  _processMatch(match) {
    const statsToUpdate = [this.stats];
    // on play vs draw
    if (match.onThePlay && match.player) {
      statsToUpdate.push(
        match.onThePlay === match.player.seat ? this.playStats : this.drawStats
      );
    }
    // process event data
    if (match.eventId) {
      let eventIsMoreRecent = true;
      if (match.eventId in this.eventLastPlayed) {
        eventIsMoreRecent = match.date > this.eventLastPlayed[match.eventId];
      }
      if (eventIsMoreRecent) {
        this.eventLastPlayed[match.eventId] = match.date;
      }
      // process rank data
      if (match.player && match.player.rank) {
        const rank = match.player.rank.toLowerCase();
        if (!(rank in this.constructedStats)) {
          this.constructedStats[rank] = {
            ...Aggregator.getDefaultStats(),
            rank
          };
        }
        if (!(rank in this.limitedStats)) {
          this.limitedStats[rank] = {
            ...Aggregator.getDefaultStats(),
            rank
          };
        }
        if (CONSTRUCTED_EVENTS.includes(match.eventId)) {
          statsToUpdate.push(this.constructedStats[rank]);
        } else if (db.ranked_events.includes(match.eventId)) {
          statsToUpdate.push(this.limitedStats[rank]);
        }
      }
    }
    // process deck data
    if (match.playerDeck && match.playerDeck.id) {
      const id = match.playerDeck.id;
      let deckIsMoreRecent = true;
      if (id in this.deckLastPlayed) {
        deckIsMoreRecent = match.date > this.deckLastPlayed[id];
      }
      if (deckIsMoreRecent) {
        this.deckMap[id] = match.playerDeck;
        this.deckLastPlayed[id] = match.date;
      }
      if (pd.deckExists(id)) {
        const currentDeck = pd.deck(match.playerDeck.id);
        if (!(id in this.deckStats)) {
          this.deckStats[id] = Aggregator.getDefaultStats();
        }
        statsToUpdate.push(this.deckStats[id]);
        if (!(id in this.deckRecentStats)) {
          this.deckRecentStats[id] = Aggregator.getDefaultStats();
        }
        if (currentDeck.lastUpdated && match.date > currentDeck.lastUpdated) {
          statsToUpdate.push(this.deckRecentStats[id]);
        }
      }
    }
    // process opponent data
    if (match.oppDeck) {
      const colors = get_deck_colors(match.oppDeck);
      if (colors && colors.length) {
        colors.sort();
        if (!(colors in this.colorStats)) {
          this.colorStats[colors] = {
            ...Aggregator.getDefaultStats(),
            colors
          };
        }
        statsToUpdate.push(this.colorStats[colors]);
      }
      // process archetype
      if (match.tags && match.tags.length) {
        const tag = match.tags[0] || "Unknown";
        this.archCounts[tag] = (this.archCounts[tag] || 0) + 1;
        if (!(tag in this.tagStats)) {
          this.tagStats[tag] = {
            ...Aggregator.getDefaultStats(),
            colors,
            tag
          };
        }
        statsToUpdate.push(this.tagStats[tag]);
      }
    }
    // update relevant stats
    statsToUpdate.forEach(stats => {
      // some of the data is wierd. Games which last years or have no data.
      if (match.duration && match.duration < 3600) {
        stats.duration += match.duration;
      }
      if (match.player && match.opponent) {
        if (match.player.win || match.opponent.win) {
          stats.total++;
        }
        if (match.player.win > match.opponent.win) {
          stats.wins++;
        } else if (match.player.win < match.opponent.win) {
          stats.losses++;
        }
      }
    });
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
