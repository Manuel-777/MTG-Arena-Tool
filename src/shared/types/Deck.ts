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

interface cardObject {
  grpId?: number,
  quantity: number,
  measurable?: boolean,
  chance?: number,
  id: number
}

export type v2cardsList = Array<cardObject>;

export type v3cardsList = Array<number>;

export type anyCardsList = v2cardsList | v3cardsList

interface CardSkin {
  grpId: number,
  ccv: string
}

type Format = "" | "Standard" | "Draft" | "precon" | "Brawl";