/* eslint-env jest */
import { starts, length } from "../jsonText";

describe("starts", () => {
  it("returns a boolean indicating if the text at the specified position in a string starts JSON", () => {
    const str = 'hello [3] world {"x": 13}';
    expect(starts(str, 0)).toEqual(false);
    expect(starts(str, 6)).toEqual(true);
    expect(starts(str, 16)).toEqual(true);
  });
});

describe("length", () => {
  it("returns the length of a JSON substring starting at the specified position in a string", () => {
    const str = 'hello [[3], {"x": 3}] world {"x": 13}';
    expect(length(str, 6)).toEqual(15);
    expect(length(str, 28)).toEqual(9);
  });

  it("handles brackets in strings correctly", () => {
    const str = JSON.stringify({ key: 'a value which contains " and { and [' });
    expect(length(str, 0)).toEqual(str.length);
  });
});
