import compareDesc from "date-fns/compareDesc";
import isAfter from "date-fns/isAfter";
import isEqual from "date-fns/isEqual";
import isValid from "date-fns/isValid";
import max from "date-fns/max";
import startOfDay from "date-fns/startOfDay";
import subDays from "date-fns/subDays";
import {
  DATE_ALL_TIME,
  DATE_LAST_30,
  DATE_LAST_DAY,
  DATE_SEASON
} from "../shared/constants";
import db from "../shared/database";
import { normalApproximationInterval } from "../shared/statsFns";
import { getReadableEvent } from "../shared/util";
import { InternalDeck } from "../types/Deck";
import { InternalMatch } from "../types/match";
import { matchesList, getDeck, getDeckName } from "../shared-store";
import store from "../shared-redux/stores/rendererStore";

export const dateMaxValid = (a: any, b: any): any => {
  const aValid = isValid(a);
  const bValid = isValid(b);
  return (
    (aValid && bValid && max([a, b])) || (aValid && a) || (bValid && b) || a
  );
};

export interface AggregatorFilters {
  date?: Date | string;
  showArchived?: boolean;
  eventId?: string;
  matchIds?: string[];
  deckId?: string | string[];
}

export interface AggregatorStats {
  wins: number;
  losses: number;
  total: number;
  winrate: number;
  interval: number;
  winrateLow: number;
  winrateHigh: number;
  duration: number;
  avgDuration: number;
  rank?: string;
  colors?: number[];
  tag?: string;
}

export default class Aggregator {
  // Default filter values
  public static DEFAULT_DECK = "All Decks";
  public static DEFAULT_EVENT = "All Events";
  public static DEFAULT_TAG = "All Tags";
  public static DEFAULT_ARCH = "All Archetypes";
  // Ranked filter values
  public static RANKED_CONST = "Ranked Constructed";
  public static RANKED_DRAFT = "Ranked Limited";
  // Event-related filter values
  public static ALL_EVENT_TRACKS = "All Event Tracks";
  public static ALL_DRAFTS = "All Drafts";
  public static PLAY_BRAWL = "Play Brawl";
  // Archetype filter values
  public static NO_ARCH = "No Archetype";

  public static getDefaultStats(): AggregatorStats {
    return {
      wins: 0,
      losses: 0,
      total: 0,
      interval: NaN,
      winrate: NaN,
      winrateLow: NaN,
      winrateHigh: NaN,
      duration: 0,
      avgDuration: NaN
    };
  }

  private static finishStats(stats: AggregatorStats): void {
    const { wins, total, duration } = stats;
    if (total) {
      stats.avgDuration = Math.round(duration / total);
    }
    const { winrate, interval } = normalApproximationInterval(total, wins);
    const roundWinrate = (x: number): number => Math.round(x * 100) / 100;
    stats.winrate = roundWinrate(winrate);
    stats.interval = roundWinrate(interval);
    stats.winrateLow = roundWinrate(winrate - interval);
    stats.winrateHigh = roundWinrate(winrate + interval);
  }

  public static getDefaultFilters(): AggregatorFilters {
    return {
      matchIds: undefined,
      eventId: Aggregator.DEFAULT_EVENT,
      deckId: Aggregator.DEFAULT_DECK,
      date: store.getState().settings.last_date_filter,
      showArchived: false
    };
  }

  public static isDraftMatch(match: any): boolean {
    return (
      (match.eventId && match.eventId.includes("Draft")) ||
      (match.type && match.type === "draft")
    );
  }

  private static gatherTags(decks: any[]): string[] {
    const tagSet = new Set<string>();
    const formatSet = new Set<string>();
    const counts: Record<string, number> = {};
    decks.forEach(deck => {
      if (deck.tags) {
        deck.tags.forEach((tag: string) => {
          tagSet.add(tag);
          counts[tag] = (counts[tag] ?? 0) + 1;
        });
      }
      if (deck.format) {
        formatSet.add(deck.format);
        counts[deck.format] = (counts[deck.format] ?? 0) + 1;
      }
    });
    const tagList = [...tagSet].filter(tag => tag && !formatSet.has(tag));
    tagList.sort(); // alpha sort instead of counts for now
    const formatList = [...formatSet];
    formatList.sort((a, b) => counts[b] - counts[a]);

    return [Aggregator.DEFAULT_TAG, ...tagList, ...formatList];
  }

  private _decks: InternalDeck[] = [];
  private _matches: InternalMatch[] = [];
  private _eventIds: string[] = [];
  private validDecks: Set<string> = new Set();
  private validMatches: Set<string> = new Set();

  public archs: string[] = [];
  public archCounts: { [key: string]: number } = {};
  public colorStats: { [key: string]: AggregatorStats } = {};
  public constructedStats: { [key: string]: AggregatorStats } = {};
  public deckMap: { [key: string]: InternalDeck } = {};
  public deckLastPlayed: { [key: string]: Date } = {};
  public drawStats: AggregatorStats = Aggregator.getDefaultStats();
  public deckStats: { [key: string]: AggregatorStats } = {};
  public deckRecentStats: { [key: string]: AggregatorStats } = {};
  public eventLastPlayed: { [key: string]: Date } = {};
  public filters: AggregatorFilters = {};
  public limitedStats: { [key: string]: AggregatorStats } = {};
  public playStats: AggregatorStats = Aggregator.getDefaultStats();
  public stats: AggregatorStats = Aggregator.getDefaultStats();
  public tagStats: { [key: string]: AggregatorStats } = {};

