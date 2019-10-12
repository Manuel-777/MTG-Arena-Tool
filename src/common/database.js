import path from 'path';
import { app, remote, ipcRenderer as ipc } from 'electron';
import fs from 'fs';
import _ from 'lodash';

const cachePath =
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
        "v22-zh-cn-database.json"
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
  constructor() {
    if (Database.instance) return Database.instance;

    this.handleSetActiveEvents = this.handleSetActiveEvents.bind(this);
    this.handleSetDb = this.handleSetDb.bind(this);
    this.handleSetRewardResets = this.handleSetRewardResets.bind(this);
    this.handleSetSeason = this.handleSetSeason.bind(this);
    this.handleSetPreconDecks = this.handleSetPreconDecks.bind(this);
    if (ipc) ipc.on("set_active_events", this.handleSetActiveEvents);
    if (ipc) ipc.on("set_db", this.handleSetDb);
    if (ipc) ipc.on("set_reward_resets", this.handleSetRewardResets);
    if (ipc) ipc.on("set_season", this.handleSetSeason);
    if (ipc) ipc.on("set_precon_decks", this.handleSetPreconDecks);

    this.rewards_daily_ends = new Date();
    this.rewards_weekly_ends = new Date();
    this.activeEvents = [];
    this.preconDecks = [];

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

    Database.instance = this;
  }

  handleSetActiveEvents(_event, arg) {
    if (!arg) return;
    try {
      this.activeEvents = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing JSON:", arg);
      return false;
    }
  }

  handleSetDb(_event, arg) {
    try {
      this.data = JSON.parse(arg);
    } catch (e) {
      console.log("Error parsing metadata", e);
    }
  }

  updateCache(data) {
    try {
      if (cachePath) {
        fs.writeFileSync(cachePath, data);
      }
    } catch (e) {
      console.log("Error saving metadata", e);
    }
  }

  handleSetRewardResets(_event, arg) {
    this.rewards_daily_ends = new Date(arg.daily);
    this.rewards_weekly_ends = new Date(arg.weekly);
  }

  handleSetSeason(_event, arg) {
    try {
      this.season = arg;
    } catch (e) {
      console.log("Error parsing metadata", e);
    }
  }

  handleSetPreconDecks(_event, arg) {
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

  get abilities() {
    return this.data.abilities;
  }

  get archetypes() {
    return this.data.archetypes;
  }

  get cards() {
    return this.data.cards;
  }

  get cardIds() {
    return Object.keys(this.cards);
  }

  get cardList() {
    return Object.values(this.cards);
  }

  get events() {
    return this.data.events;
  }

  get eventIds() {
    return Object.keys(this.data.events);
  }

  get eventList() {
    return Object.values(this.events);
  }

  get events_format() {
    return this.data.events_format;
  }

  get limited_ranked_events() {
    return this.data.limited_ranked_events;
  }

  get standard_ranked_events() {
    return this.data.standard_ranked_events;
  }

  get single_match_events() {
    return this.data.single_match_events;
  }

  get season_starts() {
    if (!this.season || !this.season.currentSeason) return new Date();
    return new Date(this.season.currentSeason.seasonStartTime);
  }

  get season_ends() {
    if (!this.season || !this.season.currentSeason) return new Date();
    return new Date(this.season.currentSeason.seasonEndTime);
  }

  get sets() {
    return _.pickBy(
      this.data.sets,
      (set, setName) => set && setName && set.code
    );
  }

  get version() {
    return Number(this.data.version);
  }

  card(id) {
    return this.data.cards[id] || false;
  }

  event(id) {
    return this.events[id] || false;
  }

  get(key) {
    return this.data[key] || false;
  }

  getRankSteps(rank, tier, isLimited) {
    if (!this.season) return 0;
    let rankInfo;
    if (isLimited) {
      if (!this.season.limitedRankInfo) return 0;
      rankInfo = this.season.limitedRankInfo;
    } else {
      if (!this.season.constructedRankInfo) return 0;
      rankInfo = this.season.constructedRankInfo;
    }
    rankInfo.forEach(rank => {
      if (rank.rankClass === rank && rank.level === tier) {
        return rank.steps;
      }
    });
    return 0;
  }

  cardFromArt(artId) {
    const matches = this.cardList.filter(card => card.artid === artId);
    return matches.length ? matches[0] : false;
  }
}

export default new Database();
