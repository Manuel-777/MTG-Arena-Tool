import compareDesc from "date-fns/compareDesc";
import isAfter from "date-fns/isAfter";
import isEqual from "date-fns/isEqual";
import isValid from "date-fns/isValid";
import max from "date-fns/max";
import startOfDay from "date-fns/startOfDay";
import subDays from "date-fns/subDays";
import db from "../shared/database-wrapper";
import { normalApproximationInterval } from "../shared/utils/statsFns";
import { matchesList, getDeck, getDeckName } from "../shared/store";
import store from "../shared/redux/stores/rendererStore";
import {
  constants,
  Colors,
  Deck,
  getEventPrettyName,
  InternalDraftv2,
  InternalMatch,
  InternalDeck,
} from "mtgatool-shared";
import { format } from "date-fns";

const {
  DATE_ALL_TIME,
  DATE_LAST_30,
  DATE_LAST_7,
  DATE_LAST_DAY,
  DATE_SEASON,
} = constants;

export interface CardWinrateData {
  name: string;
  wins: number;
  losses: number;
  turnsUsed: number[];
  turnsFirstUsed: number[];
  sidedIn: number;
  sidedOut: number;
  sideInWins: number;
  sideInLosses: number;
  sideOutWins: number;
  sideOutLosses: number;
  initHandWins: number;
  initHandsLosses: number;
  mulligans: number;
  colors: { [key: number]: { wins: number; losses: number } };
}

function newCardWinrate(grpId: number): CardWinrateData {
  return {
    name: db.card(grpId)?.name || "",
    wins: 0,
    losses: 0,
    turnsUsed: [],
    turnsFirstUsed: [],
    sidedIn: 0,
    sidedOut: 0,
    sideInWins: 0,
    sideInLosses: 0,
    sideOutWins: 0,
    sideOutLosses: 0,
    initHandWins: 0,
    initHandsLosses: 0,
    colors: {},
    mulligans: 0,
  };
}

export const dateMaxValid = (a: Date, b: Date): Date => {
  const aValid = isValid(a);
  const bValid = isValid(b);
  return (
    (aValid && bValid && max([a, b])) || (aValid && a) || (bValid && b) || a
  );
};

function playBrawlEvents(): string[] {
  const prefix = "Play_Brawl_";
  const endDate = new Date();
  const currentDate = new Date("2019-11-06T16:00:00Z"); // first Wednesday brawl
  const events = [];
  while (currentDate < endDate) {
    events.push(prefix + format(currentDate, "yyyyMMdd"));
    currentDate.setDate(currentDate.getDate() + 7); // repeat every Wednesday
  }
  return events;
}

