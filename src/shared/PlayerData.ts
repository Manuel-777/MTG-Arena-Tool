/* eslint-disable @typescript-eslint/camelcase */
import defaultConfig from "./defaultConfig";

class PlayerData implements Record<string, any> {
  private static instance?: PlayerData = undefined;

  public cards: {
    cards_time: number;
    cards_before: Record<string, number>;
    cards: Record<string, number>;
  } = defaultConfig.cards;
  public cardsNew: Record<string, number> = {};
  public deck_changes: Record<string, any> = {};
  public decks_tags: Record<string, string[]> = {};
  public deck_changes_index: string[] = [];
  public static_events: string[] = [];

  public last_log_timestamp = "";
  public last_log_format = "";
  public appDbPath = "";
  public playerDbPath = "";

  constructor() {
    if (PlayerData.instance) return PlayerData.instance;

    this.deckChangeExists = this.deckChangeExists.bind(this);
    this.deckChanges = this.deckChanges.bind(this);

    PlayerData.instance = this;
  }

  get data(): Record<string, any> {
    const data: Record<string, any> = {};
    Object.entries(this).forEach(([key, value]) => {
      if (value instanceof Function) return;
      data[key] = value;
    });

    return data;
  }

  deckChangeExists(id?: string): boolean {
    return !!id && id in this.deck_changes;
  }

  deckChanges(id?: string): any[] {
    //if (!this.deckExists(id)) return [];
    return this.deck_changes_index
      .map(id => this.deck_changes[id])
      .filter(change => change && change.deckId === id);
  }
}

const playerData = new PlayerData();

export default playerData;
