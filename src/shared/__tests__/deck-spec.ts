/* eslint-env jest */

import Deck from "../deck";
import { v2cardsList } from "../../types/Deck";
import db from "../database";
import { compare_cards } from "../util";

describe("deck", () => {
  describe("constructor", () => {
    it("stores original order", () => {
      const decks = [
        new Deck(
          {},
          [66091, 66089, 66091, 66091, 67224],
          [66091, 66089, 67224, 66091, 66091]
        ),
        new Deck({
          mainDeck: [
            {
              id: 66091,
              quantity: 1
            },
            {
              id: 66089,
              quantity: 1
            },
            {
              id: 66091,
              quantity: 2
            },
            {
              id: 67224,
              quantity: 1
            }
          ],
          sideboard: [
            {
              id: 66091,
              quantity: 1
            },
            {
              id: 66089,
              quantity: 1
            },
            {
              id: 67224,
              quantity: 1
            },
            {
              id: 66091,
              quantity: 2
            }
          ]
        }),
        new Deck(
          {},
          [66091, 66089, 67224, 66091, 66091],
          [66091, 66089, 66091, 66091, 67224],
          [66091, 66089, 66091, 66091, 67224],
          [66091, 66089, 67224, 66091, 66091]
        ),
        new Deck({
          mainDeck: [
            {
              id: 66091,
              quantity: 1
            },
            {
              id: 66089,
              quantity: 1
            },
            {
              id: 67224,
              quantity: 1
            },
            {
              id: 66091,
              quantity: 2
            }
          ],
          sideboard: [
            {
              id: 66091,
              quantity: 1
            },
            {
              id: 66089,
              quantity: 1
            },
            {
              id: 66091,
              quantity: 2
            },
            {
              id: 67224,
              quantity: 1
            }
          ],
          arenaMain: [
            {
              id: 66091,
              quantity: 1
            },
            {
              id: 66089,
              quantity: 1
            },
            {
              id: 66091,
              quantity: 2
            },
            {
              id: 67224,
              quantity: 1
            }
          ],
          arenaSide: [
            {
              id: 66091,
              quantity: 1
            },
            {
              id: 66089,
              quantity: 1
            },
            {
              id: 67224,
              quantity: 1
            },
            {
              id: 66091,
              quantity: 2
            }
          ]
        })
      ];
      decks.forEach(deck => {
        const saved = deck.getSave(true);
        expect(saved.arenaMain).toEqual([
          {
            id: 66091,
            quantity: 1
          },
          {
            id: 66089,
            quantity: 1
          },
          {
            id: 66091,
            quantity: 2
          },
          {
            id: 67224,
            quantity: 1
          }
        ]);
        expect(saved.arenaSide).toEqual([
          {
            id: 66091,
            quantity: 1
          },
          {
            id: 66089,
            quantity: 1
          },
          {
            id: 67224,
            quantity: 1
          },
          {
            id: 66091,
            quantity: 2
          }
        ]);
      });
    });

    describe("original order", () => {
      function savedOrder(mainboard: number[]): Readonly<v2cardsList> {
        return new Deck({}, mainboard).getSave(true).arenaMain!;
      }

      it("merges adjacent duplicates", () => {
        expect(savedOrder([66091, 66091, 66091])).toEqual([
          {
            id: 66091,
            quantity: 3
          }
        ]);
      });

      it("does not merge non-adjacent duplicates", () => {
        expect(savedOrder([66091, 66089, 66091])).toEqual([
          {
            id: 66091,
            quantity: 1
          },
          {
            id: 66089,
            quantity: 1
          },
          {
            id: 66091,
            quantity: 1
          }
        ]);
      });

      it("does not merge by name", () => {
        // 66091 = Opt (Ixalan), 67224 = Opt (Dominaria)
        expect(db.card(66091)?.name).toEqual(db.card(67224)?.name);
        expect(savedOrder([66091, 67224])).toEqual([
          {
            id: 66091,
            quantity: 1
          },
          {
            id: 67224,
            quantity: 1
          }
        ]);
      });
    });
  });

  describe("sort", () => {
    it("does not affect original order", () => {
      // Any meaningful sort order will take the non-adjacent duplicates and put
      // them together, guaranteeing a change.
      const deck = new Deck({}, [66091, 66089, 66091], [66089, 66091, 66089]);
      deck.sortMainboard(compare_cards);
      deck.sortSideboard(compare_cards);
      const saved = deck.getSave(true);
      expect(saved.arenaMain).toEqual([
        {
          id: 66091,
          quantity: 1
        },
        {
          id: 66089,
          quantity: 1
        },
        {
          id: 66091,
          quantity: 1
        }
      ]);
      expect(saved.arenaSide).toEqual([
        {
          id: 66089,
          quantity: 1
        },
        {
          id: 66091,
          quantity: 1
        },
        {
          id: 66089,
          quantity: 1
        }
      ]);
    });
  });

  describe("clone", () => {
    it("preserves original logged order", () => {
      const deck = new Deck(
        {},
        [66091, 66089, 67224, 66091, 66091],
        [66091, 66089, 66091, 66091, 67224],
        [66091, 66089, 66091, 66091, 67224],
        [66091, 66089, 67224, 66091, 66091]
      );
      deck.sortMainboard(compare_cards);
      deck.sortSideboard(compare_cards);
      const saved = deck.clone().getSave(true);
      expect(saved.arenaMain).toEqual([
        {
          id: 66091,
          quantity: 1
        },
        {
          id: 66089,
          quantity: 1
        },
        {
          id: 66091,
          quantity: 2
        },
        {
          id: 67224,
          quantity: 1
        }
      ]);
      expect(saved.arenaSide).toEqual([
        {
          id: 66091,
          quantity: 1
        },
        {
          id: 66089,
          quantity: 1
        },
        {
          id: 67224,
          quantity: 1
        },
        {
          id: 66091,
          quantity: 2
        }
      ]);
    });
  });

  describe("getSave", () => {
    it("includes logged order when requested", () => {
      const deck = new Deck(
        {},
        [66091, 66089, 66091, 66091, 67224],
        [66091, 66089, 67224, 66091, 66091]
      );
      const save = deck.getSave(true);
      expect(save).toHaveProperty("arenaMain", [
        {
          id: 66091,
          quantity: 1
        },
        {
          id: 66089,
          quantity: 1
        },
        {
          id: 66091,
          quantity: 2
        },
        {
          id: 67224,
          quantity: 1
        }
      ]);
      expect(save).toHaveProperty("arenaSide", [
        {
          id: 66091,
          quantity: 1
        },
        {
          id: 66089,
          quantity: 1
        },
        {
          id: 67224,
          quantity: 1
        },
        {
          id: 66091,
          quantity: 2
        }
      ]);
    });

    it("omits logged order when not requested", () => {
      const deck = new Deck(
        {},
        [66091, 66089, 66091, 66091, 67224],
        [66091, 66089, 67224, 66091, 66091]
      );
      const save = deck.getSave();
      expect(save).not.toHaveProperty("arenaMain");
      expect(save).not.toHaveProperty("arenaSide");
    });

    it("returns a copy", () => {
      const deck = new Deck({}, [66091]);
      deck.getSave(true).arenaMain![0].quantity++;
      expect(deck.getSave(true).arenaMain).toEqual([
        { id: 66091, quantity: 1 }
      ]);
    });
  });
});
