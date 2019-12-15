import { CARD_RARITIES } from "../constants";

export interface Metadata {
  cards: { [id: number]: DbCardData };
  ok: boolean;
  version: number;
  language: string;
  updated: number;
  events: { [id: string]: string };
  events_format: { [id: string]: string };
  sets: { [id: string]: CardSet };
  abilities: { [id: number]: string };
  limited_ranked_events: string[];
  standard_ranked_events: string[];
  single_match_events: string[];
  archetypes: { [id: number]: Archetype };
}

export interface DbCardData {
  id: number;
  name: string;
  set: string;
  artid: number;
  type: string;
  cost: string[];
  cmc: number;
  rarity: Rarity;
  cid: string;
  frame: number[];
  artist: string;
  dfc: number;
  collectible: boolean;
  craftable: boolean;
  booster: boolean;
  dfcId: number | false;
  rank: number;
  rank_values: number[];
  rank_controversy: string;
  images: ImageLinks;
  reprints: boolean | number[];
}

export type Rarity = typeof CARD_RARITIES[number];

interface ImageLinks {
  small: string;
  normal: string;
  large: string;
  art_crop: string;
}

export interface CardSet {
  collation: number,
  scryfall: string,
  code: string,
  arenacode: string,
  tile: number,
  release: string,
  svg: string
}

export interface Archetype {
  average: ArchetypeAverage;
  name: string;
  format: string;
}

interface ArchetypeAverage {
  mainDeck: { [id: string]: number };
  sideboard: { [id: string]: string };
}

export interface RewardsDate {
  daily: string;
  weekly: string;
}
