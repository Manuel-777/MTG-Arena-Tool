/* eslint-env jest */

import CardsList from "../cardsList";

import db from "../database";

describe("cards-list", () => {
  describe("constructor", () => {
    it("merges adjacent duplicates", () => {
      expect(new CardsList([66091, 66091, 66091]).get()).toEqual([
        {
          quantity: 3,
          id: 66091,
          measurable: true,
          chance: 0
        }
      ]);
    });

    it("does not merge non-adjacent duplicates", () => {
      expect(new CardsList([66091, 66089, 66091]).get()).toEqual([
        {
          quantity: 1,
          id: 66091,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 66089,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 66091,
          measurable: true,
          chance: 0
        }
      ]);
    });

    it("does not merge by name", () => {
      // 66091 = Opt (Ixalan), 67224 = Opt (Dominaria)
      expect(db.card(66091).name).toEqual(db.card(67224).name);
      expect(new CardsList([66091, 67224]).get()).toEqual([
        {
          quantity: 1,
          id: 66091,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 67224,
          measurable: true,
          chance: 0
        }
      ]);
    });
  });

  describe("add", () => {
    it("merges adjacent duplicates by default", () => {
      let list = new CardsList();
      list.add(66091);
      list.add(66091, 2);
      expect(list.get()).toEqual([
        {
          quantity: 3,
          id: 66091,
          measurable: true,
          chance: 0
        }
      ]);
    });

    it("does not merge non-adjacent duplicates by default", () => {
      let list = new CardsList();
      list.add(66091);
      list.add(66089);
      list.add(66091);
      expect(list.get()).toEqual([
        {
          quantity: 1,
          id: 66091,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 66089,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 66091,
          measurable: true,
          chance: 0
        }
      ]);
    });

    it("merges non-adjacent duplicates when requested", () => {
      let list = new CardsList();
      list.add(66091, 1, true);
      list.add(66089, 1, true);
      list.add(66091, 2, true);
      expect(list.get()).toEqual([
        {
          quantity: 3,
          id: 66091,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 66089,
          measurable: true,
          chance: 0
        }
      ]);
    });

    it("does not merge by name", () => {
      // 66091 = Opt (Ixalan), 67224 = Opt (Dominaria)
      expect(db.card(66091).name).toEqual(db.card(67224).name);
      let list = new CardsList();
      list.add(66091, 1, true);
      list.add(67224, 2, true);
      expect(list.get()).toEqual([
        {
          quantity: 1,
          id: 66091,
          measurable: true,
          chance: 0
        },
        {
          quantity: 2,
          id: 67224,
          measurable: true,
          chance: 0
        }
      ]);
    });

    it("merges only into one group", () => {
      let list = new CardsList();
      list.add(66091);
      list.add(66089);
      list.add(66091);
      list.add(66091, 1, true);
      expect(list.get()).toEqual([
        {
          quantity: 2,
          id: 66091,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 66089,
          measurable: true,
          chance: 0
        },
        {
          quantity: 1,
          id: 66091,
          measurable: true,
          chance: 0
        }
      ]);
    });
  });
});
