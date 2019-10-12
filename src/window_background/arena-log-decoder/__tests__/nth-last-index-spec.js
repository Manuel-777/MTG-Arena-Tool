/* eslint-env jest */
import nthLastIndexOf from '../nth-last-index-of';

describe("nthLastIndexOf", () => {
  it("returns the last index of a substring when n is 1", () => {
    const i = nthLastIndexOf("aaa", "a", 1);
    expect(i).toEqual(2);
  });

  it("returns the nth last index of a substring", () => {
    const i = nthLastIndexOf("aaa", "a", 2);
    expect(i).toEqual(1);

    const j = nthLastIndexOf("aaa", "a", 3);
    expect(j).toEqual(0);
  });

  it("returns -1 if the substring can not be found", () => {
    const i = nthLastIndexOf("aba", "b", 2);
    expect(i).toEqual(-1);

    const j = nthLastIndexOf("aba", "c", 1);
    expect(j).toEqual(-1);
  });

  it("throws if n is less than 1", () => {
    expect(() => nthLastIndexOf("aaa", "a", 0)).toThrow();
    expect(() => nthLastIndexOf("aaa", "a", -1)).toThrow();
  });
});
