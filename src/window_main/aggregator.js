import compareDesc from "date-fns/compareDesc";
import isAfter from "date-fns/isAfter";
import isEqual from "date-fns/isEqual";
import isValid from "date-fns/isValid";
import max from "date-fns/max";
import startOfDay from "date-fns/startOfDay";
import subDays from "date-fns/subDays";
import {
  COLORS_ALL,
  COLORS_BRIEF,
  CONSTRUCTED_EVENTS,
  DATE_ALL_TIME,
  DATE_LAST_30,
  DATE_LAST_DAY,
  DATE_SEASON
} from "../shared/constants";
import db from "../shared/database";
import pd from "../shared/player-data";
import {
  getReadableEvent,
  getRecentDeckName,
  get_deck_missing,
  getBoosterCountEstimate
} from "../shared/util";
import { normalApproximationInterval } from "../shared/stats-fns";
// Default filter values
const DEFAULT_DECK = "All Decks";
const DEFAULT_EVENT = "All Events";
const DEFAULT_TAG = "All Tags";
const DEFAULT_ARCH = "All Archetypes";
// Ranked constants
const RANKED_CONST = "Ranked Constructed";
const RANKED_DRAFT = "Ranked Limited";
// Draft-related constants
const ALL_DRAFTS = "All Drafts";
const DRAFT_REPLAYS = "Draft Replays";
// Event-related constant
const ALL_EVENT_TRACKS = "All Event Tracks";

// Archetype constants
const NO_ARCH = "No Archetype";

export const dateMaxValid = (a, b) => {
  const aValid = isValid(a);
  const bValid = isValid(b);
  return (
    (aValid && bValid && max([a, b])) || (aValid && a) || (bValid && b) || a
  );
};

class Aggregator {
  constructor(filters) {
    this.filterDate = this.filterDate.bind(this);
    this.filterDeck = this.filterDeck.bind(this);
    this.filterEvent = this.filterEvent.bind(this);
    this.filterMatch = this.filterMatch.bind(this);
    this.updateFilters = this.updateFilters.bind(this);
    this._processMatch = this._processMatch.bind(this);
    this.compareDecks = this.compareDecks.bind(this);
    this.compareDecksByWins = this.compareDecksByWins.bind(this);
    this.compareDecksByWinrates = this.compareDecksByWinrates.bind(this);
    this.compareDecksByIncompleteness = this.compareDecksByIncompleteness.bind(
      this
    );
    this.compareEvents = this.compareEvents.bind(this);
    this.updateFilters(filters);
  }

  static getDefaultStats() {
    return { wins: 0, losses: 0, total: 0, duration: 0 };
  }

  static finishStats(stats) {
    const { wins, total } = stats;
    const { winrate, interval } = normalApproximationInterval(total, wins);
    const roundWinrate = x => Math.round(x * 100) / 100;
    stats.winrate = roundWinrate(winrate);
    stats.interval = roundWinrate(interval);
    stats.winrateLow = roundWinrate(winrate - interval);
    stats.winrateHigh = roundWinrate(winrate + interval);
  }

  static getDefaultColorFilter() {
    const colorFilters = {};
    COLORS_BRIEF.forEach(code => (colorFilters[code] = false));
    return { ...colorFilters, multi: true };
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
      date: pd.settings.last_date_filter,
      showArchived: false,
      sort: "By Date"
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
    const now = new Date();
    if (date === DATE_ALL_TIME) {
      return true;
    } else if (date === DATE_SEASON) {
      dateFilter = db.season_starts;
    } else if (date === DATE_LAST_30) {
      dateFilter = startOfDay(subDays(now, 30));
    } else if (date === DATE_LAST_DAY) {
      dateFilter = subDays(now, 1);
    } else {
      dateFilter = new Date(date);
    }
    return isAfter(new Date(_date), dateFilter);
  }

  _filterDeckByColors(deck, _colors) {
    if (!deck) return true;

    // Normalize deck colors into matching data format
    const deckColorCodes = Aggregator.getDefaultColorFilter();
    deck.colors.forEach(i => (deckColorCodes[COLORS_ALL[i - 1]] = true));

    return Object.entries(_colors).every(([color, value]) => {
      if (color === "multi") return true;
      if (!_colors.multi || value) {
        return deckColorCodes[color] === value;
      }
      return true;
    });
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
        !db.single_match_events.includes(_eventId)) ||
      (eventId === RANKED_CONST &&
        db.standard_ranked_events.includes(_eventId)) ||
      (eventId === RANKED_DRAFT &&
        db.limited_ranked_events.includes(_eventId)) ||
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

    if (
      match.type === "draft" &&
      (arch !== DEFAULT_ARCH ||
        (Object.values(oppColors).some(color => color) && !oppColors.multi))
    )
      return false;

    const passesOppDeckFilter = this._filterDeckByColors(
      match.oppDeck,
      oppColors
    );
    if (!passesOppDeckFilter) return false;

    const passesArchFilter =
      arch === DEFAULT_ARCH ||
      (match.tags && match.tags.length && arch === match.tags[0]) ||
      ((!match.tags || !match.tags.length || !match.tags[0]) &&
        arch === NO_ARCH);
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

