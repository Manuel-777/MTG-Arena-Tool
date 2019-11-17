export interface Deck {
  commandZoneGRPIds: null | number[],
  mainDeck: number[],
  sideboard: number[],
  isValid: boolean,
  lockedForUse: boolean,
  lockedForEdit: boolean,
  reourceId: string,
  cardSkins: CardSkin[],
  id: string,
  name: string,
  description: string,
  format: Format,
  deckTileId: number,
  cardBack: null | string,
  lastUpdated: Date
}

export interface CardObject {
  id: number
  quantity: number,
  chance?: number,
  dfcId?: string,
  grpId?: number,
  measurable?: boolean,
}

export type v2cardsList = Array<CardObject>;

export type v3cardsList = Array<number>;

export type anyCardsList = v2cardsList | v3cardsList

interface CardSkin {
  grpId: number,
  ccv: string
}

type Format = "" | "Standard" | "Draft" | "precon" | "Brawl";