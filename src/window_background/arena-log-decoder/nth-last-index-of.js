function nthLastIndexOf(text, searchString, n) {
  if (n < 1) throw new Error("Invalid value of n");
  if (n === 1) return text.lastIndexOf(searchString);
  const i = nthLastIndexOf(text, searchString, n - 1);
  if (i === -1) return -1;
  if (i === 0) return -1;
  return text.lastIndexOf(searchString, i - 1);
}

module.exports = nthLastIndexOf;
