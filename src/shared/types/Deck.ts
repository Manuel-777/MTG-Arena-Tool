// Might conflict with the class?
export interface ArenaV3Deck {
  commandZoneGRPIds: null | number[];
  mainDeck: v3cardsList;
  sideboard: v3cardsList;
  isValid: boolean;
  lockedForUse: boolean;
  lockedForEdit: boolean;
  reourceId: string;
  cardSkins: CardSkin[];
  id: string;
  name: string;
  description: string;
  format: Format;
  deckTileId: number;
  cardBack: null | string;
  lastUpdated: Date;
}

export interface SerializedDeck {
  mainDeck?: anyCardsList;
  sideboard?: anyCardsList;
  lastUpdated?: string;
  name?: string;
  deckTileId?: number;
  format?: string;
  custom?: boolean;
  tags?: string[];
  id?: string;
  commandZoneGRPIds?: number[];
  colors?: number[];
  archetype?: string;
  archived?: boolean;
}

export interface CardObject {
  id: number;
  quantity: number;
  chance?: number;
  dfcId?: string;
  grpId?: number;
  measurable?: boolean;
}

export type v2cardsList = Array<CardObject>;

export type v3cardsList = Array<number>;

export function isV2CardsList(
  list: v2cardsList | v3cardsList
): list is v2cardsList {
  const first = (list as v2cardsList)[0];
  return first && first.quantity !== undefined;
}

export type anyCardsList = v2cardsList | v3cardsList;

interface CardSkin {
  grpId: number;
  ccv: string;
}

type Format = "" | "Standard" | "Draft" | "precon" | "Brawl";
