/* eslint-env jest */

import getObjectDiff from "../getObjectsDiff";

const orig = {
  foo: "var",
  array: [1, 2, 4, 5, 8],
  nested: {
    element: true,
  },
};

const testArray = {
  foo: "var",
  array: [1, 2, 5, 5, 8],
  nested: {
    element: true,
  },
};

const testOrder = {
  foo: "var",
  array: [8, 5, 4, 2, 1],
  nested: {
    element: true,
  },
};

const testNested = {
  foo: "var",
  array: [1, 2, 4, 5, 8],
  nested: {
    element: false,
  },
};

const testMultiple = {
  array: [2, 2, 4, 5, 8],
  foo: "var!!",
  nested: {
    element: true,
    another: "im new",
    arraynested: [{ a: 1 }, { a: 2 }, { a: 3 }],
  },
};

describe("get diff", () => {
  it("exact", () => {
    expect(getObjectDiff(orig, orig)).toEqual({});
  });
  it("array", () => {
    expect(getObjectDiff(orig, testArray)).toEqual({ array: [, , 5] });
  });
  it("ordered array", () => {
    expect(getObjectDiff(orig, testOrder)).toEqual({ array: [8, 5, , 2, 1] });
  });
  it("nested element", () => {
    expect(getObjectDiff(orig, testNested)).toEqual({
      nested: { element: false },
    });
  });
  it("multiple", () => {
    expect(getObjectDiff(orig, testMultiple)).toEqual({
      foo: "var!!",
      array: [2],
      nested: {
        another: "im new",
        arraynested: [{ a: 1 }, { a: 2 }, { a: 3 }],
      },
    });
  });
});
