import path from "path";
import { app, remote, ipcRenderer as ipc } from "electron";
import fs from "fs";
import _ from "lodash";
import { Metadata, Archetype, DbCardData, CardSet, RewardsDate } from "./types/Metadata";
import { Season, Rank, RankClassInfo } from "./types/Season";
import { ArenaV3Deck } from "./types/Deck";

const cachePath: string | null =
  app || (remote && remote.app)
    ? path.join((app || remote.app).getPath("userData"), "database.json")
    : null;

/*
 This is cool for debugging the metadata files, so we can
 test and view the output files without copypasta.

const cachePath =
  app || (remote && remote.app)
    ? path.join(
        (app || remote.app).getPath("userData"),
        "..",
        "Electron",
        "external",
        "v25-en-database.json"
      )
    : null;

const scryfallDataPath = path.join(
  (app || remote.app).getPath("userData"),
  "..",
  "Electron",
  "external",
  "scryfall-cards.json"
);
*/

// Some other things should go here later, like updating from MTGA Servers themselves.
class Database {
  private static instance: Database;
  rewards_daily_ends: Date;
  rewards_weekly_ends: Date;
  activeEvents: string[];
  preconDecks: { [id: string]: ArenaV3Deck };
  public metadata: Metadata | undefined;
  season: Season | undefined;

  private constructor() {
    this.handleSetActiveEvents = this.handleSetActiveEvents.bind(this);
    this.handleSetDb = this.handleSetDb.bind(this);
    this.handleSetRewardResets = this.handleSetRewardResets.bind(this);
    this.handleSetSeason = this.handleSetSeason.bind(this);
    this.handleSetPreconDecks = this.handleSetPreconDecks.bind(this);

    if (ipc) {
      ipc.on("set_active_events", this.handleSetActiveEvents);
      ipc.on("set_db", this.handleSetDb);
      ipc.on("set_reward_resets", this.handleSetRewardResets);
      ipc.on("set_season", this.handleSetSeason);
      ipc.on("set_precon_decks", this.handleSetPreconDecks);
    }

    this.rewards_daily_ends = new Date();
    this.rewards_weekly_ends = new Date();
    this.activeEvents = [];
    this.preconDecks = {};

    let dbUri = `${__dirname}/../resources/database.json`;
    if (cachePath && fs.existsSync(cachePath)) {
      dbUri = cachePath;
    }
    const defaultDb = fs.readFileSync(dbUri, "utf8");
    /*
    try {
      let scryfallData = fs.readFileSync(scryfallDataPath, "utf8");
      this.scryfallData = JSON.parse(scryfallData);
    } catch (e) {
      console.log("Error parsing scryfall data", e);
    }
    */

    this.handleSetDb(null, defaultDb);
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }

    return Database.instance;
  }

  handleSetActiveEvents(_event: Event, arg: string) {
    if (!arg) return;
    try {
      this.activeEvents = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }

  handleSetDb(_event: Event | null, arg: string) {
    try {
      this.metadata = JSON.parse(arg) as Metadata;
    } catch (e) {
      console.log("Error parsing metadata", e);
    }
  }

  updateCache(data: string) {
    try {
      if (cachePath) {
        fs.writeFileSync(cachePath, data);
      }
    } catch (e) {
      console.log("Error saving metadata", e);
    }
  }

  handleSetRewardResets(_event: Event, rewardsDate: RewardsDate) {
    this.rewards_daily_ends = new Date(rewardsDate.daily);
    this.rewards_weekly_ends = new Date(rewardsDate.weekly);
  }

  handleSetSeason(_event: Event, season: Season) {
    try {
      this.season = season;
    } catch (e) {
      console.log("Error parsing metadata", e);
    }
  }

  handleSetPreconDecks(_event: Event, arg: ArenaV3Deck[]) {
    if (!arg || !arg.length) return;
    try {
      this.preconDecks = {};
      arg.forEach(deck => (this.preconDecks[deck.id] = deck));
      // console.log(this.preconDecks);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }

  get abilities(): { [id: number]: string } {
    return this.metadata ? this.metadata.abilities : {};
  }

  get archetypes(): { [id: number]: Archetype } {
    return this.metadata ? this.metadata.archetypes : {};
  }

  get cards(): { [id: number]: DbCardData } {
    return this.metadata !== undefined ? this.metadata.cards : {};
  }

  get cardIds(): number[] {
    return this.cards ? Object.keys(this.cards).map(k => parseInt(k)) : [] as number[];
  }

  get cardList(): DbCardData[] {
    return this.cards ? Object.values(this.cards) : [] as DbCardData[];
  }

  get events(): { [id: string]: string } {
    return this.metadata ? this.metadata.events : {};
  }

  get eventIds(): string[] {
    return this.metadata ? Object.keys(this.metadata.events) : [] as string[];
  }

  get eventList(): string[] {
    return this.metadata ? Object.values(this.metadata.events) : [] as string[];
  }

  get events_format(): { [id: string]: string } {
    return this.metadata ? this.metadata.events_format : {};
  }

  get limited_ranked_events(): string[] {
    return this.metadata ? this.metadata.limited_ranked_events : [];
  }

  get standard_ranked_events(): string[] {
    return this.metadata ? this.metadata.standard_ranked_events : [];
  }

  get single_match_events(): string[] {
    return this.metadata ? this.metadata.single_match_events : [];
  }

  get season_starts(): Date {
    if (!this.season || !this.season.currentSeason) return new Date();
    return new Date(this.season.currentSeason.seasonStartTime);
  }

  get season_ends(): Date {
    if (!this.season || !this.season.currentSeason) return new Date();
    return new Date(this.season.currentSeason.seasonEndTime);
  }

  get sets(): { [id: string]: CardSet } {
    if (!this.metadata) {
      return {};
    }

    return _.pickBy(
      this.metadata.sets,
      (set, setName) => set && setName && set.code
    );
  }

  get version() {
    return this.metadata ? this.metadata.version : 0;
  }

  card(id: number | string) {
    if (!this.metadata || !this.metadata.cards) {
      return false;
    }

    let numId = typeof id === "number" ? id : parseInt(id);
    return this.metadata.cards[numId] || false;
  }

  event(id: string) {
    return this.events[id] || false;
  }

  //possibly unused?
  // get(key: string) {
  //   if(!this.data){
  //     return false;
  //   }
  //   //return this.data[key] || false;
  //   return false;
  // }

  getRankSteps(rank: Rank, tier: number, isLimited: boolean) {
    if (!this.season) return 0;
    let rankInfo: RankClassInfo[];
    if (isLimited) {
      if (!this.season.limitedRankInfo) return 0;
      rankInfo = this.season.limitedRankInfo;
    } else {
      if (!this.season.constructedRankInfo) return 0;
      rankInfo = this.season.constructedRankInfo;
    }
    rankInfo.forEach(ri => {
      if (ri.rankClass === rank && ri.level === tier) {
        return ri.steps;
      }
    });
    return 0;
  }

  cardFromArt(artId: number | string) {
    let numArtId = typeof artId === "number" ? artId : parseInt(artId);
    const matches = this.cardList.filter(card => card.artid === numArtId);
    return matches.length ? matches[0] : false;
  }
}

export default Database.getInstance();