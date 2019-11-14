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
  
  interface CardSkin {
    grpId: number,
    ccv: string
  }
  
  type Format = "" | "Standard" | "Draft" | "precon" | "Brawl";