  constructor(filters?: AggregatorFilters) {
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

  filterDate(date: string | number): boolean {
    const { date: filterValue } = this.filters;
    let dateFilter = null;
    const now = new Date();
    if (filterValue === DATE_ALL_TIME) {
      return true;
    } else if (filterValue === DATE_SEASON) {
      dateFilter = db.season_starts;
    } else if (filterValue === DATE_LAST_30) {
      dateFilter = startOfDay(subDays(now, 30));
    } else if (filterValue === DATE_LAST_DAY) {
      dateFilter = subDays(now, 1);
    } else {
      dateFilter = new Date(filterValue ?? NaN);
    }
    return isAfter(new Date(date), dateFilter);
  }

  filterDeck(deck: any): boolean {
    const { deckId } = this.filters;
    if (!deck) return deckId === Aggregator.DEFAULT_DECK;
    return (
      deckId === Aggregator.DEFAULT_DECK ||
      deckId === deck.id ||
      this.validDecks.has(deck.id)
    );
  }

  filterEvent(eventId: string): boolean {
    const { eventId: filterValue } = this.filters;
    return (
      (filterValue === Aggregator.DEFAULT_EVENT && eventId !== "AIBotMatch") ||
      (filterValue === Aggregator.ALL_DRAFTS && eventId?.includes("Draft")) ||
      (filterValue === Aggregator.ALL_EVENT_TRACKS &&
        !db.single_match_events.includes(eventId)) ||
      (filterValue === Aggregator.RANKED_CONST &&
        db.standard_ranked_events.includes(eventId)) ||
      (filterValue === Aggregator.RANKED_DRAFT &&
        db.limited_ranked_events.includes(eventId)) ||
      (filterValue === Aggregator.PLAY_BRAWL &&
        getReadableEvent(eventId) === Aggregator.PLAY_BRAWL) ||
      filterValue === eventId
    );
  }

  filterMatch(match: any): boolean {
    if (!match) return false;
    const { eventId, showArchived, matchIds } = this.filters;
    if (!showArchived && match.archived) return false;

    const passesMatchFilter = !matchIds || this.validMatches.has(match.id);
    if (!passesMatchFilter) return false;

    const passesEventFilter =
      this.filterEvent(match.eventId) ||
      (eventId === Aggregator.ALL_DRAFTS && Aggregator.isDraftMatch(match));

    if (!passesEventFilter) return false;

    const passesPlayerDeckFilter = this.filterDeck(match.playerDeck);
    if (!passesPlayerDeckFilter) return false;

    return this.filterDate(match.date);
  }

  updateFilters(filters = {}): void {
    this.filters = {
      ...Aggregator.getDefaultFilters(),
      ...this.filters,
      ...filters
    };
    if (this.filters.matchIds instanceof Array) {
      this.validMatches = new Set(this.filters.matchIds);
    } else {
      this.validMatches = new Set();
    }
    if (this.filters.deckId instanceof Array) {
      this.validDecks = new Set(this.filters.deckId);
    } else {
      this.validDecks = new Set();
    }
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

    // this._matches
    matchesList()
      .filter(this.filterMatch)
      .map(this._processMatch);

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
      arch => arch !== Aggregator.NO_ARCH
    );
    archList.sort();
    this.archs = [Aggregator.DEFAULT_ARCH, Aggregator.NO_ARCH, ...archList];

    for (const deckId in this.deckMap) {
      const deck = getDeck(deckId) ?? this.deckMap[deckId];
      if (deck) {
        this._decks.push(deck);
      }
    }
  }

  _processMatch(match: any): void {
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
      if (match.player?.rank) {
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
    if (match.playerDeck?.id) {
      const id = match.playerDeck.id;
      this.deckMap[id] = match.playerDeck;
      this.deckLastPlayed[id] = dateMaxValid(
        new Date(match.date),
        this.deckLastPlayed[id]
      );
      const currentDeck = getDeck(match.playerDeck.id);
      if (currentDeck) {
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
      if (colors?.length) {
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
      const tag = match.tags?.[0] ?? Aggregator.NO_ARCH;
      this.archCounts[tag] = (this.archCounts[tag] ?? 0) + 1;
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

  compareDecks(a: any, b: any): number {
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

    const aName = getDeckName(a.id);
    const bName = getDeckName(b.id);
    return aName.localeCompare(bName);
  }

  compareEvents(a: string, b: string): number {
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

  get events(): string[] {
    const brawlEvents = new Set(db.playBrawlEvents);
    return [
      Aggregator.DEFAULT_EVENT,
      Aggregator.ALL_DRAFTS,
      Aggregator.RANKED_CONST,
      Aggregator.RANKED_DRAFT,
      Aggregator.PLAY_BRAWL,
      ...this._eventIds.filter(eventId => !brawlEvents.has(eventId))
    ];
  }

  get trackEvents(): string[] {
    const bo1Events = new Set(db.single_match_events);
    return [
      Aggregator.ALL_EVENT_TRACKS,
      Aggregator.ALL_DRAFTS,
      Aggregator.RANKED_DRAFT,
      ...this._eventIds.filter(eventId => !bo1Events.has(eventId))
    ];
  }

  get decks(): Partial<InternalDeck>[] {
    return [
      { id: Aggregator.DEFAULT_DECK, name: Aggregator.DEFAULT_DECK },
      ...this._decks
    ];
  }

  get tags(): string[] {
    return Aggregator.gatherTags(this.decks);
  }
}