    const archList = Object.keys(this.archCounts).filter(
      arch => arch !== NO_ARCH
    );
    archList.sort();
    this.archs = [DEFAULT_ARCH, NO_ARCH, ...archList];

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
      this.eventLastPlayed[match.eventId] = dateMaxValid(
        new Date(match.date),
        this.eventLastPlayed[match.eventId]
      );

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
        if (db.standard_ranked_events.includes(match.eventId)) {
          statsToUpdate.push(this.constructedStats[rank]);
        } else if (db.limited_ranked_events.includes(match.eventId)) {
          statsToUpdate.push(this.limitedStats[rank]);
        }
      }
    }
    // process deck data
    if (match.playerDeck && match.playerDeck.id) {
      const id = match.playerDeck.id;
      this.deckMap[id] = match.playerDeck;
      this.deckLastPlayed[id] = dateMaxValid(
        new Date(match.date),
        this.deckLastPlayed[id]
      );
      if (pd.deckExists(id)) {
        const currentDeck = pd.deck(match.playerDeck.id);
        if (!(id in this.deckStats)) {
          this.deckStats[id] = Aggregator.getDefaultStats();
        }
        statsToUpdate.push(this.deckStats[id]);
        if (!(id in this.deckRecentStats)) {
          this.deckRecentStats[id] = Aggregator.getDefaultStats();
        }
        if (
          currentDeck.lastUpdated &&
          isAfter(new Date(match.date), new Date(currentDeck.lastUpdated))
        ) {
          statsToUpdate.push(this.deckRecentStats[id]);
        }
      }
    }
    // process opponent data
    if (match.oppDeck) {
      const colors = match.oppDeck.colors;
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
      const tag =
        match.tags && match.tags.length ? match.tags[0] || NO_ARCH : NO_ARCH;
      this.archCounts[tag] = (this.archCounts[tag] || 0) + 1;
      if (!(tag in this.tagStats)) {
        this.tagStats[tag] = {
          ...Aggregator.getDefaultStats(),
          colors,
          tag
        };
      } else {
        this.tagStats[tag].colors = [
          ...new Set([...this.tagStats[tag].colors, ...colors])
        ];
      }
      if (!statsToUpdate.includes(this.tagStats[tag]))
        statsToUpdate.push(this.tagStats[tag]);
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
    const aDate = dateMaxValid(
      this.deckLastPlayed[a.id],
      new Date(a.lastUpdated)
    );
    const bDate = dateMaxValid(
      this.deckLastPlayed[b.id],
      new Date(b.lastUpdated)
    );
    const aValid = isValid(aDate);
    const bValid = isValid(bDate);
    if (aValid && bValid && !isEqual(aDate, bDate)) {
      return compareDesc(aDate, bDate);
    } else if (aValid) {
      return -1;
    } else if (bValid) {
      return 1;
    }

    const aName = getRecentDeckName(a.id);
    const bName = getRecentDeckName(b.id);
    return aName.localeCompare(bName);
  }

  compareDecksByWins(a, b) {
    const aStats = {
      ...Aggregator.getDefaultStats(),
      winrate: 0,
      ...this.deckStats[a.id]
    };
    const bStats = {
      ...Aggregator.getDefaultStats(),
      winrate: 0,
      ...this.deckStats[b.id]
    };
    const aName = getRecentDeckName(a.id);
    const bName = getRecentDeckName(b.id);

    return (
      bStats.wins - aStats.wins ||
      bStats.winrate - aStats.winrate ||
      aName.localeCompare(bName)
    );
  }

  compareDecksByWinrates(a, b) {
    const aStats = {
      ...Aggregator.getDefaultStats(),
      winrate: 0,
      ...this.deckStats[a.id]
    };
    const bStats = {
      ...Aggregator.getDefaultStats(),
      winrate: 0,
      ...this.deckStats[b.id]
    };
    const aName = getRecentDeckName(a.id);
    const bName = getRecentDeckName(b.id);

    return (
      bStats.winrate - aStats.winrate ||
      bStats.wins - aStats.wins ||
      aName.localeCompare(bName)
    );
  }

  compareDecksByIncompleteness(a, b) {
    const aMissing = get_deck_missing(a);
    const bMissing = get_deck_missing(b);
    const aMissingBoosters = getBoosterCountEstimate(aMissing);
    const bMissingBoosters = getBoosterCountEstimate(bMissing);

    const aName = getRecentDeckName(a.id);
    const bName = getRecentDeckName(b.id);

    return (
      bMissingBoosters - aMissingBoosters ||
      bMissing.mythic - aMissing.mythic ||
      bMissing.rare - aMissing.rare ||
      bMissing.uncommon - aMissing.uncommon ||
      bMissing.common - aMissing.common ||
      aName.localeCompare(bName)
    );
  }

  compareEvents(a, b) {
    const aDate = this.eventLastPlayed[a];
    const bDate = this.eventLastPlayed[b];
    const aValid = isValid(aDate);
    const bValid = isValid(bDate);
    if (aValid && bValid && !isEqual(aDate, bDate)) {
      return compareDesc(aDate, bDate);
    } else if (aValid) {
      return -1;
    } else if (bValid) {
      return 1;
    }

    const aName = getReadableEvent(a);
    const bName = getReadableEvent(b);
    return aName.localeCompare(bName);
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
        eventId => !db.single_match_events.includes(eventId)
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
Aggregator.NO_ARCH = NO_ARCH;

export default Aggregator;
