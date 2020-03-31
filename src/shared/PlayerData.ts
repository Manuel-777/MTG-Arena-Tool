/* eslint-disable @typescript-eslint/camelcase */
class PlayerData implements Record<string, any> {
  private static instance?: PlayerData = undefined;

  public decks_tags: Record<string, string[]> = {};
  public static_events: string[] = [];

  public last_log_timestamp = "";
  public last_log_format = "";
  public appDbPath = "";
  public playerDbPath = "";

  constructor() {
    if (PlayerData.instance) return PlayerData.instance;

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
}

const playerData = new PlayerData();

export default playerData;
