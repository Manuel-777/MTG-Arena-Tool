import { DEFAULT_TILE } from "../shared/constants";
import Deck from "../shared/deck";
import { objectClone } from "../shared/util";

// Deck Creation
// This isn't typed yet because it's slightly more complicated.
const deckDefault = {
  deckTileId: DEFAULT_TILE,
  description: "",
  format: "Standard",
  colors: [],
  id: "00000000-0000-0000-0000-000000000000",
  lastUpdated: "2018-05-31T00:06:29.7456958",
  mainDeck: [],
  name: "Undefined",
  sideboard: []
};

export function createDeck(): Deck {
  return objectClone(deckDefault);
}
