/* eslint-env jest */

import getNewBounds from "../getNewBounds";
import getPrimaryPos from "../getPrimaryPos";

describe("bounds", () => {
  it("checks we calculate overlay bounds correctly", () => {
    const bounds = getNewBounds();
    expect(bounds).toStrictEqual({
      x: -1920,
      y: 0,
      width: 3840,
      height: 1080,
    });
    expect(getPrimaryPos(bounds)).toStrictEqual({
      x: 1920,
      y: 0,
    });
  });
});