export interface AggregatorFilters {
  date?: Date | string;
  showArchived?: boolean;
  eventId?: string;
  matchIds?: string[];
  deckId?: string | string[];
  deckVersion?: string | string[];
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
  public static DEFAULT_DECK_VERSION = "All Versions";
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
      avgDuration: NaN,
      colors: [],
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
      deckVersion: Aggregator.DEFAULT_DECK_VERSION,
      date: store.getState().settings.last_date_filter,
      showArchived: false,
    };
  }

  public static isDraftMatch(match: InternalDraftv2 | InternalMatch): boolean {
    if (
      (match.eventId && match.eventId.includes("Draft")) ||
      (match.type && match.type === "draft")
    ) {
      return true;
    }
    return false;
  }

  private static gatherTags(decks: Partial<InternalDeck>[]): string[] {
    const tagSet = new Set<string>();
    const formatSet = new Set<string>();
    const counts: Record<string, number> = {};
    decks.forEach((deck) => {
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
    const tagList = [...tagSet].filter((tag) => tag && !formatSet.has(tag));
    tagList.sort(); // alpha sort instead of counts for now
    const formatList = [...formatSet];
    formatList.sort((a, b) => counts[b] - counts[a]);

    return [Aggregator.DEFAULT_TAG, ...tagList, ...formatList];
  }

  private _decks: InternalDeck[] = [];
  //private _matches: InternalMatch[] = [];
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
    this.filterDeckVersion = this.filterDeckVersion.bind(this);
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
      dateFilter = new Date(
        store.getState().renderer.season?.currentSeason?.seasonStartTime || 0
      );
    } else if (filterValue === DATE_LAST_30) {
      dateFilter = startOfDay(subDays(now, 30));
    } else if (filterValue === DATE_LAST_7) {
      dateFilter = startOfDay(subDays(now, 7));
    } else if (filterValue === DATE_LAST_DAY) {
      dateFilter = subDays(now, 1);
    } else {
      dateFilter = new Date(filterValue ?? NaN);
    }
    return isAfter(new Date(date), dateFilter);
  }

  filterDeckVersion(deck: InternalDeck): boolean {
    const version = new Deck(deck).getHash();
    const { deckVersion } = this.filters;
    if (!deck) return deckVersion === Aggregator.DEFAULT_DECK_VERSION;
    return (
      deckVersion == Aggregator.DEFAULT_DECK_VERSION || deckVersion == version
    );
  }

  filterDeck(deck: InternalDeck): boolean {
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
        getEventPrettyName(eventId) === Aggregator.PLAY_BRAWL) ||
      filterValue === eventId
    );
  }

  filterMatch(match: InternalMatch): boolean {
    if (!match) return false;
    const { eventId, matchIds, showArchived } = this.filters;

    if (!showArchived && match.archived) return false;

    const passesMatchFilter = !matchIds || this.validMatches.has(match.id);
    if (!passesMatchFilter) return false;

    const passesEventFilter =
      this.filterEvent(match.eventId) ||
      (eventId === Aggregator.ALL_DRAFTS && Aggregator.isDraftMatch(match));

    if (!passesEventFilter) return false;

    const passesPlayerDeckFilter = this.filterDeck(match.playerDeck);
    if (!passesPlayerDeckFilter) return false;

    const passesPlayerDeckVersionFilter = this.filterDeckVersion(
      match.playerDeck
    );
    if (!passesPlayerDeckVersionFilter) return false;

    return this.filterDate(match.date);
  }

  updateFilters(filters = {}): void {
    this.filters = {
      ...Aggregator.getDefaultFilters(),
      ...this.filters,
      ...filters,
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

    matchesList()
      .filter(this.filterMatch)
      .map((match) => {
        if (!match.playerDeckHash) {
          const playerDeck = new Deck(match.playerDeck);
          match.playerDeckHash = playerDeck.getHash();
        }
        this._processMatch(match);
      });

    [
      this.stats,
      this.playStats,
      this.drawStats,
      ...Object.values(this.deckStats),
      ...Object.values(this.deckRecentStats),
      ...Object.values(this.colorStats),
      ...Object.values(this.tagStats),
      ...Object.values(this.constructedStats),
      ...Object.values(this.limitedStats),
    ].forEach(Aggregator.finishStats);

    this._eventIds = [...Object.keys(this.eventLastPlayed)];
    this._eventIds.sort(this.compareEvents);

    const archList = Object.keys(this.archCounts).filter(
      (arch) => arch !== Aggregator.NO_ARCH
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

  _processMatch(match: InternalMatch): void {
    const statsToUpdate = [this.stats];
    // on play vs draw
    const hasPlayDrawData = match && match.toolVersion >= 262400;
    if (hasPlayDrawData) {
      match.gameStats
        .filter((gs) => gs)
        .forEach((gameStats) => {
          const onThePlay = match.player.seat == gameStats.onThePlay;
          let toUpdate;
          if (onThePlay && gameStats) {
            toUpdate = this.playStats;
          } else {
            toUpdate = this.drawStats;
          }

          toUpdate.wins += gameStats.winner == match.player.seat ? 1 : 0;
          toUpdate.losses += gameStats.winner == match.player.seat ? 0 : 1;
          toUpdate.total++;
          toUpdate.duration += gameStats.time;
        });
    } else {
      if (match.onThePlay && match.player) {
        statsToUpdate.push(
          match.onThePlay === match.player.seat
            ? this.playStats
            : this.drawStats
        );
      }
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
            rank,
          };
        }
        if (!(rank in this.limitedStats)) {
          this.limitedStats[rank] = {
            ...Aggregator.getDefaultStats(),
            rank,
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
      const colors = match.oppDeck.colors || [];
      if (colors?.length) {
        colors.sort();
        const colorStr = colors.join(",");
        if (!(colorStr in this.colorStats)) {
          this.colorStats[colorStr] = {
            ...Aggregator.getDefaultStats(),
            colors,
          };
        }
        statsToUpdate.push(this.colorStats[colorStr]);
      }
      // process archetype
      const tag = match.tags?.[0] ?? Aggregator.NO_ARCH;
      this.archCounts[tag] = (this.archCounts[tag] ?? 0) + 1;
      if (!(tag in this.tagStats)) {
        this.tagStats[tag] = {
          ...Aggregator.getDefaultStats(),
          colors,
          tag,
        };
      } else {
        this.tagStats[tag].colors = [
          ...new Set([...(this.tagStats[tag].colors || []), ...colors]),
        ];
      }
      if (!statsToUpdate.includes(this.tagStats[tag]))
        statsToUpdate.push(this.tagStats[tag]);
    }
    // update relevant stats
    statsToUpdate.forEach((stats) => {
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

  compareDecks(a: InternalDeck, b: InternalDeck): number {
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

    const aName = getEventPrettyName(a);
    const bName = getEventPrettyName(b);
    return aName.localeCompare(bName);
  }

  get events(): string[] {
    const brawlEvents = new Set(playBrawlEvents());
    return [
      Aggregator.DEFAULT_EVENT,
      Aggregator.ALL_DRAFTS,
      Aggregator.RANKED_CONST,
      Aggregator.RANKED_DRAFT,
      Aggregator.PLAY_BRAWL,
      ...this._eventIds.filter((eventId) => !brawlEvents.has(eventId)),
    ];
  }

  get trackEvents(): string[] {
    const bo1Events = new Set(db.single_match_events);
    return [
      Aggregator.ALL_EVENT_TRACKS,
      Aggregator.ALL_DRAFTS,
      Aggregator.RANKED_DRAFT,
      ...this._eventIds.filter((eventId) => !bo1Events.has(eventId)),
    ];
  }

  get decks(): Partial<InternalDeck>[] {
    return [
      { id: Aggregator.DEFAULT_DECK, name: Aggregator.DEFAULT_DECK },
      ...this._decks,
    ];
  }

  get tags(): string[] {
    return Aggregator.gatherTags(this.decks);
  }

  getMatchesList(): InternalMatch[] {
    return matchesList().filter(this.filterMatch);
  }

  getCardsWinrates(): Record<number, CardWinrateData> {
    const winrates: Record<number, CardWinrateData> = {};
    matchesList()
      .filter(this.filterMatch)
      .forEach((match) => {
        let addDelta: number[] = [];
        let remDelta: number[] = [];
        match.gameStats.forEach((game) => {
          const gameCards: number[] = [];
          const wins = game.win ? 1 : 0;
          const losses = game.win ? 0 : 1;
          // For each card cast
          game.cardsCast?.forEach((cardCast) => {
            const { grpId, player, turn } = cardCast;
            // Only if we casted it
            if (player == match.player.seat) {
              // define
              if (!winrates[grpId]) winrates[grpId] = newCardWinrate(grpId);
              // Only once per card cast!
              if (!gameCards.includes(grpId)) {
                winrates[grpId].turnsFirstUsed.push(Math.ceil(turn / 2));
                winrates[grpId].wins += wins;
                winrates[grpId].losses += losses;

                const colors = new Colors();
                colors.addFromArray(match.oppDeck.colors || []);
                if (colors.length > 0) {
                  const bits = colors.getBits();
                  if (!winrates[grpId].colors[bits]) {
                    winrates[grpId].colors[bits] = {
                      wins: 0,
                      losses: 0,
                    };
                  }
                  winrates[grpId].colors[bits].wins += wins;
                  winrates[grpId].colors[bits].losses += losses;
                  gameCards.push(grpId);
                }
              }
              // Do this for every card cast in the game
              winrates[grpId].turnsUsed.push(Math.ceil(turn / 2));
            }
          });

          game.handsDrawn?.forEach((hand, index) => {
            // Initial hand
            if (index == game.handsDrawn.length - 1) {
              hand.forEach((grpId) => {
                // define
                if (!winrates[grpId]) winrates[grpId] = newCardWinrate(grpId);
                winrates[grpId].initHandWins += wins;
                winrates[grpId].initHandsLosses += losses;
              });
            } else {
              hand.forEach((grpId) => {
                if (!winrates[grpId]) winrates[grpId] = newCardWinrate(grpId);
                winrates[grpId].mulligans++;
              });
            }
          });

          // Add the previos changes to the current ones
          addDelta = [...addDelta, ...(game.sideboardChanges?.added || [])];
          remDelta = [...remDelta, ...(game.sideboardChanges?.removed || [])];

          addDelta.forEach((grpId) => {
            // define
            if (!winrates[grpId]) winrates[grpId] = newCardWinrate(grpId);
            winrates[grpId].sidedIn++;
            // Only add if the card was used
            if (gameCards.includes(grpId)) {
              winrates[grpId].sideInWins += wins;
              winrates[grpId].sideInLosses += losses;
            }
          });
          remDelta.forEach((grpId) => {
            // define
            if (!winrates[grpId]) winrates[grpId] = newCardWinrate(grpId);
            winrates[grpId].sidedOut++;
            // Only add if the card was not used
            if (!gameCards.includes(grpId)) {
              winrates[grpId].sideOutWins += wins;
              winrates[grpId].sideOutLosses += losses;
            }
          });
        });
      });
    return winrates;
  }
}
