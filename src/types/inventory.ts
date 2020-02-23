export interface AetherizedCard {
  grpId: number;
  goldAwarded: number;
  gemsAwarded: number;
  set: string;
}

export interface InventoryDelta {
  gemsDelta: number;
  goldDelta: number;
  boosterDelta: { count: number }[];
  cardsAdded: number[];
  decksAdded: [];
  starterDecksAdded: [];
  vanityItemsAdded: [];
  vanityItemsRemoved: [];
  draftTokensDelta: number;
  sealedTokensDelta: number;
  vaultProgressDelta: number;
  wcCommonDelta: number;
  wcUncommonDelta: number;
  wcRareDelta: number;
  wcMythicDelta: number;
  artSkinsAdded: [];
  artSkinsRemoved: [];
  voucherItemsDelta: [];
}

interface InventoryUpdateBase {
  aetherizedCards: AetherizedCard[];
  xpGained: number;
  trackName: string;
  trackTier: number;
  trackDiff: {
    currentLevel: number;
    oldLevel: number;
  };
  orbCountDiff: {
    oldOrbCount: number;
    currentOrbCount: number;
  };
}

export interface InventoryUpdate extends InventoryUpdateBase {
  delta: InventoryDelta;
  context: {
    source: string;
    sourceId: string;
    subSource?: string;
  };
}

export interface InternalEconomyTransaction
  extends Partial<InventoryUpdateBase> {
  id: string;
  date: Date;
  context: string;
  originalContext?: string;
  subContext?: {
    source: string;
    sourceId: string;
  };
  delta?: Partial<InventoryDelta>;
  archived?: boolean;
}

export interface Pet {
  name: string;
  variants: string[];
}

export interface Avatar {
  name: string;
  mods: string[];
}

export interface CardBack {
  name: string;
  mods: string[];
}

export interface PlayerInventory {
  playerId: string;
  wcCommon: number;
  wcUncommon: number;
  wcRare: number;
  wcMythic: number;
  gold: number;
  gems: number;
  draftTokens: number;
  sealedTokens: number;
  wcTrackPosition: number;
  vaultProgress: number;
  boosters: number[];
  vanityItems: {
    pets: Pet[];
    avatars: Avatar[];
    cardBacks: CardBack[];
  };
  vanitySelections: {
    avatarSelection: string | null;
    cardBackSelection: string | null;
    petSelection: Pet | null;
  };
  vouchers: [];
  basicLandSet: string;
  starterDecks: string[];
  firstSeenDate: string;
}
