/* eslint-env jest */

import { getSideboardChanges } from "../labels";
import Deck from "../../shared/deck";

describe("labels", () => {
  describe("sideboardChanges", () => {
    it("counts duplicate groups", () => {
      let original = new Deck({}, [1, 2, 1], [2, 1, 2]);
      let current = new Deck({}, [2, 2, 2], [1, 1, 1]);
      expect(getSideboardChanges(current, original, [])).toEqual({
        added: ["2", "2"],
        removed: ["1", "1"]
      });
    });

    it("counts only changes since last game", () => {
      let original = new Deck({}, [1, 1, 2, 2, 3, 3], [1, 1, 2, 2, 3, 3]);
      let mid = new Deck({}, [1, 1, 1, 1, 3, 3, 3], [2, 2, 2, 2, 3]);
      let firstChanges = getSideboardChanges(mid, original, []);
      expect(firstChanges).toEqual({
        added: ["1", "1", "3"],
        removed: ["2", "2"]
      });

      let current = new Deck({}, [1, 1, 1, 2, 3, 3, 3, 3], [1, 2, 2, 2]);
      expect(
        getSideboardChanges(current, original, [
          {},
          { sideboardChanges: firstChanges }
        ])
      ).toEqual({
        added: ["2", "3"],
        removed: ["1"]
      });
    });
  });
});
